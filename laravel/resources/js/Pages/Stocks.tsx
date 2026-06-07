import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    PackagePlus,
    PackageMinus,
    Warehouse,
    Eye,
    EyeOff,
    History,
    AlertTriangle,
    TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';


type Materiel = {
    id: number;
    nom: string;
    type: string | null;
    fournisseur: string | null;
    seuil_alerte: number;
    note: string | null;
    visible: boolean;
    quantite: number;
};

type Variation = {
    id: number;
    variation: number;
    created_at: string;
};

type MaterielType = { id: number; nom: string };
type FournisseurItem = { id: number; nom: string };

type Props = {
    materiels: Materiel[];
    types: MaterielType[];
    fournisseurs: FournisseurItem[];
};

const emptyForm = (): Partial<Materiel> => ({
    nom: '',
    type: null,
    fournisseur: null,
    seuil_alerte: 0,
    note: '',
    visible: true,
});

function isInsuffisant(m: Materiel) {
    return m.quantite < m.seuil_alerte;
}

function isFaible(m: Materiel) {
    return m.seuil_alerte > 0 && m.quantite >= m.seuil_alerte && m.quantite < m.seuil_alerte * 2;
}

function StatCard({
    label,
    value,
    tone,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    tone?: 'success' | 'warning' | 'destructive';
    icon?: React.ElementType;
}) {
    const cls =
        tone === 'success'
            ? 'text-success'
            : tone === 'destructive'
              ? 'text-destructive'
              : tone === 'warning'
                ? 'text-orange-500'
                : 'text-foreground';
    return (
        <Card className="p-4 shadow-soft">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                {Icon && <Icon className="size-3.5" />}
                {label}
            </div>
            <div className={`mt-1 font-display text-2xl font-semibold ${cls}`}>{value}</div>
        </Card>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs">{label}</Label>
            {children}
        </div>
    );
}

function fmtDate(s: string) {
    const d = new Date(s);
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function Stocks({ materiels, types, fournisseurs }: Props) {
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStock, setFilterStock] = useState('all');
    const [showHidden, setShowHidden] = useState(false);

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<Partial<Materiel>>(emptyForm());

    const [histOpen, setHistOpen] = useState(false);
    const [histMateriel, setHistMateriel] = useState<Materiel | null>(null);
    const [variations, setVariations] = useState<Variation[]>([]);
    const [histLoading, setHistLoading] = useState(false);

    const hiddenCount = useMemo(() => materiels.filter(m => !m.visible).length, [materiels]);

    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        return materiels.filter(m => {
            if (!showHidden && !m.visible) return false;
            if (s && !m.nom.toLowerCase().includes(s)) return false;
            if (filterType !== 'all' && m.type !== filterType) return false;
            if (filterStock === 'insuffisant' && !isInsuffisant(m)) return false;
            if (filterStock === 'faible' && !isFaible(m)) return false;
            return true;
        });
    }, [materiels, search, filterType, filterStock, showHidden]);

    const stats = useMemo(() => ({
        total: materiels.filter(m => m.visible).length,
        insuffisant: materiels.filter(m => m.visible && isInsuffisant(m)).length,
        faible: materiels.filter(m => m.visible && isFaible(m)).length,
        masques: hiddenCount,
    }), [materiels, hiddenCount]);

    const save = () => {
        if (!form.nom?.trim()) return toast.error('Nom requis');
        const payload = {
            nom: form.nom,
            type: form.type || null,
            fournisseur: form.fournisseur || null,
            seuil_alerte: Number(form.seuil_alerte) || 0,
            note: form.note || null,
            visible: form.visible ?? true,
        };
        if (form.id) {
            router.put(`/materiels/${form.id}`, payload, {
                onSuccess: () => { toast.success('Mis à jour'); setOpen(false); setForm(emptyForm()); },
                onError: () => toast.error('Erreur lors de la mise à jour'),
            });
        } else {
            router.post('/materiels', payload, {
                onSuccess: () => { toast.success('Élément créé'); setOpen(false); setForm(emptyForm()); },
                onError: () => toast.error('Erreur lors de la création'),
            });
        }
    };

    const handleDelete = (m: Materiel) => {
        if (!confirm(`Supprimer « ${m.nom} » ?`)) return;
        router.delete(`/materiels/${m.id}`, {
            onSuccess: () => toast.success('Supprimé'),
            onError: () => toast.error('Erreur lors de la suppression'),
        });
    };

    const incrementer = (m: Materiel) => {
        router.post(`/materiels/${m.id}/incrementer`, {}, {
            preserveScroll: true,
            onError: () => toast.error('Erreur'),
        });
    };

    const decrementer = (m: Materiel) => {
        router.post(`/materiels/${m.id}/decrementer`, {}, {
            preserveScroll: true,
            onError: () => toast.error('Erreur'),
        });
    };

    const openHistorique = async (m: Materiel) => {
        setHistMateriel(m);
        setHistOpen(true);
        setVariations([]);
        setHistLoading(true);
        try {
            const res = await fetch(`/materiels/${m.id}/historique`);
            setVariations(await res.json());
        } catch {
            toast.error('Impossible de charger l\'historique');
        } finally {
            setHistLoading(false);
        }
    };

    const startEdit = (m: Materiel) => {
        setForm({ ...m });
        setOpen(true);
    };

    return (
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="font-display text-2xl md:text-3xl font-semibold">Stocks matériel</h1>
                    <p className="text-sm text-muted-foreground mt-1">{materiels.length} élément(s)</p>
                </div>
                <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setForm(emptyForm()); }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="size-4 mr-1.5" /> Créer un élément</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{form.id ? 'Modifier l\'élément' : 'Nouvel élément'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <Field label="Identifiant">
                                <Input disabled value={form.id ?? 'Auto'} className="bg-muted text-muted-foreground" />
                            </Field>
                            <Field label="Nom *">
                                <Input
                                    value={form.nom ?? ''}
                                    onChange={e => setForm({ ...form, nom: e.target.value })}
                                    placeholder="ex. Fût Kerné Blanche 20L"
                                />
                            </Field>
                            <Field label="Type">
                                <Select value={form.type ?? '__none__'} onValueChange={v => setForm({ ...form, type: v === '__none__' ? null : v })}>
                                    <SelectTrigger><SelectValue placeholder="Choisir un type…" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">— Aucun —</SelectItem>
                                        {types.map(t => <SelectItem key={t.id} value={t.nom}>{t.nom}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Fournisseur">
                                <Select value={form.fournisseur ?? '__none__'} onValueChange={v => setForm({ ...form, fournisseur: v === '__none__' ? null : v })}>
                                    <SelectTrigger><SelectValue placeholder="Choisir un fournisseur…" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">— Aucun —</SelectItem>
                                        {fournisseurs.map(f => <SelectItem key={f.id} value={f.nom}>{f.nom}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Seuil d'alerte (quantité)">
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.seuil_alerte ?? 0}
                                    onChange={e => setForm({ ...form, seuil_alerte: Number(e.target.value) })}
                                />
                            </Field>
                            <Field label="Note">
                                <Textarea
                                    rows={3}
                                    value={form.note ?? ''}
                                    onChange={e => setForm({ ...form, note: e.target.value })}
                                    placeholder="Informations complémentaires…"
                                />
                            </Field>
                            <Field label="Visibilité">
                                <RadioGroup
                                    value={form.visible === false ? 'masque' : 'visible'}
                                    onValueChange={v => setForm({ ...form, visible: v === 'visible' })}
                                    className="flex gap-6 pt-1"
                                >
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem value="visible" id="vis-visible" />
                                        <Label htmlFor="vis-visible" className="text-sm font-normal cursor-pointer">Visible</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem value="masque" id="vis-masque" />
                                        <Label htmlFor="vis-masque" className="text-sm font-normal cursor-pointer">Masqué</Label>
                                    </div>
                                </RadioGroup>
                            </Field>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                            <Button onClick={save}>Enregistrer</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Éléments visibles" value={stats.total} icon={Warehouse} />
                <StatCard label="Stock insuffisant" value={stats.insuffisant} tone={stats.insuffisant > 0 ? 'destructive' : undefined} icon={AlertTriangle} />
                <StatCard label="Stock faible" value={stats.faible} tone={stats.faible > 0 ? 'warning' : undefined} icon={TrendingDown} />
                <StatCard label="Masqués" value={stats.masques} icon={EyeOff} />
            </div>

            {/* Recherche & filtres */}
            <Card className="p-4 shadow-soft">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 h-11"
                        />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full sm:w-52 h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les types</SelectItem>
                            {types.map(t => <SelectItem key={t.id} value={t.nom}>{t.nom}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filterStock} onValueChange={setFilterStock}>
                        <SelectTrigger className="w-full sm:w-52 h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les stocks</SelectItem>
                            <SelectItem value="insuffisant">Insuffisant (sous le seuil)</SelectItem>
                            <SelectItem value="faible">Faible (proche du seuil)</SelectItem>
                        </SelectContent>
                    </Select>
                    {hiddenCount > 0 && (
                        <Button
                            variant={showHidden ? 'secondary' : 'outline'}
                            className="h-11 shrink-0"
                            onClick={() => setShowHidden(v => !v)}
                        >
                            {showHidden ? <Eye className="size-4 mr-1.5" /> : <EyeOff className="size-4 mr-1.5" />}
                            {showHidden ? 'Masquer les cachés' : `Masqués (${hiddenCount})`}
                        </Button>
                    )}
                </div>
            </Card>

            {/* Liste */}
            <Card className="shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium">Nom</th>
                                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Type</th>
                                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Fournisseur</th>
                                <th className="text-center px-4 py-3 font-medium">Quantité</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                                        <Warehouse className="size-10 mx-auto mb-2 opacity-40" />
                                        Aucun élément
                                    </td>
                                </tr>
                            )}
                            {filtered.map(m => {
                                const insuff = isInsuffisant(m);
                                const faible = isFaible(m);
                                const qtyClass = insuff
                                    ? 'text-destructive font-semibold'
                                    : faible
                                      ? 'text-orange-500 font-semibold'
                                      : 'text-foreground';
                                return (
                                    <tr key={m.id} className={`border-t border-border ${insuff ? 'bg-destructive/5' : faible ? 'bg-orange-50 dark:bg-orange-950/20' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium">{m.nom}</span>
                                                {!m.visible && (
                                                    <Badge variant="secondary" className="text-xs font-normal">Masqué</Badge>
                                                )}
                                                {insuff && (
                                                    <Badge variant="destructive" className="text-xs font-normal">Insuffisant</Badge>
                                                )}
                                                {!insuff && faible && (
                                                    <Badge className="text-xs font-normal bg-orange-500 hover:bg-orange-600">Faible</Badge>
                                                )}
                                            </div>
                                            {m.note && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{m.note}</div>}
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                                            {m.type ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                                            {m.fournisseur ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-base tabular-nums ${qtyClass}`}>{m.quantite}</span>
                                            {m.seuil_alerte > 0 && (
                                                <div className="text-xs text-muted-foreground">seuil {m.seuil_alerte}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    title="Ajouter une unité"
                                                    onClick={() => incrementer(m)}
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                                                >
                                                    <PackagePlus className="size-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    title="Retirer une unité"
                                                    disabled={m.quantite <= 0}
                                                    onClick={() => decrementer(m)}
                                                    className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 disabled:opacity-30 disabled:pointer-events-none"
                                                >
                                                    <PackageMinus className="size-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    title="Historique des variations"
                                                    onClick={() => openHistorique(m)}
                                                >
                                                    <History className="size-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    title="Modifier"
                                                    onClick={() => startEdit(m)}
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    title="Supprimer"
                                                    onClick={() => handleDelete(m)}
                                                >
                                                    <Trash2 className="size-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Dialog historique */}
            <Dialog open={histOpen} onOpenChange={o => { setHistOpen(o); if (!o) setHistMateriel(null); }}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="size-4" />
                            Historique — {histMateriel?.nom}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-1 py-2">
                        {histLoading && <p className="text-sm text-muted-foreground text-center py-4">Chargement…</p>}
                        {!histLoading && variations.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">Aucune variation enregistrée</p>
                        )}
                        {!histLoading && variations.map(v => (
                            <div key={v.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50">
                                <span className="text-xs text-muted-foreground">{fmtDate(v.created_at)}</span>
                                <span className={`font-mono font-semibold ${v.variation > 0 ? 'text-green-600' : 'text-orange-500'}`}>
                                    {v.variation > 0 ? '+' : ''}{v.variation}
                                </span>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setHistOpen(false)}>Fermer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

Stocks.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
