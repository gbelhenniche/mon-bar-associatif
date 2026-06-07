import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Megaphone, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type MessageImportant = {
    id: number;
    contenu: string;
    actif: boolean;
    date_fin: string | null;
    created_at: string;
};

type Props = { actifs: MessageImportant[]; archives: MessageImportant[] };
type FormState = { id?: number; contenu: string; date_fin: string };
type ReactiverState = { id: number; date_fin: string } | null;

function nextSundayDate() {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? 7 : 7 - day));
    return d.toISOString().split('T')[0];
}

function formatDate(d: string | null) {
    if (!d) return 'Sans limite';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

export default function MessageImportant({ actifs, archives }: Props) {
    const defaultDateFin = useMemo(() => nextSundayDate(), []);

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<FormState>({ contenu: '', date_fin: defaultDateFin });
    const [reactiverForm, setReactiverForm] = useState<ReactiverState>(null);

    const emptyForm = () => setForm({ contenu: '', date_fin: defaultDateFin });
    const closeDialog = () => { setOpen(false); emptyForm(); };

    const save = () => {
        if (!form.contenu.trim()) return toast.error('Le message est obligatoire.');

        const payload = { contenu: form.contenu, date_fin: form.date_fin || null };

        if (form.id) {
            router.put(`/admin/messages-importants/${form.id}`, payload, {
                onSuccess: () => { toast.success('Message mis à jour.'); closeDialog(); },
                onError: () => toast.error('Erreur lors de la sauvegarde.'),
            });
        } else {
            router.post('/admin/messages-importants', payload, {
                onSuccess: () => { toast.success('Message publié.'); closeDialog(); },
                onError: () => toast.error('Erreur lors de la sauvegarde.'),
            });
        }
    };

    const startEdit = (m: MessageImportant) => {
        setForm({ id: m.id, contenu: m.contenu, date_fin: m.date_fin ?? '' });
        setOpen(true);
    };

    const handleDelete = (m: MessageImportant) => {
        if (!confirm('Supprimer ce message ?')) return;
        router.delete(`/admin/messages-importants/${m.id}`, {
            onSuccess: () => toast.success('Message supprimé.'),
            onError: () => toast.error('Erreur lors de la suppression.'),
        });
    };

    const handleReactiver = () => {
        if (!reactiverForm) return;
        if (!reactiverForm.date_fin) return toast.error('Veuillez choisir une date de fin.');
        router.post(`/admin/messages-importants/${reactiverForm.id}/reactiver`, { date_fin: reactiverForm.date_fin }, {
            onSuccess: () => { toast.success('Message réactivé.'); setReactiverForm(null); },
            onError: () => toast.error('Erreur lors de la réactivation.'),
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl md:text-3xl font-semibold">Message important</h1>
                    <p className="text-sm text-muted-foreground mt-1">Affiché en tête du tableau de bord jusqu'à sa date de fin.</p>
                </div>
                <Dialog open={open} onOpenChange={o => { if (!o) closeDialog(); else setOpen(true); }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setOpen(true)}><Plus className="size-4 mr-1.5" /> Nouveau message</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{form.id ? 'Modifier le message' : 'Nouveau message important'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <Field label="Message *">
                                <Textarea
                                    value={form.contenu}
                                    onChange={e => setForm({ ...form, contenu: e.target.value })}
                                    placeholder="Fermeture exceptionnelle le…"
                                    rows={4}
                                    maxLength={1000}
                                />
                            </Field>
                            <Field label="Afficher jusqu'au (vide = indéfiniment)">
                                <Input
                                    type="date"
                                    value={form.date_fin}
                                    onChange={e => setForm({ ...form, date_fin: e.target.value })}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                                <p className="text-xs text-muted-foreground">Suggestion : dimanche suivant ({defaultDateFin})</p>
                            </Field>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={closeDialog}>Annuler</Button>
                            <Button onClick={save}>Publier</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Messages actifs */}
            <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    En cours ({actifs.length})
                </h2>
                {actifs.length === 0 ? (
                    <Card className="p-5 shadow-soft">
                        <p className="text-sm text-muted-foreground text-center py-4">
                            <Megaphone className="size-8 mx-auto mb-2 opacity-30" />
                            Aucun message actif en ce moment.
                        </p>
                    </Card>
                ) : (
                    <Card className="shadow-soft overflow-hidden">
                        <ul className="divide-y divide-border">
                            {actifs.map(m => (
                                <li key={m.id} className="flex items-start gap-3 px-4 py-4">
                                    <Megaphone className="size-4 text-destructive mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm">{m.contenu}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Fin : {formatDate(m.date_fin)}
                                        </p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <Button size="icon" variant="ghost" title="Modifier" onClick={() => startEdit(m)}>
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" title="Supprimer" onClick={() => handleDelete(m)}>
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
            </div>

            {/* Archives */}
            {archives.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        Historique ({archives.length})
                    </h2>
                    <Card className="shadow-soft overflow-hidden">
                        <ul className="divide-y divide-border">
                            {archives.map(m => (
                                <li key={m.id} className="flex items-start gap-3 px-4 py-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-muted-foreground line-clamp-2">{m.contenu}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {m.date_fin && (
                                                <Badge variant="outline" className="text-xs">
                                                    Expiré le {formatDate(m.date_fin)}
                                                </Badge>
                                            )}
                                            {!m.actif && <Badge variant="outline" className="text-xs">Désactivé</Badge>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            title="Réactiver"
                                            onClick={() => setReactiverForm({ id: m.id, date_fin: defaultDateFin })}
                                        >
                                            <RotateCcw className="size-4 text-primary" />
                                        </Button>
                                        <Button size="icon" variant="ghost" title="Supprimer" onClick={() => handleDelete(m)}>
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            )}

            {/* Dialog réactivation */}
            <Dialog open={!!reactiverForm} onOpenChange={o => { if (!o) setReactiverForm(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Réactiver le message</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Field label="Afficher jusqu'au *">
                            <Input
                                type="date"
                                value={reactiverForm?.date_fin ?? defaultDateFin}
                                onChange={e => setReactiverForm(r => r ? { ...r, date_fin: e.target.value } : r)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </Field>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReactiverForm(null)}>Annuler</Button>
                        <Button onClick={handleReactiver}>Réactiver</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

MessageImportant.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
