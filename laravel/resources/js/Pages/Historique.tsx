import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, ChevronRight, Users, Loader2, Lock } from 'lucide-react';
import { eur } from '@/lib/format';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type PeriodeType = 'session' | 'jour' | 'semaine' | 'mois' | 'annee';
type ViewMode = 'detail' | 'produits' | 'categories';

type PeriodeItem = {
    key: string;
    label: string;
    sous_label: string | null;
    total: number;
    nb_ventes: number;
};

type ItemVente = {
    produit_nom: string;
    categorie_nom: string | null;
    quantite: number;
    prix_unitaire: number;
    total_ligne: number;
};

type Vente = {
    id: string;
    created_at: string;
    total: number;
    paiement: string;
    adherent_nom: string | null;
    items: ItemVente[];
};

type Stats = {
    total: number;
    nb_ventes: number;
    nb_produits: number;
    nb_adherents: number;
    especes: number;
    cb: number;
};

type SessionMeta = {
    nom: string | null;
    opened_at: string;
    closed_at: string | null;
    fond_ouverture: number;
    fond_fermeture: number | null;
    especes_comptees: number | null;
    ecart: number | null;
    notes: string | null;
};

type DetailData = {
    stats: Stats;
    ventes: Vente[];
    session_meta: SessionMeta | null;
};

type ProdGroupe = {
    produit_nom: string;
    categorie_nom: string | null;
    quantite: number;
    total: number;
};

type CatGroupe = {
    categorie_nom: string;
    quantite: number;
    total: number;
    produits: ProdGroupe[];
};

const PAIEMENT_LABELS: Record<string, string> = {
    cb: 'CB', especes: 'Espèces', prepayee: 'Prépayée', gratuite: 'Gratuite',
};

const todayStr = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
})();

function fmtTime(isoStr: string, type: PeriodeType): string {
    const d = new Date(isoStr);
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (type === 'jour' || type === 'session') return time;
    const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `${date} ${time}`;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-lg bg-muted/40 p-3 space-y-0.5">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="font-display text-xl font-semibold tabular-nums">{value}</div>
        </div>
    );
}

export default function Historique() {
    const isAdmin = (usePage().props as any).auth?.isAdmin ?? false;

    // Lire les paramètres URL une seule fois (depuis Dashboard par exemple)
    const urlInit = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        const type = params.get('type') as PeriodeType | null;
        const date = params.get('date');
        if (type && date) return { type, date };
        return null;
    }, []);

    const shouldAutoSelectRef = useRef(!!urlInit);

    const [periodeType, setPeriodeType] = useState<PeriodeType>(urlInit?.type ?? 'jour');
    const [dateDebut, setDateDebut] = useState(urlInit?.date ?? thirtyDaysAgo);
    const [dateFin, setDateFin] = useState(urlInit?.date ?? todayStr);
    const [periodes, setPeriodes] = useState<PeriodeItem[]>([]);
    const [loadingPeriodes, setLoadingPeriodes] = useState(false);
    const [selectedPeriode, setSelectedPeriode] = useState<PeriodeItem | null>(null);
    const [detail, setDetail] = useState<DetailData | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('produits');

    // Si l'utilisateur n'est pas admin, forcer la vue "produits"
    useEffect(() => {
        if (!isAdmin && viewMode === 'detail') setViewMode('produits');
    }, [isAdmin]);

    useEffect(() => {
        setSelectedPeriode(null);
        setDetail(null);
        setLoadingPeriodes(true);
        const params = new URLSearchParams({ type: periodeType });
        if (dateDebut) params.set('date_debut', dateDebut);
        if (dateFin)   params.set('date_fin', dateFin);
        fetch(`/historique/periodes?${params}`)
            .then(r => r.json())
            .then((data: PeriodeItem[]) => {
                setPeriodes(data);
                if (shouldAutoSelectRef.current && data.length > 0) {
                    shouldAutoSelectRef.current = false;
                    const first = data[0];
                    setSelectedPeriode(first);
                    setDetail(null);
                    setLoadingDetail(true);
                    const dp = new URLSearchParams({ type: periodeType, key: first.key });
                    fetch(`/historique/detail?${dp}`)
                        .then(r => r.json())
                        .then(setDetail)
                        .catch(console.error)
                        .finally(() => setLoadingDetail(false));
                }
            })
            .catch(console.error)
            .finally(() => setLoadingPeriodes(false));
    }, [periodeType, dateDebut, dateFin]);

    const loadDetail = (p: PeriodeItem) => {
        setSelectedPeriode(p);
        setDetail(null);
        setLoadingDetail(true);
        const params = new URLSearchParams({ type: periodeType, key: p.key });
        fetch(`/historique/detail?${params}`)
            .then(r => r.json())
            .then(setDetail)
            .catch(console.error)
            .finally(() => setLoadingDetail(false));
    };

    const parProduit = useMemo<ProdGroupe[]>(() => {
        if (!detail) return [];
        const map = new Map<string, ProdGroupe>();
        detail.ventes.forEach(v => v.items.forEach(item => {
            const g = map.get(item.produit_nom) ?? { produit_nom: item.produit_nom, categorie_nom: item.categorie_nom, quantite: 0, total: 0 };
            g.quantite += item.quantite;
            g.total += item.total_ligne;
            map.set(item.produit_nom, g);
        }));
        return [...map.values()].sort((a, b) => b.total - a.total);
    }, [detail]);

    const parCategorie = useMemo<CatGroupe[]>(() => {
        if (!detail) return [];
        const map = new Map<string, { quantite: number; total: number; prods: Map<string, ProdGroupe> }>();
        detail.ventes.forEach(v => v.items.forEach(item => {
            const catKey = item.categorie_nom ?? 'Autre';
            if (!map.has(catKey)) map.set(catKey, { quantite: 0, total: 0, prods: new Map() });
            const cat = map.get(catKey)!;
            cat.quantite += item.quantite;
            cat.total += item.total_ligne;
            const pg = cat.prods.get(item.produit_nom) ?? { produit_nom: item.produit_nom, categorie_nom: catKey, quantite: 0, total: 0 };
            pg.quantite += item.quantite;
            pg.total += item.total_ligne;
            cat.prods.set(item.produit_nom, pg);
        }));
        return [...map.entries()]
            .map(([nom, d]) => ({ categorie_nom: nom, quantite: d.quantite, total: d.total, produits: [...d.prods.values()].sort((a, b) => b.total - a.total) }))
            .sort((a, b) => b.total - a.total);
    }, [detail]);

    return (
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
            <div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold">Historique</h1>
                <p className="text-sm text-muted-foreground mt-1">Historique des ventes et encaissements</p>
            </div>

            {/* Filtres */}
            <Card className="p-4 shadow-soft">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="space-y-1.5">
                        <Label className="text-xs">Regrouper par</Label>
                        <Select value={periodeType} onValueChange={v => setPeriodeType(v as PeriodeType)}>
                            <SelectTrigger className="w-48 h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="session">Session de caisse</SelectItem>
                                <SelectItem value="jour">Journée</SelectItem>
                                <SelectItem value="semaine">Semaine</SelectItem>
                                <SelectItem value="mois">Mois</SelectItem>
                                <SelectItem value="annee">Année</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Du</Label>
                        <Input type="date" className="h-10 w-40" value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Au</Label>
                        <Input type="date" className="h-10 w-40" value={dateFin} onChange={e => setDateFin(e.target.value)} />
                    </div>
                    <Button variant="outline" className="h-10"
                        onClick={() => { setDateDebut(thirtyDaysAgo); setDateFin(todayStr); }}>
                        30 derniers jours
                    </Button>
                    <Button variant="ghost" className="h-10"
                        onClick={() => { setDateDebut(''); setDateFin(''); }}>
                        Tout afficher
                    </Button>
                </div>
            </Card>

            {/* Grille deux colonnes */}
            <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start">

                {/* Liste des périodes */}
                <Card className="shadow-soft overflow-hidden">
                    <div className="p-3 border-b border-border flex items-center gap-2 bg-muted/20">
                        <History className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">
                            {loadingPeriodes ? 'Chargement…' : `${periodes.length} période${periodes.length !== 1 ? 's' : ''}`}
                        </span>
                    </div>
                    <div className="divide-y divide-border overflow-y-auto max-h-[calc(100vh-18rem)]">
                        {loadingPeriodes ? (
                            <div className="p-10 text-center text-muted-foreground">
                                <Loader2 className="size-6 mx-auto animate-spin mb-2 opacity-50" />
                                <p className="text-sm">Chargement…</p>
                            </div>
                        ) : periodes.length === 0 ? (
                            <div className="p-10 text-center text-muted-foreground text-sm">
                                Aucune vente sur cette période
                            </div>
                        ) : periodes.map(p => (
                            <button key={p.key} onClick={() => loadDetail(p)}
                                className={`w-full flex items-center gap-2 px-3 py-3 text-left hover:bg-muted/40 transition-colors ${selectedPeriode?.key === p.key ? 'bg-primary/5 border-l-[3px] border-primary' : 'border-l-[3px] border-transparent'}`}>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{p.label}</div>
                                    {p.sous_label && <div className="text-xs text-muted-foreground">{p.sous_label}</div>}
                                    <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                                        {eur(p.total)} · {p.nb_ventes} vente{p.nb_ventes !== 1 ? 's' : ''}
                                    </div>
                                </div>
                                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Détail */}
                <Card className="shadow-soft overflow-hidden">
                    {!selectedPeriode ? (
                        <div className="min-h-64 grid place-items-center text-muted-foreground py-16">
                            <div className="text-center space-y-2">
                                <History className="size-10 mx-auto opacity-25" />
                                <p className="text-sm">Sélectionnez une période dans la liste</p>
                            </div>
                        </div>
                    ) : loadingDetail ? (
                        <div className="min-h-64 grid place-items-center py-16">
                            <div className="text-center text-muted-foreground space-y-2">
                                <Loader2 className="size-7 mx-auto animate-spin opacity-50" />
                                <p className="text-sm">Chargement…</p>
                            </div>
                        </div>
                    ) : detail ? (
                        <>
                            {/* En-tête stats */}
                            <div className="p-4 border-b border-border space-y-3">
                                <div>
                                    <h2 className="font-semibold">{selectedPeriode.label}</h2>
                                    {selectedPeriode.sous_label && (
                                        <p className="text-xs text-muted-foreground">{selectedPeriode.sous_label}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    <StatCard label="Total encaissé" value={eur(detail.stats.total)} />
                                    <StatCard label="Espèces" value={eur(detail.stats.especes)} />
                                    <StatCard label="Carte bleue" value={eur(detail.stats.cb)} />
                                    <StatCard label="Opérations" value={detail.stats.nb_ventes} />
                                    <StatCard label="Produits vendus" value={detail.stats.nb_produits} />
                                    <StatCard label="Adhérents" value={detail.stats.nb_adherents} />
                                </div>

                                {detail.session_meta && (
                                    <div className="rounded-lg border border-border bg-muted/20 divide-y divide-border text-sm">
                                        {detail.session_meta.nom && (
                                            <div className="px-3 py-2 flex items-center gap-2">
                                                <span className="font-semibold">{detail.session_meta.nom}</span>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-border">
                                            <div className="px-3 py-2">
                                                <div className="text-xs text-muted-foreground">Fond ouverture</div>
                                                <div className="font-medium tabular-nums">{eur(detail.session_meta.fond_ouverture)}</div>
                                            </div>
                                            <div className="px-3 py-2">
                                                <div className="text-xs text-muted-foreground">Fond fermeture</div>
                                                <div className="font-medium tabular-nums">{detail.session_meta.fond_fermeture !== null ? eur(detail.session_meta.fond_fermeture) : '—'}</div>
                                            </div>
                                            <div className="px-3 py-2">
                                                <div className="text-xs text-muted-foreground">Espèces comptées</div>
                                                <div className="font-medium tabular-nums">{detail.session_meta.especes_comptees !== null ? eur(detail.session_meta.especes_comptees) : '—'}</div>
                                            </div>
                                            <div className="px-3 py-2">
                                                <div className="text-xs text-muted-foreground">Écart</div>
                                                {detail.session_meta.ecart !== null ? (
                                                    <div className={`font-semibold tabular-nums ${detail.session_meta.ecart === 0 ? 'text-success' : detail.session_meta.ecart > 0 ? 'text-warning' : 'text-destructive'}`}>
                                                        {detail.session_meta.ecart >= 0 ? '+' : ''}{eur(detail.session_meta.ecart)}
                                                    </div>
                                                ) : <div className="text-muted-foreground">—</div>}
                                            </div>
                                        </div>
                                        {detail.session_meta.notes && (
                                            <div className="px-3 py-2 space-y-0.5">
                                                <div className="text-xs text-muted-foreground">Notes de fermeture</div>
                                                <p className="text-sm whitespace-pre-wrap">{detail.session_meta.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <Tabs value={viewMode} onValueChange={v => setViewMode(v as ViewMode)}>
                                    <TabsList>
                                        {isAdmin && (
                                            <TabsTrigger value="detail" className="text-xs gap-1.5">
                                                <Lock className="size-2.5 opacity-60" />
                                                Détaillé
                                            </TabsTrigger>
                                        )}
                                        <TabsTrigger value="produits" className="text-xs">Par produit</TabsTrigger>
                                        <TabsTrigger value="categories" className="text-xs">Par catégorie</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            {/* Contenu */}
                            <div className="overflow-auto max-h-[calc(100vh-26rem)]">

                                {/* Vue détaillée (admins uniquement) */}
                                {viewMode === 'detail' && (
                                    <div className="divide-y divide-border">
                                        {detail.ventes.map(v => (
                                            <div key={v.id} className="p-3 pl-4 hover:bg-primary/[0.03] border-l-[3px] border-l-primary/20 hover:border-l-primary/50 transition-colors">
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-medium tabular-nums">
                                                            {fmtTime(v.created_at, periodeType)}
                                                        </span>
                                                        {v.adherent_nom && (
                                                            <span className="text-xs text-primary/70 italic flex items-center gap-1">
                                                                <Users className="size-3" />{v.adherent_nom}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Badge variant="outline" className="text-xs">
                                                            {PAIEMENT_LABELS[v.paiement] ?? v.paiement}
                                                        </Badge>
                                                        <span className="font-medium text-sm tabular-nums">{eur(v.total)}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-0.5 pl-2 border-l-2 border-primary/15 ml-1">
                                                    {v.items.map((item, i) => (
                                                        <div key={i} className="flex justify-between text-xs text-muted-foreground italic">
                                                            <span>{item.produit_nom} × {item.quantite}</span>
                                                            <span className="tabular-nums not-italic">{eur(item.total_ligne)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Vue par produit */}
                                {viewMode === 'produits' && (
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0">
                                            <tr>
                                                <th className="text-left px-4 py-2.5 font-medium">Produit</th>
                                                <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">Catégorie</th>
                                                <th className="text-right px-4 py-2.5 font-medium">Qté</th>
                                                <th className="text-right px-4 py-2.5 font-medium">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parProduit.map(p => (
                                                <tr key={p.produit_nom} className="border-t border-border hover:bg-muted/20">
                                                    <td className="px-4 py-2.5 font-medium">{p.produit_nom}</td>
                                                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{p.categorie_nom ?? '—'}</td>
                                                    <td className="px-4 py-2.5 text-right tabular-nums">{p.quantite}</td>
                                                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{eur(p.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {/* Vue par catégorie */}
                                {viewMode === 'categories' && (
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0">
                                            <tr>
                                                <th className="text-left px-4 py-2.5 font-medium">Catégorie / Produit</th>
                                                <th className="text-right px-4 py-2.5 font-medium">Qté</th>
                                                <th className="text-right px-4 py-2.5 font-medium">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parCategorie.map(c => (
                                                <Fragment key={c.categorie_nom}>
                                                    <tr className="border-t border-border bg-muted/30">
                                                        <td className="px-4 py-2.5 font-semibold">{c.categorie_nom}</td>
                                                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{c.quantite}</td>
                                                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{eur(c.total)}</td>
                                                    </tr>
                                                    {c.produits.map(p => (
                                                        <tr key={p.produit_nom} className="border-t border-border/40 hover:bg-muted/10">
                                                            <td className="px-4 py-2 pl-10 text-muted-foreground">{p.produit_nom}</td>
                                                            <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">{p.quantite}</td>
                                                            <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">{eur(p.total)}</td>
                                                        </tr>
                                                    ))}
                                                </Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                            </div>
                        </>
                    ) : null}
                </Card>
            </div>
        </div>
    );
}

Historique.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
