import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Tag, Warehouse } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type Cat = { id: string; nom: string; couleur: string | null; icone: string | null; ordre: number | null };
type MType = { id: number; nom: string; couleur: string | null; icone: string | null; ordre: number | null };

type Props = {
    categories: Cat[];
    types: MType[];
};

const emptyCat: Partial<Cat> = { nom: '', couleur: '#0d7a5f', icone: '', ordre: 0 };
const emptyType: Partial<MType> = { nom: '', couleur: '#0d7a5f', icone: '', ordre: 0 };

function ItemRow<T extends { nom: string; couleur: string | null; icone: string | null; ordre: number | null }>({
    item,
    onEdit,
    onDelete,
    onMove,
}: {
    item: T;
    onEdit: () => void;
    onDelete: () => void;
    onMove: (dir: -1 | 1) => void;
}) {
    return (
        <div className="p-3 flex items-center gap-3">
            <div className="size-10 rounded-lg shrink-0 flex items-center justify-center" style={{ backgroundColor: item.couleur ?? '#0d7a5f' }}>
                {item.icone && <DynamicIcon name={item.icone as any} size={18} className="text-white opacity-90" />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium">{item.nom}</div>
                <div className="text-xs text-muted-foreground">
                    Ordre {item.ordre ?? 0}{item.icone ? ` · ${item.icone}` : ''}
                </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => onMove(-1)}><ArrowUp className="size-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => onMove(1)}><ArrowDown className="size-4" /></Button>
            <Button size="icon" variant="ghost" onClick={onEdit}><Pencil className="size-4" /></Button>
            <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="size-4 text-destructive" /></Button>
        </div>
    );
}

function ItemDialog({
    open,
    onOpenChange,
    editing,
    setEditing,
    onSave,
    title,
}: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    editing: Partial<Cat | MType>;
    setEditing: (v: any) => void;
    onSave: () => void;
    title: string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                        <Label className="text-xs">Nom *</Label>
                        <Input value={editing.nom ?? ''} onChange={e => setEditing({ ...editing, nom: e.target.value })} autoFocus />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Couleur</Label>
                        <Input type="color" value={editing.couleur ?? '#0d7a5f'}
                            onChange={e => setEditing({ ...editing, couleur: e.target.value })}
                            className="h-11 w-24" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Icône (nom lucide, optionnel)</Label>
                        <Input value={editing.icone ?? ''} onChange={e => setEditing({ ...editing, icone: e.target.value })}
                            placeholder="ex. beer, coffee…" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Ordre</Label>
                        <Input type="number" value={editing.ordre ?? 0}
                            onChange={e => setEditing({ ...editing, ordre: Number(e.target.value) })} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button onClick={onSave}>Enregistrer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function Categories({ categories, types }: Props) {
    // ─── Catégories ────────────────────────────────────────────
    const [catOpen, setCatOpen] = useState(false);
    const [catEditing, setCatEditing] = useState<Partial<Cat>>(emptyCat);

    const saveCat = () => {
        if (!catEditing.nom) return toast.error('Nom requis');
        const payload = {
            nom: catEditing.nom,
            couleur: catEditing.couleur || '#0d7a5f',
            icone: catEditing.icone || null,
            ordre: Number(catEditing.ordre) || 0,
        };
        if (catEditing.id) {
            router.put(`/admin/categories/${catEditing.id}`, payload, {
                onSuccess: () => { toast.success('Mise à jour'); setCatOpen(false); setCatEditing(emptyCat); },
                onError: () => toast.error('Erreur lors de la mise à jour'),
            });
        } else {
            router.post('/admin/categories', payload, {
                onSuccess: () => { toast.success('Créée'); setCatOpen(false); setCatEditing(emptyCat); },
                onError: () => toast.error('Erreur lors de la création'),
            });
        }
    };

    const deleteCat = (id: string) => {
        if (!confirm('Supprimer cette catégorie ?')) return;
        router.delete(`/admin/categories/${id}`, {
            onSuccess: () => toast.success('Supprimée'),
            onError: () => toast.error('Erreur lors de la suppression'),
        });
    };

    const moveCat = (cat: Cat, dir: -1 | 1) => {
        router.put(`/admin/categories/${cat.id}`, {
            nom: cat.nom, couleur: cat.couleur, icone: cat.icone, ordre: (cat.ordre ?? 0) + dir,
        }, { preserveState: true, onError: () => toast.error('Erreur') });
    };

    // ─── Types de stocks ────────────────────────────────────────
    const [typeOpen, setTypeOpen] = useState(false);
    const [typeEditing, setTypeEditing] = useState<Partial<MType>>(emptyType);

    const saveType = () => {
        if (!typeEditing.nom) return toast.error('Nom requis');
        const payload = {
            nom: typeEditing.nom,
            couleur: typeEditing.couleur || '#0d7a5f',
            icone: typeEditing.icone || null,
            ordre: Number(typeEditing.ordre) || 0,
        };
        if (typeEditing.id) {
            router.put(`/admin/types-materiel/${typeEditing.id}`, payload, {
                onSuccess: () => { toast.success('Mis à jour'); setTypeOpen(false); setTypeEditing(emptyType); },
                onError: () => toast.error('Erreur lors de la mise à jour'),
            });
        } else {
            router.post('/admin/types-materiel', payload, {
                onSuccess: () => { toast.success('Créé'); setTypeOpen(false); setTypeEditing(emptyType); },
                onError: () => toast.error('Erreur lors de la création'),
            });
        }
    };

    const deleteType = (id: number) => {
        if (!confirm('Supprimer ce type ?')) return;
        router.delete(`/admin/types-materiel/${id}`, {
            onSuccess: () => toast.success('Supprimé'),
            onError: () => toast.error('Erreur lors de la suppression'),
        });
    };

    const moveType = (t: MType, dir: -1 | 1) => {
        router.put(`/admin/types-materiel/${t.id}`, {
            nom: t.nom, couleur: t.couleur, icone: t.icone, ordre: (t.ordre ?? 0) + dir,
        }, { preserveState: true, onError: () => toast.error('Erreur') });
    };

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-10">
            {/* ── Catégories de produits ── */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-2xl md:text-3xl font-semibold">Catégories de produits</h1>
                        <p className="text-sm text-muted-foreground mt-1">{categories.length} catégorie(s)</p>
                    </div>
                    <Button onClick={() => { setCatEditing(emptyCat); setCatOpen(true); }}>
                        <Plus className="size-4 mr-1.5" /> Nouvelle catégorie
                    </Button>
                </div>

                <Card className="divide-y divide-border shadow-soft">
                    {categories.length === 0 && (
                        <div className="p-12 text-center text-muted-foreground">
                            <Tag className="size-10 mx-auto mb-2 opacity-40" /> Aucune catégorie
                        </div>
                    )}
                    {categories.map(c => (
                        <ItemRow
                            key={c.id}
                            item={c}
                            onEdit={() => { setCatEditing(c); setCatOpen(true); }}
                            onDelete={() => deleteCat(c.id)}
                            onMove={dir => moveCat(c, dir)}
                        />
                    ))}
                </Card>
            </div>

            {/* ── Types de stocks ── */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-display text-2xl md:text-3xl font-semibold">Types de stocks</h2>
                        <p className="text-sm text-muted-foreground mt-1">{types.length} type(s)</p>
                    </div>
                    <Button onClick={() => { setTypeEditing(emptyType); setTypeOpen(true); }}>
                        <Plus className="size-4 mr-1.5" /> Nouveau type
                    </Button>
                </div>

                <Card className="divide-y divide-border shadow-soft">
                    {types.length === 0 && (
                        <div className="p-12 text-center text-muted-foreground">
                            <Warehouse className="size-10 mx-auto mb-2 opacity-40" /> Aucun type
                        </div>
                    )}
                    {types.map(t => (
                        <ItemRow
                            key={t.id}
                            item={t}
                            onEdit={() => { setTypeEditing(t); setTypeOpen(true); }}
                            onDelete={() => deleteType(t.id)}
                            onMove={dir => moveType(t, dir)}
                        />
                    ))}
                </Card>
            </div>

            {/* Dialogs */}
            <ItemDialog
                open={catOpen}
                onOpenChange={o => { setCatOpen(o); if (!o) setCatEditing(emptyCat); }}
                editing={catEditing}
                setEditing={setCatEditing}
                onSave={saveCat}
                title={catEditing.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            />
            <ItemDialog
                open={typeOpen}
                onOpenChange={o => { setTypeOpen(o); if (!o) setTypeEditing(emptyType); }}
                editing={typeEditing}
                setEditing={setTypeEditing}
                onSave={saveType}
                title={typeEditing.id ? 'Modifier le type' : 'Nouveau type de stock'}
            />
        </div>
    );
}

Categories.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
