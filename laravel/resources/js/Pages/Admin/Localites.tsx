import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type Localite = { id: number; nom: string; ordre: number };
type Props = { localites: Localite[] };
type FormState = { id?: number; nom: string; ordre: string };

const emptyForm = (): FormState => ({ nom: '', ordre: '0' });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

export default function Localites({ localites }: Props) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());

    const closeDialog = () => { setOpen(false); setForm(emptyForm()); };

    const save = () => {
        if (!form.nom.trim()) return toast.error('Le nom est obligatoire.');

        const payload = { nom: form.nom.trim(), ordre: parseInt(form.ordre) || 0 };

        if (form.id) {
            router.put(`/admin/localites/${form.id}`, payload, {
                onSuccess: () => { toast.success('Localité mise à jour.'); closeDialog(); },
                onError: (errors) => toast.error(Object.values(errors)[0] as string || 'Erreur lors de la sauvegarde.'),
            });
        } else {
            router.post('/admin/localites', payload, {
                onSuccess: () => { toast.success('Localité ajoutée.'); closeDialog(); },
                onError: (errors) => toast.error(Object.values(errors)[0] as string || 'Erreur lors de la sauvegarde.'),
            });
        }
    };

    const startEdit = (l: Localite) => {
        setForm({ id: l.id, nom: l.nom, ordre: String(l.ordre) });
        setOpen(true);
    };

    const handleDelete = (l: Localite) => {
        if (!confirm(`Supprimer « ${l.nom} » ?`)) return;
        router.delete(`/admin/localites/${l.id}`, {
            onSuccess: () => toast.success('Localité supprimée.'),
            onError: () => toast.error('Erreur lors de la suppression.'),
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
            <div>
                <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
                    <ArrowLeft className="size-4" />
                    Administration
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-2xl md:text-3xl font-semibold">Villes des adhérents</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {localites.length} localité{localites.length !== 1 ? 's' : ''} — proposées dans le formulaire d'adhérent.
                        </p>
                    </div>
                    <Dialog open={open} onOpenChange={o => { if (!o) closeDialog(); else setOpen(true); }}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setOpen(true)}><Plus className="size-4 mr-1.5" /> Ajouter</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{form.id ? 'Modifier la localité' : 'Nouvelle localité'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <Field label="Nom *">
                                    <Input
                                        value={form.nom}
                                        onChange={e => setForm({ ...form, nom: e.target.value })}
                                        placeholder="ex. Bordeaux"
                                        maxLength={100}
                                        autoFocus
                                    />
                                </Field>
                                <Field label="Ordre d'affichage">
                                    <Input
                                        type="number"
                                        min={0}
                                        value={form.ordre}
                                        onChange={e => setForm({ ...form, ordre: e.target.value })}
                                        placeholder="0"
                                        className="w-28"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Les valeurs basses apparaissent en premier. À égalité, tri alphabétique.
                                    </p>
                                </Field>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={closeDialog}>Annuler</Button>
                                <Button onClick={save}>Enregistrer</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="shadow-soft overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Ville</th>
                            <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Ordre</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {localites.length === 0 && (
                            <tr>
                                <td colSpan={3} className="text-center py-12 text-muted-foreground">
                                    <MapPin className="size-10 mx-auto mb-2 opacity-40" />
                                    Aucune localité. Ajoutez-en une !
                                </td>
                            </tr>
                        )}
                        {localites.map(l => (
                            <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                                <td className="px-4 py-3 font-medium">{l.nom}</td>
                                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{l.ordre}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button size="icon" variant="ghost" title="Modifier" onClick={() => startEdit(l)}>
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" title="Supprimer" onClick={() => handleDelete(l)}>
                                            <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}

Localites.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
