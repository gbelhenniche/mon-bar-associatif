import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type Frequence = 'normal' | 'peu_frequent' | 'tres_frequent';

type SavistuMessage = {
    id: number;
    contenu: string;
    frequence: Frequence;
    actif: boolean;
    created_at: string;
};

type Props = { messages: SavistuMessage[] };
type FormState = { id?: number; contenu: string; frequence: Frequence; actif: boolean };

const FREQ_LABELS: Record<Frequence, string> = {
    normal: 'Normal',
    peu_frequent: 'Peu fréquent',
    tres_frequent: 'Très fréquent',
};

const FREQ_VARIANTS: Record<Frequence, 'secondary' | 'outline' | 'default'> = {
    normal: 'secondary',
    peu_frequent: 'outline',
    tres_frequent: 'default',
};

const emptyForm = (): FormState => ({ contenu: '', frequence: 'normal', actif: true });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

export default function Savistu({ messages }: Props) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());

    const closeDialog = () => { setOpen(false); setForm(emptyForm()); };

    const save = () => {
        if (!form.contenu.trim()) return toast.error('Le texte est obligatoire.');

        const payload = { contenu: form.contenu, frequence: form.frequence, actif: form.actif };

        if (form.id) {
            router.put(`/admin/savistu/${form.id}`, payload, {
                onSuccess: () => { toast.success('Message mis à jour.'); closeDialog(); },
                onError: () => toast.error('Erreur lors de la sauvegarde.'),
            });
        } else {
            router.post('/admin/savistu', payload, {
                onSuccess: () => { toast.success('Message ajouté.'); closeDialog(); },
                onError: () => toast.error('Erreur lors de la sauvegarde.'),
            });
        }
    };

    const startEdit = (m: SavistuMessage) => {
        setForm({ id: m.id, contenu: m.contenu, frequence: m.frequence, actif: m.actif });
        setOpen(true);
    };

    const handleDelete = (m: SavistuMessage) => {
        if (!confirm(`Supprimer ce message ?`)) return;
        router.delete(`/admin/savistu/${m.id}`, {
            onSuccess: () => toast.success('Message supprimé.'),
            onError: () => toast.error('Erreur lors de la suppression.'),
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl md:text-3xl font-semibold">Le savais-tu ?</h1>
                    <p className="text-sm text-muted-foreground mt-1">{messages.length} message(s)</p>
                </div>
                <Dialog open={open} onOpenChange={o => { if (!o) closeDialog(); else setOpen(true); }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setOpen(true)}><Plus className="size-4 mr-1.5" /> Ajouter</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{form.id ? 'Modifier le message' : 'Nouveau message'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <Field label="Texte *">
                                <Input
                                    value={form.contenu}
                                    onChange={e => setForm({ ...form, contenu: e.target.value })}
                                    placeholder="Les bières artisanales représentent…"
                                    maxLength={500}
                                />
                            </Field>
                            <Field label="Fréquence d'affichage">
                                <Select value={form.frequence} onValueChange={v => setForm({ ...form, frequence: v as Frequence })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tres_frequent">Très fréquent (×2)</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="peu_frequent">Peu fréquent (÷2)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">La fréquence est relative au nombre total de messages.</p>
                            </Field>
                            <div className="flex items-center gap-3">
                                <Switch
                                    id="actif"
                                    checked={form.actif}
                                    onCheckedChange={v => setForm({ ...form, actif: v })}
                                />
                                <Label htmlFor="actif" className="cursor-pointer">Visible sur le tableau de bord</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={closeDialog}>Annuler</Button>
                            <Button onClick={save}>Enregistrer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="shadow-soft overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Message</th>
                            <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Fréquence</th>
                            <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Visibilité</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {messages.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-12 text-muted-foreground">
                                    <Lightbulb className="size-10 mx-auto mb-2 opacity-40" />
                                    Aucun message. Ajoutez-en un !
                                </td>
                            </tr>
                        )}
                        {messages.map(m => (
                            <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                                <td className="px-4 py-3">
                                    <span className={m.actif ? '' : 'text-muted-foreground line-through'}>{m.contenu}</span>
                                    <div className="sm:hidden mt-1 flex gap-2">
                                        <Badge variant={FREQ_VARIANTS[m.frequence]}>{FREQ_LABELS[m.frequence]}</Badge>
                                        {!m.actif && <Badge variant="outline">Masqué</Badge>}
                                    </div>
                                </td>
                                <td className="px-4 py-3 hidden sm:table-cell">
                                    <Badge variant={FREQ_VARIANTS[m.frequence]}>{FREQ_LABELS[m.frequence]}</Badge>
                                </td>
                                <td className="px-4 py-3 hidden sm:table-cell">
                                    {m.actif
                                        ? <span className="text-xs text-success font-medium">Visible</span>
                                        : <span className="text-xs text-muted-foreground">Masqué</span>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button size="icon" variant="ghost" title="Modifier" onClick={() => startEdit(m)}>
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" title="Supprimer" onClick={() => handleDelete(m)}>
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

Savistu.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
