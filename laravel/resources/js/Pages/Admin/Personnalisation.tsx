import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Check } from 'lucide-react';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { THEMES, THEME_KEYS, applyTheme, type ThemeKey } from '@/lib/themes';

type Props = { parametres: Record<string, string> };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs">{label}</Label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
    return (
        <div className="pb-3 border-b border-border">
            <h2 className="font-display font-semibold text-sm">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
    );
}

function ThemeSwatch({ themeKey, selected, onClick }: {
    themeKey: ThemeKey;
    selected: boolean;
    onClick: () => void;
}) {
    const theme = THEMES[themeKey];
    return (
        <button
            onClick={onClick}
            className={`group relative w-full rounded-lg overflow-hidden transition-all outline-none
                ${selected
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'ring-1 ring-border hover:ring-primary/50'
                }`}
        >
            <div className="h-10 flex">
                <div className="w-8 shrink-0" style={{ backgroundColor: theme.sidebar }} />
                <div
                    className="flex-1 flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: THEMES[themeKey].vars['--background'] }}
                >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                    <div className="w-2 h-2 rounded-full opacity-50" style={{ backgroundColor: theme.primary }} />
                </div>
            </div>
            <div
                className="text-center py-1.5 text-xs font-medium truncate px-1"
                style={{ backgroundColor: THEMES[themeKey].vars['--background'], color: THEMES[themeKey].vars['--foreground'] }}
            >
                {theme.label}
            </div>
            {selected && (
                <div
                    className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: theme.primary }}
                >
                    <Check className="w-2.5 h-2.5" style={{ color: THEMES[themeKey].vars['--primary-foreground'] }} />
                </div>
            )}
        </button>
    );
}

export default function Personnalisation({ parametres }: Props) {
    const [nomBar,         setNomBar]         = useState(parametres.nom_bar            ?? 'Mon Bar Associatif');
    const [titrePage,      setTitrePage]      = useState(parametres.titre_page         ?? '');
    const [emailContact,   setEmailContact]   = useState(parametres.email_contact      ?? '');
    const [seuilRouge,     setSeuilRouge]     = useState(parametres.marge_seuil_rouge  ?? '15');
    const [seuilOrange,    setSeuilOrange]    = useState(parametres.marge_seuil_orange ?? '30');
    const [seuilVert,      setSeuilVert]      = useState(parametres.marge_seuil_vert   ?? '50');
    const [reinitQuestion, setReinitQuestion] = useState(parametres.reinit_question    ?? '');
    const [reinitReponse,  setReinitReponse]  = useState('');
    const [couleurTheme,   setCouleurTheme]   = useState<ThemeKey>(
        (parametres.couleur_theme as ThemeKey) ?? 'rusty-nail'
    );
    const [saving, setSaving] = useState(false);

    const handleThemeSelect = (key: ThemeKey) => {
        setCouleurTheme(key);
        applyTheme(key);
    };

    const save = () => {
        if (!nomBar.trim()) return toast.error('Le nom du bar ne peut pas être vide.');
        if (!reinitQuestion.trim()) return toast.error('La question de sécurité ne peut pas être vide.');

        const payload: Record<string, string | number> = {
            nom_bar:            nomBar.trim(),
            titre_page:         titrePage.trim() || nomBar.trim(),
            email_contact:      emailContact.trim(),
            marge_seuil_rouge:  seuilRouge,
            marge_seuil_orange: seuilOrange,
            marge_seuil_vert:   seuilVert,
            reinit_question:    reinitQuestion.trim(),
            couleur_theme:      couleurTheme,
        };
        if (reinitReponse.trim()) {
            payload.reinit_reponse = reinitReponse.trim();
        }

        setSaving(true);
        router.put('/admin/personnalisation', payload, {
            onSuccess: () => {
                toast.success('Paramètres enregistrés.');
                setReinitReponse('');
            },
            onError: () => toast.error('Erreur lors de l\'enregistrement.'),
            onFinish: () => setSaving(false),
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-xl mx-auto space-y-6">
            <div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold">Personnalisation</h1>
                <p className="text-sm text-muted-foreground mt-1">Paramètres d'affichage de l'application.</p>
            </div>

            {/* Identité */}
            <Card className="p-6 shadow-soft space-y-5">
                <SectionTitle title="Identité" />
                <Field label="Nom du bar" hint="Affiché dans la barre de navigation latérale.">
                    <Input
                        value={nomBar}
                        onChange={e => setNomBar(e.target.value)}
                        placeholder="Mon Bar Associatif"
                        maxLength={100}
                    />
                </Field>
                <Field
                    label="Titre de l'onglet navigateur"
                    hint="Si vide, reprend le nom du bar."
                >
                    <Input
                        value={titrePage}
                        onChange={e => setTitrePage(e.target.value)}
                        placeholder={nomBar || 'Mon Bar Associatif'}
                        maxLength={100}
                    />
                </Field>
                <Field
                    label="Adresse e-mail de contact"
                    hint="Destinataire des alertes envoyées par l'application (écarts de caisse, messages de fermeture…)."
                >
                    <Input
                        type="email"
                        value={emailContact}
                        onChange={e => setEmailContact(e.target.value)}
                        placeholder="contact@votre-association.fr"
                        maxLength={150}
                    />
                </Field>
            </Card>

            {/* Couleur dominante */}
            <Card className="p-6 shadow-soft space-y-5">
                <SectionTitle
                    title="Couleur dominante"
                    description="Choisissez la teinte de l'interface. La palette complète (fond, sidebar, boutons, bordures) est dérivée automatiquement."
                />
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {THEME_KEYS.map(key => (
                        <ThemeSwatch
                            key={key}
                            themeKey={key}
                            selected={couleurTheme === key}
                            onClick={() => handleThemeSelect(key)}
                        />
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">
                    L'aperçu est immédiat — l'application de l'onglet reflète déjà la couleur choisie.
                </p>
            </Card>

            {/* Seuils de marges */}
            <Card className="p-6 shadow-soft space-y-5">
                <SectionTitle
                    title="Seuils d'alerte des marges"
                    description="Pourcentages utilisés pour coloriser les indicateurs de marge dans l'application."
                />
                <div className="grid grid-cols-3 gap-4">
                    <Field label="🔴 Seuil rouge (< X %)">
                        <Input
                            type="number"
                            min={0} max={100}
                            value={seuilRouge}
                            onChange={e => setSeuilRouge(e.target.value)}
                            placeholder="15"
                        />
                    </Field>
                    <Field label="🟠 Seuil orange (< X %)">
                        <Input
                            type="number"
                            min={0} max={100}
                            value={seuilOrange}
                            onChange={e => setSeuilOrange(e.target.value)}
                            placeholder="30"
                        />
                    </Field>
                    <Field label="🟢 Seuil vert (≥ X %)">
                        <Input
                            type="number"
                            min={0} max={100}
                            value={seuilVert}
                            onChange={e => setSeuilVert(e.target.value)}
                            placeholder="50"
                        />
                    </Field>
                </div>
                <p className="text-xs text-muted-foreground">
                    Exemple avec les valeurs par défaut : marge &lt; 15 % → rouge, entre 15 % et 30 % → orange, entre 30 % et 50 % → jaune, ≥ 50 % → vert.
                </p>
            </Card>

            {/* Sécurité — Réinitialisation */}
            <Card className="p-6 shadow-soft space-y-5">
                <SectionTitle
                    title="Sécurité — Réinitialisation"
                    description="Question posée à l'utilisateur avant tout effacement de données."
                />
                <Field label="Question de sécurité">
                    <Input
                        value={reinitQuestion}
                        onChange={e => setReinitQuestion(e.target.value)}
                        placeholder="Ex : Quel est le nom de votre rue ?"
                        maxLength={200}
                    />
                </Field>
                <Field
                    label="Nouvelle réponse attendue"
                    hint="Laissez vide pour conserver la réponse actuelle. La casse et les accents sont ignorés."
                >
                    <Input
                        type="password"
                        value={reinitReponse}
                        onChange={e => setReinitReponse(e.target.value)}
                        placeholder="Nouvelle réponse…"
                        maxLength={100}
                        autoComplete="new-password"
                    />
                </Field>
            </Card>

            <div className="flex justify-end">
                <Button onClick={save} disabled={saving}>
                    <Save className="size-4 mr-1.5" />
                    Enregistrer
                </Button>
            </div>
        </div>
    );
}

Personnalisation.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
