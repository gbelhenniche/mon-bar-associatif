import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { MessageCircleQuestion } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Markdown from 'react-markdown';

type Rubrique = { key: string; label: string; texte: string };

export default function AdminAide({ rubriques }: { rubriques: Rubrique[] }) {
    const [textes, setTextes] = useState<Record<string, string>>(
        Object.fromEntries(rubriques.map(r => [r.key, r.texte ?? '']))
    );
    const [preview, setPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    function handleSave() {
        setSaving(true);
        router.put('/admin/aide', { rubriques: textes }, {
            onSuccess: () => toast.success('Aide enregistrée.'),
            onError: () => toast.error('Erreur lors de la sauvegarde.'),
            onFinish: () => setSaving(false),
        });
    }

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold">Aide en ligne</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Rédigez un texte d'aide (markdown) pour chaque rubrique du menu.
                    Un bouton d'aide apparaîtra dans la barre de navigation.
                </p>
            </div>

            <div className="space-y-4">
                {rubriques.map(rubrique => (
                    <div key={rubrique.key} className="rounded-xl border border-border/60 bg-card p-4 space-y-2 shadow-soft">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{rubrique.label}</span>
                            {textes[rubrique.key] && (
                                <button
                                    type="button"
                                    title="Aperçu"
                                    onClick={() => setPreview(textes[rubrique.key])}
                                    className="text-muted-foreground hover:text-primary transition-colors p-1 rounded"
                                >
                                    <MessageCircleQuestion className="size-4" />
                                </button>
                            )}
                        </div>
                        <Textarea
                            value={textes[rubrique.key] ?? ''}
                            onChange={e => setTextes(prev => ({ ...prev, [rubrique.key]: e.target.value }))}
                            placeholder="Aucune aide configurée…"
                            rows={3}
                            className="text-sm resize-y"
                        />
                        <p className="text-xs text-muted-foreground">Markdown pris en charge : **gras**, *italique*, listes…</p>
                    </div>
                ))}
            </div>

            <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer tout'}
            </Button>

            <Dialog open={preview !== null} onOpenChange={open => { if (!open) setPreview(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Aperçu de l'aide</DialogTitle>
                    </DialogHeader>
                    <div className="markdown-content text-sm">
                        <Markdown>{preview ?? ''}</Markdown>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

AdminAide.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
