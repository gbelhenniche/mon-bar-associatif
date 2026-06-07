import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const ROLES = [
    { value: 'admin',     label: 'Admin',     cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    { value: 'benevole',  label: 'Bénévole',  cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    { value: 'tresorier', label: 'Trésorier', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
] as const;

type RoleValue = typeof ROLES[number]['value'];

type UserType = {
    id: number;
    name: string;
    email: string;
    created_at: string;
    roles: { id: string; role: RoleValue }[];
};

type Props = { users: UserType[] };
type FormState = { id?: number; name: string; email: string; password: string; roles: RoleValue[] };

const emptyForm = (): FormState => ({ name: '', email: '', password: '', roles: [] });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

export default function Utilisateurs({ users }: Props) {
    const { auth } = usePage().props as any;
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());

    const toggleRole = (role: RoleValue) =>
        setForm(f => ({
            ...f,
            roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role],
        }));

    const save = () => {
        if (!form.name.trim() || !form.email.trim()) return toast.error('Nom et email requis');
        if (!form.id && !form.password.trim()) return toast.error('Mot de passe requis pour un nouveau compte');

        const payload = {
            name: form.name,
            email: form.email,
            password: form.password || undefined,
            roles: form.roles,
        };

        if (form.id) {
            router.put(`/admin/utilisateurs/${form.id}`, payload, {
                onSuccess: () => { toast.success('Compte mis à jour'); setOpen(false); setForm(emptyForm()); },
                onError: e => toast.error(Object.values(e)[0] as string ?? 'Erreur'),
            });
        } else {
            router.post('/admin/utilisateurs', payload, {
                onSuccess: () => { toast.success('Compte créé'); setOpen(false); setForm(emptyForm()); },
                onError: e => toast.error(Object.values(e)[0] as string ?? 'Erreur'),
            });
        }
    };

    const startEdit = (u: UserType) => {
        setForm({ id: u.id, name: u.name, email: u.email, password: '', roles: u.roles.map(r => r.role) });
        setOpen(true);
    };

    const handleDelete = (u: UserType) => {
        if (!confirm(`Supprimer le compte « ${u.name} » ?`)) return;
        router.delete(`/admin/utilisateurs/${u.id}`, {
            onSuccess: () => toast.success('Compte supprimé'),
            onError: () => toast.error('Erreur lors de la suppression'),
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl md:text-3xl font-semibold">Comptes utilisateurs</h1>
                    <p className="text-sm text-muted-foreground mt-1">{users.length} compte(s)</p>
                </div>
                <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setForm(emptyForm()); }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="size-4 mr-1.5" /> Créer un compte</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{form.id ? 'Modifier le compte' : 'Nouveau compte'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <Field label="Nom *">
                                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </Field>
                            <Field label="Email *">
                                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </Field>
                            <Field label={form.id ? 'Mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}>
                                <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                            </Field>
                            <Field label="Rôles">
                                <div className="flex flex-wrap gap-5 pt-1">
                                    {ROLES.map(r => (
                                        <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                                            <Checkbox
                                                checked={form.roles.includes(r.value)}
                                                onCheckedChange={() => toggleRole(r.value)}
                                            />
                                            <span className="text-sm">{r.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </Field>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                            <Button onClick={save}>Enregistrer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium">Nom</th>
                                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Email</th>
                                <th className="text-left px-4 py-3 font-medium">Rôles</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-12 text-muted-foreground">
                                        <Users className="size-10 mx-auto mb-2 opacity-40" /> Aucun compte
                                    </td>
                                </tr>
                            )}
                            {users.map(u => (
                                <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                                    <td className="px-4 py-3">
                                        <div className="font-medium flex items-center gap-2">
                                            {u.name}
                                            {u.id === auth.user.id && (
                                                <span className="text-xs text-muted-foreground">(vous)</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground sm:hidden">{u.email}</div>
                                    </td>
                                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{u.email}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                                            {u.roles.map(r => {
                                                const def = ROLES.find(x => x.value === r.role);
                                                return (
                                                    <span key={r.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${def?.cls ?? 'bg-muted text-muted-foreground'}`}>
                                                        {def?.label ?? r.role}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button size="icon" variant="ghost" title="Modifier" onClick={() => startEdit(u)}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                title={u.id === auth.user.id ? 'Impossible de supprimer votre propre compte' : 'Supprimer'}
                                                disabled={u.id === auth.user.id}
                                                onClick={() => handleDelete(u)}
                                            >
                                                <Trash2 className="size-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

Utilisateurs.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
