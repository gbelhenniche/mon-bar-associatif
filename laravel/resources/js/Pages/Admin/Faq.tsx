import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, MessageCircleQuestion } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import Markdown from 'react-markdown';

type Visibilite = 'tous' | 'admins' | 'invisible';

type FaqQuestion = {
    id: number;
    titre: string;
    contenu: string;
    tags: string | null;
    visibilite: Visibilite;
    created_at: string;
};

type FormState = {
    id?: number;
    titre: string;
    contenu: string;
    tags: string;
    visibilite: Visibilite;
};

const VISIBILITE_LABELS: Record<Visibilite, string> = {
    tous: 'Tous',
    admins: 'Admins seulement',
    invisible: 'Invisible',
};

const VISIBILITE_VARIANTS: Record<Visibilite, 'default' | 'secondary' | 'outline'> = {
    tous: 'default',
    admins: 'secondary',
    invisible: 'outline',
};

const emptyForm = (): FormState => ({ titre: '', contenu: '', tags: '', visibilite: 'tous' });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

export default function AdminFaq({ questions }: { questions: FaqQuestion[] }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [showPreview, setShowPreview] = useState(false);

    const closeDialog = () => { setOpen(false); setForm(emptyForm()); setShowPreview(false); };

    const save = () => {
        if (!form.titre.trim()) return toast.error('Le titre est obligatoire.');
        if (!form.contenu.trim()) return toast.error('Le contenu est obligatoire.');

        const payload = {
            titre: form.titre,
            contenu: form.contenu,
            tags: form.tags || null,
            visibilite: form.visibilite,
        };

        if (form.id) {
            router.put(`/admin/faq/${form.id}`, payload, {
                onSuccess: () => { toast.success('Question mise à jour.'); closeDialog(); },
                onError: () => toast.error('Erreur lors de la sauvegarde.'),
            });
        } else {
            router.post('/admin/faq', payload, {
                onSuccess: () => { toast.success('Question ajoutée.'); closeDialog(); },
                onError: () => toast.error('Erreur lors de la sauvegarde.'),
            });
        }
    };

    const startEdit = (q: FaqQuestion) => {
        setForm({ id: q.id, titre: q.titre, contenu: q.contenu, tags: q.tags ?? '', visibilite: q.visibilite });
        setOpen(true);
    };

    const handleDelete = (q: FaqQuestion) => {
        if (!confirm(`Supprimer « ${q.titre} » ?`)) return;
        router.delete(`/admin/faq/${q.id}`, {
            onSuccess: () => toast.success('Question supprimée.'),
            onError: () => toast.error('Erreur lors de la suppression.'),
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl md:text-3xl font-semibold">FAQ</h1>
                    <p className="text-sm text-muted-foreground mt-1">{questions.length} question(s)</p>
                </div>
                <Button onClick={() => { setForm(emptyForm()); setOpen(true); }}>
                    <Plus className="size-4 mr-1.5" /> Nouvelle question
                </Button>
            </div>

            <Dialog open={open} onOpenChange={o => { if (!o) closeDialog(); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{form.id ? 'Modifier la question' : 'Nouvelle question'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Field label="Titre *">
                            <Input
                                value={form.titre}
                                onChange={e => setForm({ ...form, titre: e.target.value })}
                                placeholder="Comment fonctionne la caisse ?"
                                maxLength={255}
                            />
                        </Field>
                        <Field label="Contenu * (markdown)">
                            <div className="flex gap-2 mb-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(false)}
                                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                                        !showPreview
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'border-border text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Édition
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPreview(true)}
                                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                                        showPreview
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'border-border text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Aperçu
                                </button>
                            </div>
                            {showPreview ? (
                                <div className="min-h-[120px] rounded-md border border-input bg-background p-3 markdown-content text-sm">
                                    <Markdown>{form.contenu || '*Aucun contenu*'}</Markdown>
                                </div>
                            ) : (
                                <Textarea
                                    value={form.contenu}
                                    onChange={e => setForm({ ...form, contenu: e.target.value })}
                                    placeholder="Expliquez ici en détail…"
                                    rows={6}
                                    className="text-sm resize-y"
                                />
                            )}
                        </Field>
                        <Field label="Tags (séparés par des virgules)">
                            <Input
                                value={form.tags}
                                onChange={e => setForm({ ...form, tags: e.target.value })}
                                placeholder="caisse, paiement, session"
                            />
                        </Field>
                        <Field label="Visibilité">
                            <Select
                                value={form.visibilite}
                                onValueChange={v => setForm({ ...form, visibilite: v as Visibilite })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tous">Tous les utilisateurs</SelectItem>
                                    <SelectItem value="admins">Admins seulement</SelectItem>
                                    <SelectItem value="invisible">Invisible</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDialog}>Annuler</Button>
                        <Button onClick={save}>Enregistrer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="space-y-3">
                {questions.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <MessageCircleQuestion className="size-10 mx-auto mb-2 opacity-40" />
                        <p>Aucune question. Ajoutez-en une !</p>
                    </div>
                )}
                {questions.map(q => (
                    <div key={q.id} className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card shadow-soft">
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{q.titre}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <Badge variant={VISIBILITE_VARIANTS[q.visibilite]} className="text-xs">
                                    {VISIBILITE_LABELS[q.visibilite]}
                                </Badge>
                                {q.tags && q.tags.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
                                    <span key={tag} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                            <Button size="icon" variant="ghost" title="Modifier" onClick={() => startEdit(q)}>
                                <Pencil className="size-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Supprimer" onClick={() => handleDelete(q)}>
                                <Trash2 className="size-4 text-destructive" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

AdminFaq.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
