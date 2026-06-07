import { useState, useEffect, useMemo } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft, Loader2, Package, TrendingUp, Coins, BarChart2,
    ChevronDown, ChevronUp, Search,
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { eur, num } from '@/lib/format';
import { THEMES, type ThemeKey } from '@/lib/themes';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// — Types —
type Stats = { nb_refs_vendues: number; quantite_totale: number; ca_total: number; prix_moyen_article: number };
type Produit = { nom: string; categorie: string; couleur: string; quantite: number; ca: number; prix_moyen: number };
type FlopProduit = { nom: string; categorie: string; couleur: string; quantite: number; ca: number };
type CatStat = { categorie: string; couleur: string; nb_refs: number; quantite: number; ca: number; pct_ca: number };
type CatTop = { categorie: string; couleur: string; total_ca: number; produits: { nom: string; quantite: number; ca: number }[] };
type NonVendu = { nom: string; reference: string | null; categorie: string; stock: number; suivi_stock: boolean };
type VentItem = { label: string; quantite: number; ca: number };
type Data = {
    stats: Stats;
    top_volume: Produit[];
    top_ca: Produit[];
    flop_volume: FlopProduit[];
    par_categorie: CatStat[];
    par_categorie_top: CatTop[];
    non_vendus: NonVendu[];
    ventilation: VentItem[];
};

type Session = { id: string; label: string };
type Categorie = { id: string; nom: string };
type Props = { categories: Categorie[]; sessions: Session[] };
type TopTab = 'volume' | 'ca' | 'flop';
type VentMetric = 'ca' | 'quantite';

// — Helpers date —
const todayStr = () => new Date().toISOString().split('T')[0];
const subDays   = (n: number) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];
const subMonths = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().split('T')[0]; };
const subYears  = (n: number) => { const d = new Date(); d.setFullYear(d.getFullYear() - n); return d.toISOString().split('T')[0]; };

const SHORTCUTS = [
    { label: '7 jours',            debut: () => subDays(7),    fin: todayStr },
    { label: '30 jours',           debut: () => subDays(30),   fin: todayStr },
    { label: '6 mois',             debut: () => subMonths(6),  fin: todayStr },
    { label: '1 an',               debut: () => subYears(1),   fin: todayStr },
    { label: "Depuis l'ouverture", debut: () => '',             fin: () => '' },
];

const VENT_LABELS: Record<VentMetric, string> = { ca: 'CA (€)', quantite: 'Quantité' };

function RankBar({ value, max, color }: { value: number; max: number; color?: string }) {
    const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
    return (
        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color || 'hsl(var(--primary))' }} />
        </div>
    );
}

function ColorDot({ color }: { color: string }) {
    return <span className="inline-block size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />;
}

export default function AnalyseProduits({ categories, sessions }: Props) {
    const { couleurTheme: themeKey } = usePage().props as any;

    const chartColor = useMemo(() => {
        const t = THEMES[(themeKey as ThemeKey)] ?? THEMES['rusty-nail'];
        return `hsl(${t.vars['--primary']})`;
    }, [themeKey]);

    // ── Filtres UI ──
    const [mode, setMode]                     = useState<'periode' | 'session'>('periode');
    const [dateDebutInput, setDateDebutInput] = useState(subDays(30));
    const [dateFinInput, setDateFinInput]     = useState(todayStr());
    const [sessionId, setSessionId]           = useState('');
    const [ventilation, setVentilation]       = useState<'none' | 'jour' | 'mois'>('none');
    const [categorieId, setCategorieId]       = useState('');

    // ── Filtres confirmés ──
    const [activeDebut, setActiveDebut] = useState(subDays(30));
    const [activeFin, setActiveFin]     = useState(todayStr());

    // ── État résultats ──
    const [data, setData]               = useState<Data | null>(null);
    const [loading, setLoading]         = useState(false);
    const [topTab, setTopTab]           = useState<TopTab>('volume');
    const [ventMetric, setVentMetric]   = useState<VentMetric>('ca');
    const [showNonVendus, setShowNonVendus] = useState(false);
    const [expandedCat, setExpandedCat] = useState<string | null>(null);

    useEffect(() => {
        if (mode === 'session' && !sessionId) { setData(null); return; }

        const controller = new AbortController();
        const params = new URLSearchParams();

        if (mode === 'session') {
            params.set('session_id', sessionId);
        } else {
            if (activeDebut) params.set('date_debut', activeDebut);
            if (activeFin)   params.set('date_fin', activeFin);
        }
        if (ventilation !== 'none') params.set('ventilation', ventilation);
        if (categorieId) params.set('categorie_id', categorieId);

        setLoading(true);
        fetch(`/admin/analyse/produits/data?${params}`, { signal: controller.signal })
            .then(res => res.ok ? res.json() : null)
            .then(json => { if (json) setData(json); })
            .catch(e => { if (e.name !== 'AbortError') console.error(e); })
            .finally(() => setLoading(false));

        return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, activeDebut, activeFin, sessionId, ventilation, categorieId]);

    const applyShortcut = (s: typeof SHORTCUTS[0]) => {
        const debut = s.debut(); const fin = s.fin();
        setMode('periode');
        setDateDebutInput(debut); setDateFinInput(fin);
        setActiveDebut(debut);   setActiveFin(fin);
    };

    const handleSearch = () => { setActiveDebut(dateDebutInput); setActiveFin(dateFinInput); };
    const datesModifiees = dateDebutInput !== activeDebut || dateFinInput !== activeFin;

    const maxTopVol = data?.top_volume[0]?.quantite ?? 1;
    const maxTopCA  = data?.top_ca[0]?.ca ?? 1;
    const maxFlop   = data?.flop_volume.length ? Math.max(...(data?.flop_volume ?? []).map(r => r.quantite)) : 1;

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1100px] mx-auto">
            {/* En-tête */}
            <div>
                <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
                    <ArrowLeft className="size-4" />
                    Administration
                </Link>
                <h1 className="font-display text-2xl md:text-3xl font-semibold">Analyse des produits</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Performance des produits : ventes, rotations et répartition par catégorie.
                </p>
            </div>

            {/* Filtres */}
            <Card className="p-5 space-y-4">
                <div className="flex gap-2">
                    <Button type="button" variant={mode === 'periode' ? 'default' : 'outline'} size="sm" onClick={() => setMode('periode')}>Par période</Button>
                    <Button type="button" variant={mode === 'session' ? 'default' : 'outline'} size="sm" onClick={() => setMode('session')}>Par session</Button>
                </div>

                {mode === 'periode' ? (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                            {SHORTCUTS.map(s => (
                                <Button key={s.label} type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => applyShortcut(s)}>
                                    {s.label}
                                </Button>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex items-center gap-2">
                                <Label className="text-sm whitespace-nowrap">Du</Label>
                                <Input type="date" value={dateDebutInput} onChange={e => setDateDebutInput(e.target.value)} className="w-40 text-sm" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-sm whitespace-nowrap">Au</Label>
                                <Input type="date" value={dateFinInput} onChange={e => setDateFinInput(e.target.value)} className="w-40 text-sm" />
                            </div>
                            <Button type="button" variant={datesModifiees ? 'default' : 'outline'} size="sm" className="gap-1.5" onClick={handleSearch}>
                                <Search className="size-3.5" />
                                Analyser
                            </Button>
                        </div>
                        {datesModifiees && (
                            <p className="text-xs text-muted-foreground">
                                Résultats affichés pour :{' '}
                                <span className="font-medium">
                                    {activeDebut || 'toute la période'}{activeFin ? ` → ${activeFin}` : ''}
                                </span>
                                {' '}— cliquez <strong>Analyser</strong> pour appliquer les nouvelles dates.
                            </p>
                        )}
                    </div>
                ) : (
                    sessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune session fermée disponible.</p>
                    ) : (
                        <Select value={sessionId} onValueChange={setSessionId}>
                            <SelectTrigger className="w-80">
                                <SelectValue placeholder="Choisir une session…" />
                            </SelectTrigger>
                            <SelectContent>
                                {sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )
                )}

                {/* Filtres secondaires */}
                <div className="border-t pt-4 flex flex-wrap gap-6 items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium whitespace-nowrap">Ventilation :</span>
                        <div className="flex gap-1">
                            {(['none', 'jour', 'mois'] as const).map(v => (
                                <Button key={v} type="button" variant={ventilation === v ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setVentilation(v)}>
                                    {v === 'none' ? 'Aucune' : v === 'jour' ? 'Par jour' : 'Par mois'}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium whitespace-nowrap">Catégorie :</span>
                        <Select value={categorieId || '__all__'} onValueChange={v => setCategorieId(v === '__all__' ? '' : v)}>
                            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">Toutes les catégories</SelectItem>
                                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Chargement */}
            {loading && (
                <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm">Calcul en cours…</span>
                </div>
            )}

            {!loading && !data && mode === 'session' && (
                <div className="text-center py-10 text-muted-foreground text-sm">
                    Sélectionnez une session pour afficher les analyses.
                </div>
            )}

            {!loading && data && (
                <>
                    {/* KPI */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-5">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Package className="size-4" />
                                <span className="text-xs font-medium">Références vendues</span>
                            </div>
                            <div className="text-2xl font-display font-semibold">{num(data.stats.nb_refs_vendues)}</div>
                        </Card>
                        <Card className="p-5">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <BarChart2 className="size-4" />
                                <span className="text-xs font-medium">Articles vendus</span>
                            </div>
                            <div className="text-2xl font-display font-semibold">{num(data.stats.quantite_totale)}</div>
                        </Card>
                        <Card className="p-5">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <TrendingUp className="size-4" />
                                <span className="text-xs font-medium">CA total</span>
                            </div>
                            <div className="text-2xl font-display font-semibold text-primary">{eur(data.stats.ca_total)}</div>
                        </Card>
                        <Card className="p-5">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Coins className="size-4" />
                                <span className="text-xs font-medium">Prix moyen / article</span>
                            </div>
                            <div className="text-2xl font-display font-semibold text-primary">{eur(data.stats.prix_moyen_article)}</div>
                        </Card>
                    </div>

                    {data.stats.quantite_totale === 0 && (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                            Aucune vente enregistrée sur cette période.
                        </div>
                    )}

                    {data.stats.quantite_totale > 0 && (
                        <>
                            {/* Ventilation temporelle */}
                            {ventilation !== 'none' && data.ventilation.length > 0 && (
                                <Card className="p-5">
                                    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                                        <h2 className="font-display font-semibold">
                                            {ventilation === 'jour' ? 'Répartition par jour de la semaine' : 'Évolution mensuelle'}
                                        </h2>
                                        <div className="flex gap-1">
                                            {(Object.keys(VENT_LABELS) as VentMetric[]).map(m => (
                                                <Button key={m} type="button" variant={ventMetric === m ? 'default' : 'outline'} size="sm" className="text-xs h-7" onClick={() => setVentMetric(m)}>
                                                    {VENT_LABELS[m]}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <BarChart data={data.ventilation} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={48}
                                                tickFormatter={v => ventMetric === 'quantite' ? String(v) : `${v}€`} />
                                            <Tooltip
                                                formatter={(v: number) => [ventMetric === 'quantite' ? num(v) : eur(v), VENT_LABELS[ventMetric]]}
                                                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                                            />
                                            <Bar dataKey={ventMetric} fill={chartColor} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>

                                    {data.ventilation.length > 1 && (
                                        <div className="mt-4 border-t pt-4 overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-xs text-muted-foreground">
                                                        <th className="pb-2 font-medium pr-4">{ventilation === 'jour' ? 'Jour' : 'Mois'}</th>
                                                        <th className="pb-2 font-medium pr-4 text-right">Articles</th>
                                                        <th className="pb-2 font-medium text-right">CA</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/50">
                                                    {data.ventilation.map((v, i) => (
                                                        <tr key={i}>
                                                            <td className="py-1.5 pr-4 font-medium">{v.label}</td>
                                                            <td className="py-1.5 pr-4 text-right">{num(v.quantite)}</td>
                                                            <td className="py-1.5 text-right">{eur(v.ca)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </Card>
                            )}

                            {/* Répartition par catégorie */}
                            {data.par_categorie.length > 0 && (
                                <Card className="p-5">
                                    <h2 className="font-display font-semibold mb-4">Répartition par catégorie</h2>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Graphique en barres horizontales */}
                                        <div className="space-y-2">
                                            {data.par_categorie.map(cat => (
                                                <div key={cat.categorie} className="space-y-0.5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <ColorDot color={cat.couleur} />
                                                            <span className="truncate font-medium">{cat.categorie}</span>
                                                        </div>
                                                        <span className="text-muted-foreground shrink-0 ml-2">{cat.pct_ca}%</span>
                                                    </div>
                                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all"
                                                            style={{ width: `${cat.pct_ca}%`, backgroundColor: cat.couleur }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Tableau récapitulatif */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-xs text-muted-foreground border-b">
                                                        <th className="pb-2 font-medium pr-3">Catégorie</th>
                                                        <th className="pb-2 font-medium pr-3 text-right">Réfs</th>
                                                        <th className="pb-2 font-medium pr-3 text-right">Qté</th>
                                                        <th className="pb-2 font-medium text-right">CA</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/50">
                                                    {data.par_categorie.map(cat => (
                                                        <tr key={cat.categorie}>
                                                            <td className="py-1.5 pr-3">
                                                                <div className="flex items-center gap-1.5">
                                                                    <ColorDot color={cat.couleur} />
                                                                    <span className="truncate">{cat.categorie}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-1.5 pr-3 text-right text-muted-foreground">{cat.nb_refs}</td>
                                                            <td className="py-1.5 pr-3 text-right">{num(cat.quantite)}</td>
                                                            <td className="py-1.5 text-right font-medium">{eur(cat.ca)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* Top 5 produits par catégorie */}
                            {data.par_categorie_top.length > 0 && (
                                <Card className="p-5">
                                    <h2 className="font-display font-semibold mb-4">Top produits par catégorie</h2>
                                    <div className="space-y-2">
                                        {data.par_categorie_top.map(cat => {
                                            const isOpen = expandedCat === cat.categorie;
                                            return (
                                                <div key={cat.categorie} className="border rounded-xl overflow-hidden">
                                                    <button
                                                        type="button"
                                                        className="flex items-center justify-between w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
                                                        onClick={() => setExpandedCat(isOpen ? null : cat.categorie)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <ColorDot color={cat.couleur} />
                                                            <span className="font-medium text-sm">{cat.categorie}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-semibold text-primary">{eur(cat.total_ca)}</span>
                                                            {isOpen
                                                                ? <ChevronUp className="size-4 text-muted-foreground" />
                                                                : <ChevronDown className="size-4 text-muted-foreground" />}
                                                        </div>
                                                    </button>
                                                    {isOpen && (
                                                        <div className="border-t px-4 py-3 bg-muted/20 space-y-1.5">
                                                            {cat.produits.map((p, i) => (
                                                                <div key={i} className="flex items-center gap-3 text-sm">
                                                                    <span className="text-muted-foreground w-4 text-right shrink-0">{i + 1}.</span>
                                                                    <span className="flex-1 truncate">{p.nom}</span>
                                                                    <span className="text-muted-foreground shrink-0">{num(p.quantite)} art.</span>
                                                                    <span className="font-medium shrink-0 min-w-[64px] text-right">{eur(p.ca)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            )}

                            {/* Top / Flop produits */}
                            <Card className="p-5">
                                <h2 className="font-display font-semibold mb-4">Classement des produits</h2>
                                <div className="flex gap-1 mb-5 border-b pb-3 flex-wrap">
                                    {([
                                        { key: 'volume' as TopTab, label: 'Top 20 par quantité' },
                                        { key: 'ca' as TopTab,     label: 'Top 20 par CA' },
                                        { key: 'flop' as TopTab,   label: 'Flop 10 (peu vendus)' },
                                    ]).map(t => (
                                        <Button key={t.key} type="button" variant={topTab === t.key ? 'default' : 'ghost'} size="sm" onClick={() => setTopTab(t.key)}>
                                            {t.label}
                                        </Button>
                                    ))}
                                </div>

                                {topTab === 'volume' && (
                                    <div className="space-y-2">
                                        {data.top_volume.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
                                        ) : data.top_volume.map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 py-1">
                                                <span className="text-sm font-medium text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                                                <ColorDot color={item.couleur} />
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-medium">{item.nom}</span>
                                                    <span className="text-xs text-muted-foreground ml-1.5">{item.categorie}</span>
                                                </div>
                                                <RankBar value={item.quantite} max={maxTopVol} color={item.couleur} />
                                                <div className="text-right min-w-[90px] shrink-0">
                                                    <div className="text-sm font-semibold">{num(item.quantite)} art.</div>
                                                    <div className="text-xs text-muted-foreground">{eur(item.ca)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {topTab === 'ca' && (
                                    <div className="space-y-2">
                                        {data.top_ca.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
                                        ) : data.top_ca.map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 py-1">
                                                <span className="text-sm font-medium text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                                                <ColorDot color={item.couleur} />
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-medium">{item.nom}</span>
                                                    <span className="text-xs text-muted-foreground ml-1.5">{item.categorie}</span>
                                                </div>
                                                <RankBar value={item.ca} max={maxTopCA} color={item.couleur} />
                                                <div className="text-right min-w-[90px] shrink-0">
                                                    <div className="text-sm font-semibold">{eur(item.ca)}</div>
                                                    <div className="text-xs text-muted-foreground">{num(item.quantite)} art.</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {topTab === 'flop' && (
                                    <div className="space-y-2">
                                        {data.flop_volume.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Aucun produit peu vendu trouvé.</p>
                                        ) : data.flop_volume.map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 py-1">
                                                <span className="text-sm font-medium text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                                                <ColorDot color={item.couleur} />
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-medium">{item.nom}</span>
                                                    <span className="text-xs text-muted-foreground ml-1.5">{item.categorie}</span>
                                                </div>
                                                <RankBar value={item.quantite} max={maxFlop} color={item.couleur} />
                                                <div className="text-right min-w-[90px] shrink-0">
                                                    <div className="text-sm font-semibold">{num(item.quantite)} art.</div>
                                                    <div className="text-xs text-muted-foreground">{eur(item.ca)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </>
                    )}

                    {/* Produits non vendus */}
                    <Card className="p-5">
                        <button
                            type="button"
                            className="flex items-center justify-between w-full text-left gap-4"
                            onClick={() => setShowNonVendus(s => !s)}
                        >
                            <div>
                                <h2 className="font-display font-semibold">Produits actifs non vendus</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {data.non_vendus.length === 0
                                        ? 'Tous les produits actifs ont été vendus sur la période.'
                                        : `${data.non_vendus.length} produit${data.non_vendus.length > 1 ? 's' : ''} sans vente enregistrée`}
                                </p>
                            </div>
                            {data.non_vendus.length > 0 && (
                                showNonVendus
                                    ? <ChevronUp className="size-5 text-muted-foreground shrink-0" />
                                    : <ChevronDown className="size-5 text-muted-foreground shrink-0" />
                            )}
                        </button>

                        {showNonVendus && data.non_vendus.length > 0 && (
                            <div className="mt-4 border-t pt-4 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-muted-foreground border-b">
                                            <th className="pb-2 font-medium pr-4">Produit</th>
                                            <th className="pb-2 font-medium pr-4">Catégorie</th>
                                            <th className="pb-2 font-medium text-right">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {data.non_vendus.map((p, i) => (
                                            <tr key={i}>
                                                <td className="py-1.5 pr-4">
                                                    <span className="font-medium">{p.nom}</span>
                                                    {p.reference && <span className="text-muted-foreground ml-1.5 text-xs">{p.reference}</span>}
                                                </td>
                                                <td className="py-1.5 pr-4 text-muted-foreground">{p.categorie}</td>
                                                <td className="py-1.5 text-right">
                                                    {p.suivi_stock ? num(p.stock) : <span className="text-muted-foreground">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}

AnalyseProduits.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
