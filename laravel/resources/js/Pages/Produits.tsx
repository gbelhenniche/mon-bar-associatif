import { useMemo, useRef, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { DynamicIcon } from "lucide-react/dynamic";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Search, Pencil, Trash2, Package, Upload, Download, Eye, EyeOff, ClipboardPlus, ClipboardMinus, ClipboardClock, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { eur } from "@/lib/format";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

type Cat = { id: string; nom: string; icone: string | null; couleur: string | null };
type FournisseurItem = { id: number; nom: string };
type Visibilite = "visible" | "masque" | "visible_jusqu_au";

type Prod = {
    id: string;
    reference: string | null;
    nom: string;
    categorie_id: string | null;
    categorie?: { id: string; nom: string; icone: string | null; couleur: string | null } | null;
    format: string | null;
    fournisseur: string | null;
    stock_actuel: number;
    stock_minimum: number;
    prix_achat: number;
    prix_vente: number;
    suivi_stock: boolean;
    visibilite: Visibilite;
    visibilite_jusqu_au: string | null;
};

type Mouvement = {
    id: string;
    type: string;
    quantite: number;
    note: string | null;
    created_at: string;
    user_name: string | null;
};

type Props = { produits: Prod[]; categories: Cat[]; fournisseurs: FournisseurItem[] };

const today = new Date().toISOString().slice(0, 10);

const empty: Partial<Prod> = {
    reference: "", nom: "", categorie_id: null, format: "", fournisseur: "",
    stock_actuel: 0, stock_minimum: 0, prix_achat: 0, prix_vente: 0,
    suivi_stock: true, visibilite: "visible", visibilite_jusqu_au: null,
};

function fmtDate(s: string): string {
    const [y, m, d] = s.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
}

function fmtNum(n: number): string {
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

function isProduitVisible(p: Prod): boolean {
    if (p.visibilite === "visible") return true;
    if (p.visibilite === "visible_jusqu_au") return !!p.visibilite_jusqu_au && p.visibilite_jusqu_au >= today;
    return false;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function margeValue(a: number, v: number): number | null {
    if (a <= 0 || v <= 0) return null;
    return ((v - a) / v) * 100;
}

function margeColor(m: number | null, seuils: { rouge: number; orange: number; vert: number }): string {
    if (m === null) return 'text-muted-foreground';
    if (m < seuils.rouge) return 'text-destructive';
    if (m < seuils.orange) return 'text-orange-500';
    if (m < seuils.vert) return 'text-amber-500';
    return 'text-success';
}

export default function Produits({ produits, categories, fournisseurs }: Props) {
    const { props } = usePage();
    const margesSeuils = (props as any).margesSeuils ?? { rouge: 15, orange: 30, vert: 50 };
    const typesAdherent: { slug: string; nom: string }[] = (props as any).typesAdherent ?? [];

    const [search, setSearch] = useState("");
    const [filterCat, setFilterCat] = useState<string>("all");
    const [showHidden, setShowHidden] = useState(false);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Partial<Prod>>(empty);
    const fileRef = useRef<HTMLInputElement>(null);

    const [adhDialog, setAdhDialog] = useState(false);
    const [adhType, setAdhType] = useState("");
    const [adhAnnee, setAdhAnnee] = useState(String(new Date().getFullYear()));
    const [adhMontant, setAdhMontant] = useState("");

    // Stock variation
    const [decrementTarget, setDecrementTarget] = useState<Prod | null>(null);

    // History sheet
    const [historyTarget, setHistoryTarget] = useState<Prod | null>(null);
    const [historyData, setHistoryData] = useState<Mouvement[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const filtered = useMemo(() =>
        produits.filter(p => {
            if (!showHidden && !isProduitVisible(p)) return false;
            const okCat = filterCat === "all" || p.categorie_id === filterCat;
            const okSearch = !search
                || p.nom.toLowerCase().includes(search.toLowerCase())
                || (p.reference || "").toLowerCase().includes(search.toLowerCase());
            return okCat && okSearch;
        }),
        [produits, filterCat, search, showHidden],
    );

    const hiddenCount = useMemo(() => produits.filter(p => !isProduitVisible(p)).length, [produits]);

    const saveAdhesion = () => {
        const annee = parseInt(adhAnnee);
        if (!annee || annee < 2026) return toast.error("Année invalide (minimum 2026)");
        const montant = Number(adhMontant.replace(",", "."));
        if (!montant || montant <= 0) return toast.error("Montant invalide");
        const nom = `Adhésion ${adhType} ${annee}`;
        const adhCategory = categories.find(c => c.nom === "Adhésions");
        router.post("/produits", {
            nom, categorie_id: adhCategory?.id ?? null,
            prix_vente: montant, prix_achat: 0, suivi_stock: false,
            stock_actuel: 0, stock_minimum: 0,
            visibilite: "visible_jusqu_au", visibilite_jusqu_au: `${annee}-12-31`,
        }, {
            onSuccess: () => { toast.success(`"${nom}" créé`); setAdhDialog(false); setAdhMontant(""); },
            onError: () => toast.error("Erreur lors de la création"),
        });
    };

    const save = () => {
        if (!editing.nom) return toast.error("Le nom est requis");
        if (/^adhésion/i.test(editing.nom.trim()))
            return toast.error('Les produits "Adhésion" se créent via le bouton "Ajouter adhésions"');
        if (editing.visibilite === "visible_jusqu_au" && !editing.visibilite_jusqu_au)
            return toast.error("Veuillez saisir une date de visibilité");
        const payload = {
            reference: editing.reference || null,
            nom: editing.nom,
            categorie_id: editing.categorie_id || null,
            format: editing.format || null,
            fournisseur: editing.fournisseur || null,
            stock_actuel: Number(editing.stock_actuel) || 0,
            stock_minimum: Number(editing.stock_minimum) || 0,
            prix_achat: Number(editing.prix_achat) || 0,
            prix_vente: Number(editing.prix_vente) || 0,
            suivi_stock: editing.suivi_stock ?? true,
            visibilite: editing.visibilite ?? "visible",
            visibilite_jusqu_au: editing.visibilite === "visible_jusqu_au" ? editing.visibilite_jusqu_au || null : null,
        };
        if (editing.id) {
            router.put(`/produits/${editing.id}`, payload, {
                onSuccess: () => { toast.success("Produit mis à jour"); setOpen(false); setEditing(empty); },
                onError: () => toast.error("Erreur lors de la mise à jour"),
            });
        } else {
            router.post("/produits", payload, {
                onSuccess: () => { toast.success("Produit créé"); setOpen(false); setEditing(empty); },
                onError: () => toast.error("Erreur lors de la création"),
            });
        }
    };

    const handleDelete = (id: string) => {
        if (!confirm("Supprimer ce produit ?")) return;
        router.delete(`/produits/${id}`, {
            onSuccess: () => toast.success("Supprimé"),
            onError: () => toast.error("Erreur lors de la suppression"),
        });
    };

    const doIncrement = (p: Prod) => {
        router.post(`/produits/${p.id}/incrementer`, { quantite: 1 }, {
            onSuccess: () => toast.success(`+1 — ${p.nom}`),
            onError: () => toast.error("Erreur lors de l'ajout"),
        });
    };

    const doDecrement = () => {
        if (!decrementTarget) return;
        router.post(`/produits/${decrementTarget.id}/decrementer`, { quantite: 1 }, {
            onSuccess: () => { toast.success(`-1 — ${decrementTarget.nom}`); setDecrementTarget(null); },
            onError: () => toast.error("Erreur lors de la réduction"),
        });
    };

    const openHistory = async (p: Prod) => {
        setHistoryTarget(p);
        setHistoryData([]);
        setHistoryLoading(true);
        try {
            const res = await fetch(`/produits/${p.id}/historique`);
            setHistoryData(await res.json());
        } catch { toast.error("Impossible de charger l'historique"); }
        finally { setHistoryLoading(false); }
    };

    return (
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
            {/* En-tête */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="font-display text-2xl md:text-3xl font-semibold">Produits</h1>
                    <p className="text-sm text-muted-foreground mt-1">{produits.length} produits</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) { const form = new FormData(); form.append('file', f); router.post('/produits/import', form as any, { forceFormData: true, onSuccess: () => toast.success('Import terminé'), onError: () => toast.error("Erreur lors de l'import") }); e.target.value = ''; }}} />
                    <Button variant="outline" className="h-11" onClick={() => fileRef.current?.click()}>
                        <Upload className="size-4 mr-1.5" /> Importer
                    </Button>
                    <Button variant="outline" className="h-11" onClick={() => { window.location.href = '/produits/export'; }}>
                        <Download className="size-4 mr-1.5" /> Exporter
                    </Button>
                    <Button variant="outline" className="h-11" onClick={() => { setAdhType(typesAdherent[0]?.slug ?? ""); setAdhAnnee(String(new Date().getFullYear())); setAdhMontant(""); setAdhDialog(true); }}>
                        <Plus className="size-4 mr-1.5" /> Ajouter adhésions
                    </Button>
                    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setEditing(empty); }}>
                        <DialogTrigger asChild>
                            <Button className="h-11"><Plus className="size-4 mr-1.5" /> Ajouter</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>{editing.id ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4 py-2">
                                <Field label="Référence">
                                    <Input value={editing.reference ?? ""} onChange={e => setEditing({ ...editing, reference: e.target.value })} />
                                </Field>
                                <Field label="Nom *">
                                    <Input value={editing.nom ?? ""} onChange={e => setEditing({ ...editing, nom: e.target.value })} />
                                </Field>
                                <Field label="Catégorie">
                                    <Select value={editing.categorie_id ?? ""} onValueChange={v => setEditing({ ...editing, categorie_id: v || null })}>
                                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                                        <SelectContent>
                                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Format">
                                    <Input value={editing.format ?? ""} onChange={e => setEditing({ ...editing, format: e.target.value })} />
                                </Field>
                                <Field label="Fournisseur">
                                    <Select value={editing.fournisseur ?? '__none__'} onValueChange={v => setEditing({ ...editing, fournisseur: v === '__none__' ? null : v })}>
                                        <SelectTrigger><SelectValue placeholder="Choisir un fournisseur…" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">— Aucun —</SelectItem>
                                            {fournisseurs.map(f => <SelectItem key={f.id} value={f.nom}>{f.nom}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <div className="flex items-end gap-2 pb-1">
                                    <Switch checked={editing.suivi_stock ?? true} onCheckedChange={v => setEditing({ ...editing, suivi_stock: v })} />
                                    <Label className="text-xs">Suivi de stock</Label>
                                </div>
                                <Field label="Stock actuel">
                                    <Input type="number" step="0.01" disabled={!(editing.suivi_stock ?? true)} value={editing.stock_actuel ?? 0} onChange={e => setEditing({ ...editing, stock_actuel: Number(e.target.value) })} />
                                </Field>
                                <Field label="Stock minimum">
                                    <Input type="number" step="0.01" disabled={!(editing.suivi_stock ?? true)} value={editing.stock_minimum ?? 0} onChange={e => setEditing({ ...editing, stock_minimum: Number(e.target.value) })} />
                                </Field>
                                <Field label="Prix achat (€)">
                                    <Input type="number" step="0.01" value={editing.prix_achat ?? 0} onChange={e => setEditing({ ...editing, prix_achat: Number(e.target.value) })} />
                                </Field>
                                <Field label="Prix vente (€)">
                                    <Input type="number" step="0.01" value={editing.prix_vente ?? 0} onChange={e => setEditing({ ...editing, prix_vente: Number(e.target.value) })} />
                                </Field>
                                <div className="col-span-2 border-t pt-3 space-y-2">
                                    <Label className="text-xs">Visibilité</Label>
                                    <RadioGroup value={editing.visibilite ?? "visible"}
                                        onValueChange={v => setEditing({ ...editing, visibilite: v as Visibilite, visibilite_jusqu_au: v !== "visible_jusqu_au" ? null : editing.visibilite_jusqu_au })}
                                        className="flex flex-wrap gap-x-6 gap-y-2">
                                        <div className="flex items-center gap-2"><RadioGroupItem value="visible" id="vis-visible" /><Label htmlFor="vis-visible" className="text-sm font-normal cursor-pointer">Visible</Label></div>
                                        <div className="flex items-center gap-2"><RadioGroupItem value="masque" id="vis-masque" /><Label htmlFor="vis-masque" className="text-sm font-normal cursor-pointer">Masqué</Label></div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <RadioGroupItem value="visible_jusqu_au" id="vis-date" />
                                            <Label htmlFor="vis-date" className="text-sm font-normal cursor-pointer">Visible jusqu'au :</Label>
                                            <Input type="date" className="h-8 w-40 text-sm" disabled={editing.visibilite !== "visible_jusqu_au"} value={editing.visibilite_jusqu_au ?? ""} onChange={e => setEditing({ ...editing, visibilite_jusqu_au: e.target.value || null })} />
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                                <Button onClick={save}>Enregistrer</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filtres */}
            <Card className="p-4 shadow-soft">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input placeholder="Rechercher un produit…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-11" />
                    </div>
                    <Select value={filterCat} onValueChange={setFilterCat}>
                        <SelectTrigger className="w-full sm:w-56 h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Toutes catégories</SelectItem>
                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {hiddenCount > 0 && (
                        <Button variant={showHidden ? "secondary" : "outline"} className="h-11 shrink-0" onClick={() => setShowHidden(v => !v)}>
                            {showHidden ? <Eye className="size-4 mr-1.5" /> : <EyeOff className="size-4 mr-1.5" />}
                            {showHidden ? "Masquer les cachés" : `Masqués (${hiddenCount})`}
                        </Button>
                    )}
                </div>
            </Card>

            {/* Tableau */}
            <Card className="shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium">Produit</th>
                                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Catégorie</th>
                                <th className="text-center px-4 py-3 font-medium">Stock</th>
                                <th className="text-right px-4 py-3 font-medium">Prix</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                                        <Package className="size-10 mx-auto mb-2 opacity-40" /> Aucun produit
                                    </td>
                                </tr>
                            )}
                            {filtered.map(p => {
                                const cat = p.categorie ?? categories.find(c => c.id === p.categorie_id) ?? null;
                                const low  = p.suivi_stock && Number(p.stock_actuel) > 0 && Number(p.stock_actuel) <= Number(p.stock_minimum);
                                const crit = p.suivi_stock && Number(p.stock_actuel) <= 0;
                                const m    = margeValue(Number(p.prix_achat), Number(p.prix_vente));
                                const mClr = margeColor(m, margesSeuils);

                                return (
                                    <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                                        {/* Produit */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium">{p.nom}</span>
                                                {p.visibilite === "masque" && <Badge variant="secondary" className="text-xs font-normal">Masqué</Badge>}
                                                {p.visibilite === "visible_jusqu_au" && p.visibilite_jusqu_au && p.visibilite_jusqu_au < today && <Badge variant="destructive" className="text-xs font-normal">Expiré</Badge>}
                                                {p.visibilite === "visible_jusqu_au" && p.visibilite_jusqu_au && p.visibilite_jusqu_au >= today && <Badge variant="outline" className="text-xs font-normal">Jusqu'au {fmtDate(p.visibilite_jusqu_au)}</Badge>}
                                            </div>
                                            {p.reference && <div className="text-xs text-muted-foreground">{p.reference}</div>}
                                        </td>

                                        {/* Catégorie + format */}
                                        <td className="px-4 py-2 hidden md:table-cell">
                                            <div className="flex items-center gap-1.5">
                                                {cat?.icone && (
                                                    <DynamicIcon name={cat.icone as any} size={12} className="shrink-0 opacity-60" style={cat.couleur ? { color: cat.couleur } : undefined} />
                                                )}
                                                <span className="text-xs text-muted-foreground">{cat?.nom ?? '—'}</span>
                                            </div>
                                            {p.format && <div className="text-xs text-muted-foreground/70 italic ml-0.5">{p.format}</div>}
                                        </td>

                                        {/* Stock */}
                                        <td className="px-4 py-3 text-center">
                                            {p.suivi_stock ? (
                                                <Badge
                                                    variant={crit ? "destructive" : low ? "secondary" : "outline"}
                                                    className="inline-flex w-16 justify-center tabular-nums font-mono text-xs"
                                                >
                                                    {fmtNum(Number(p.stock_actuel))}/{fmtNum(Number(p.stock_minimum))}
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="inline-flex w-16 justify-center text-xs text-muted-foreground cursor-default"
                                                    title="Non suivi"
                                                >
                                                    NS
                                                </Badge>
                                            )}
                                        </td>

                                        {/* Prix + marge */}
                                        <td className="px-4 py-3 text-right">
                                            <div className="font-medium">{eur(Number(p.prix_vente))}</div>
                                            <div className={`text-xs italic ${mClr}`}>
                                                {m !== null ? `${m.toFixed(0)} %` : '—'}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                {p.suivi_stock && (
                                                    <>
                                                        <Button size="icon" variant="ghost" title="Ajouter 1 au stock" onClick={() => doIncrement(p)}>
                                                            <ClipboardPlus className="size-4 text-success" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" title="Retirer 1 du stock" onClick={() => setDecrementTarget(p)}>
                                                            <ClipboardMinus className="size-4 text-destructive" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" title="Historique des variations" onClick={() => openHistory(p)}>
                                                            <ClipboardClock className="size-4 text-muted-foreground" />
                                                        </Button>
                                                    </>
                                                )}
                                                <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}>
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

            {/* Dialog confirmation décrémentation */}
            <Dialog open={!!decrementTarget} onOpenChange={o => { if (!o) setDecrementTarget(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Réduire le stock</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Êtes-vous sûr de vouloir réduire le stock de <span className="font-medium text-foreground">{decrementTarget?.nom}</span> sans passer par une vente ?
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDecrementTarget(null)}>Non</Button>
                        <Button variant="destructive" onClick={doDecrement}>Oui</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sheet historique */}
            <Sheet open={!!historyTarget} onOpenChange={o => { if (!o) { setHistoryTarget(null); setHistoryData([]); } }}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="font-display text-xl">Historique — {historyTarget?.nom}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                        {historyLoading && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                                <RefreshCw className="size-4 animate-spin" /> Chargement…
                            </div>
                        )}
                        {!historyLoading && historyData.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">Aucun mouvement enregistré.</p>
                        )}
                        {!historyLoading && historyData.length > 0 && (
                            <div className="space-y-1">
                                {historyData.map(m => {
                                    const isEntree = m.type === 'entree' || m.type === 'inventaire';
                                    return (
                                        <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                                            <div className={`grid place-items-center size-7 rounded-full shrink-0 ${isEntree ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                                                {isEntree ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-medium text-sm tabular-nums ${isEntree ? 'text-success' : 'text-destructive'}`}>
                                                        {isEntree ? '+' : '-'}{m.quantite}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground capitalize">{m.type}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    {m.user_name && ` · ${m.user_name}`}
                                                </div>
                                                {m.note && <div className="text-xs italic text-muted-foreground/70 mt-0.5">{m.note}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Dialog adhésion */}
            <AdhesionDialog open={adhDialog} onClose={() => setAdhDialog(false)}
                adhType={adhType} setAdhType={setAdhType}
                adhAnnee={adhAnnee} setAdhAnnee={setAdhAnnee}
                adhMontant={adhMontant} setAdhMontant={setAdhMontant}
                onSave={saveAdhesion} types={typesAdherent.map(t => ({ slug: t.slug, nom: t.nom }))} />
        </div>
    );
}

function AdhesionDialog({ open, onClose, adhType, setAdhType, adhAnnee, setAdhAnnee, adhMontant, setAdhMontant, onSave, types }: {
    open: boolean; onClose: () => void;
    adhType: string; setAdhType: (v: string) => void;
    adhAnnee: string; setAdhAnnee: (v: string) => void;
    adhMontant: string; setAdhMontant: (v: string) => void;
    onSave: () => void; types: { slug: string; nom: string }[];
}) {
    return (
        <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
            <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Ajouter un produit adhésion</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5"><Label className="text-xs">Type d'adhésion</Label>
                        <Select value={adhType} onValueChange={setAdhType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{types.map(t => <SelectItem key={t.slug} value={t.slug}>{t.nom}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Année cible</Label>
                        <Input type="number" min={2026} step={1} value={adhAnnee} onChange={e => setAdhAnnee(e.target.value)} />
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Montant (€)</Label>
                        <Input type="number" min={0.01} step={0.01} placeholder="0,00" value={adhMontant} onChange={e => setAdhMontant(e.target.value)} />
                    </div>
                    <p className="text-xs text-muted-foreground">Crée le produit <span className="font-medium">« Adhésion {adhType} {adhAnnee} »</span> visible jusqu'au 31/12/{adhAnnee}.</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button onClick={onSave}>Créer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

Produits.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
