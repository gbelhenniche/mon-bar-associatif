import { useState, useEffect, useMemo } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft, Loader2, Package, AlertTriangle, RefreshCw, TrendingDown, Search, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
    ScatterChart, Scatter, ReferenceLine, ReferenceArea,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { num } from '@/lib/format';
import { THEMES, type ThemeKey } from '@/lib/themes';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// ── Types ──────────────────────────────────────────────────────────────────────
type Kpis = { nb_produits_suivis: number; nb_en_rupture: number; nb_sous_minimum: number; nb_reappros_periode: number; nb_jours: number };
type Reappro = { produit_id: string; nom: string; categorie: string; couleur: string; total_entre: number; nb_reappros: number; intervalle_moyen: number | null };
type Conso = { produit_id: string; nom: string; categorie: string; couleur: string; total_sorti: number; taux_journalier: number };
type Risque = { nom: string; categorie: string; couleur: string; stock_actuel: number; stock_minimum: number; taux_journalier: number; jours_avant_rupture: number };
type ScatterPoint = { nom: string; categorie: string; couleur: string; x: number; y: number };
type VentItem = { label: string; entrees: number; sorties: number };
type Data = { kpis: Kpis; top_reappros: Reappro[]; top_conso: Conso[]; risques: Risque[]; scatter: ScatterPoint[]; ventilation: VentItem[] };
type Session = { id: string; label: string; debut: string; fin: string };
type Categorie = { id: string; nom: string };
type Props = { categories: Categorie[]; sessions: Session[] };

// ── Helpers ────────────────────────────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().split('T')[0];
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

const VERT_COLOR = '#22c55e'; // entrées (restock)

function ColorDot({ color }: { color: string }) {
    return <span className="inline-block size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />;
}

function urgencyClasses(jours: number) {
    if (jours <= 0)  return { badge: 'bg-destructive text-destructive-foreground',   row: 'bg-destructive/5' };
    if (jours <= 7)  return { badge: 'bg-destructive/90 text-destructive-foreground', row: 'bg-destructive/3' };
    if (jours <= 30) return { badge: 'bg-warning text-warning-foreground',           row: 'bg-warning/5' };
    return              { badge: 'bg-success/20 text-success',                       row: '' };
}

function HBarChart({ data, dataKey, color, formatter }: {
    data: any[];
    dataKey: string;
    color: string;
    formatter: (v: number) => string;
}) {
    const h = Math.max(data.length * 34, 120);
    return (
        <ResponsiveContainer width="100%" height={h}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
                    tickFormatter={formatter} />
                <YAxis type="category" dataKey="nom" width={150} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 22) + '…' : v} />
                <Tooltip
                    formatter={(v: number) => [formatter(v)]}
                    labelFormatter={(label: string) => label}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                />
                <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

function ScatterTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as ScatterPoint;
    return (
        <div className="text-xs rounded-lg border border-border bg-card p-2.5 shadow space-y-0.5 max-w-[200px]">
            <div className="font-medium text-sm truncate">{d.nom}</div>
            <div className="text-muted-foreground">{d.categorie}</div>
            <div className="mt-1 pt-1 border-t border-border/50 space-y-0.5">
                <div>Conso : <span className="font-medium">{d.x.toFixed(2)} u/j</span></div>
                <div>Réappro ttes les : <span className="font-medium">{d.y.toFixed(1)} j</span></div>
            </div>
        </div>
    );
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function AnalyseStocks({ categories, sessions }: Props) {
    const { couleurTheme: themeKey } = usePage().props as any;
    const chartColor = useMemo(() => {
        const t = THEMES[(themeKey as ThemeKey)] ?? THEMES['rusty-nail'];
        return `hsl(${t.vars['--primary']})`;
    }, [themeKey]);

    // Filtres UI
    const [mode, setMode]                     = useState<'periode' | 'session'>('periode');
    const [dateDebutInput, setDateDebutInput] = useState(subDays(30));
    const [dateFinInput, setDateFinInput]     = useState(todayStr());
    const [sessionId, setSessionId]           = useState('');
    const [ventilation, setVentilation]       = useState<'none' | 'jour' | 'mois'>('none');
    const [categorieId, setCategorieId]       = useState('');

    // Filtres confirmés
    const [activeDebut, setActiveDebut] = useState(subDays(30));
    const [activeFin, setActiveFin]     = useState(todayStr());

    // État résultats
    const [data, setData]             = useState<Data | null>(null);
    const [loading, setLoading]       = useState(false);
    const [showRisques, setShowRisques] = useState(true);
    const [showScatter, setShowScatter] = useState(false);

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
        fetch(`/admin/analyse/stocks/data?${params}`, { signal: controller.signal })
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

    // Scatter medians & extents
    const scatterExtents = useMemo(() => {
        const pts = data?.scatter ?? [];
        if (!pts.length) return { medX: 0, medY: 0 };
        const xs = [...pts.map(d => d.x)].sort((a, b) => a - b);
        const ys = [...pts.map(d => d.y)].sort((a, b) => a - b);
        return {
            medX: xs[Math.floor(xs.length / 2)] ?? 0,
            medY: ys[Math.floor(ys.length / 2)] ?? 0,
        };
    }, [data?.scatter]);

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1100px] mx-auto">

            {/* En-tête */}
            <div>
                <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
                    <ArrowLeft className="size-4" />
                    Administration
                </Link>
                <h1 className="font-display text-2xl md:text-3xl font-semibold">Analyse des stocks</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Fréquence de réapprovisionnement, vitesse de consommation et produits à risque.
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
                            <SelectTrigger className="w-80"><SelectValue placeholder="Choisir une session…" /></SelectTrigger>
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
                    {/* KPI cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-5">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Package className="size-4" />
                                <span className="text-xs font-medium">Produits suivis</span>
                            </div>
                            <div className="text-2xl font-display font-semibold">{num(data.kpis.nb_produits_suivis)}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">avec suivi de stock</div>
                        </Card>
                        <Card className={`p-5 ${data.kpis.nb_en_rupture > 0 ? 'border-destructive/40 bg-destructive/5' : ''}`}>
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <AlertTriangle className={`size-4 ${data.kpis.nb_en_rupture > 0 ? 'text-destructive' : ''}`} />
                                <span className="text-xs font-medium">En rupture</span>
                            </div>
                            <div className={`text-2xl font-display font-semibold ${data.kpis.nb_en_rupture > 0 ? 'text-destructive' : ''}`}>
                                {num(data.kpis.nb_en_rupture)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">stock ≤ 0</div>
                        </Card>
                        <Card className={`p-5 ${data.kpis.nb_sous_minimum > 0 ? 'border-warning/40 bg-warning/5' : ''}`}>
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <TrendingDown className={`size-4 ${data.kpis.nb_sous_minimum > 0 ? 'text-warning' : ''}`} />
                                <span className="text-xs font-medium">Sous seuil min.</span>
                            </div>
                            <div className={`text-2xl font-display font-semibold ${data.kpis.nb_sous_minimum > 0 ? 'text-warning' : ''}`}>
                                {num(data.kpis.nb_sous_minimum)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">stock {'<'} minimum</div>
                        </Card>
                        <Card className="p-5">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <RefreshCw className="size-4" />
                                <span className="text-xs font-medium">Réappros sur la période</span>
                            </div>
                            <div className="text-2xl font-display font-semibold">{num(data.kpis.nb_reappros_periode)}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">sur {num(data.kpis.nb_jours)} jour{data.kpis.nb_jours > 1 ? 's' : ''}</div>
                        </Card>
                    </div>

                    {/* Produits à risque */}
                    <Card className="p-5">
                        <button
                            type="button"
                            className="flex items-center justify-between w-full text-left gap-4"
                            onClick={() => setShowRisques(s => !s)}
                        >
                            <div>
                                <h2 className="font-display font-semibold flex items-center gap-2">
                                    <AlertTriangle className="size-4 text-warning" />
                                    Produits à risque de rupture
                                </h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {data.risques.length === 0
                                        ? 'Aucun produit à risque détecté sur la période.'
                                        : `${data.risques.length} produit${data.risques.length > 1 ? 's' : ''} — estimation basée sur le rythme de consommation observé`}
                                </p>
                            </div>
                            {data.risques.length > 0 && (
                                showRisques
                                    ? <ChevronUp className="size-5 text-muted-foreground shrink-0" />
                                    : <ChevronDown className="size-5 text-muted-foreground shrink-0" />
                            )}
                        </button>

                        {showRisques && data.risques.length > 0 && (
                            <div className="mt-4 border-t pt-4 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-muted-foreground border-b">
                                            <th className="pb-2 font-medium pr-3">Produit</th>
                                            <th className="pb-2 font-medium pr-3">Catégorie</th>
                                            <th className="pb-2 font-medium pr-3 text-right">Stock actuel</th>
                                            <th className="pb-2 font-medium pr-3 text-right">Seuil min.</th>
                                            <th className="pb-2 font-medium pr-3 text-right">Conso/jour</th>
                                            <th className="pb-2 font-medium text-right">Jours restants</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {data.risques.map((r, i) => {
                                            const u = urgencyClasses(r.jours_avant_rupture);
                                            return (
                                                <tr key={i} className={u.row}>
                                                    <td className="py-2 pr-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <ColorDot color={r.couleur} />
                                                            <span className="font-medium">{r.nom}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 pr-3 text-muted-foreground text-xs">{r.categorie}</td>
                                                    <td className="py-2 pr-3 text-right">{num(r.stock_actuel)}</td>
                                                    <td className="py-2 pr-3 text-right text-muted-foreground">{num(r.stock_minimum)}</td>
                                                    <td className="py-2 pr-3 text-right text-muted-foreground">{r.taux_journalier.toFixed(2)}</td>
                                                    <td className="py-2 text-right">
                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.badge}`}>
                                                            {r.jours_avant_rupture <= 0 ? 'Rupture' : `~${r.jours_avant_rupture} j`}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <p className="text-xs text-muted-foreground mt-3">
                                    Estimation = stock actuel ÷ consommation quotidienne moyenne sur la période sélectionnée.
                                </p>
                            </div>
                        )}
                    </Card>

                    {/* Ventilation temporelle */}
                    {ventilation !== 'none' && data.ventilation.length > 0 && (
                        <Card className="p-5">
                            <h2 className="font-display font-semibold mb-1">
                                {ventilation === 'jour' ? 'Mouvements par jour de la semaine' : 'Mouvements par mois'}
                            </h2>
                            <p className="text-sm text-muted-foreground mb-4">Entrées en stock (réappros) vs sorties (ventes + retraits).</p>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={data.ventilation} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
                                    <Tooltip
                                        formatter={(v: number, name: string) => [num(v), name === 'entrees' ? 'Entrées' : 'Sorties']}
                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                                    />
                                    <Bar dataKey="entrees" name="Entrées"  fill={VERT_COLOR}  radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="sorties" name="Sorties"  fill={chartColor}  radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: VERT_COLOR }} />Entrées (réappros)</span>
                                <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: chartColor }} />Sorties (ventes + retraits)</span>
                            </div>
                        </Card>
                    )}

                    {/* Vitesse de consommation */}
                    {data.top_conso.length > 0 && (
                        <Card className="p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingDown className="size-4 text-primary" />
                                <h2 className="font-display font-semibold">Vitesse de consommation — Top 15</h2>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                                Consommation quotidienne moyenne (unités/jour) sur la période.
                            </p>
                            <HBarChart
                                data={data.top_conso}
                                dataKey="taux_journalier"
                                color={chartColor}
                                formatter={(v: number) => `${v.toFixed(2)} u/j`}
                            />
                            <div className="mt-4 border-t pt-4 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-muted-foreground">
                                            <th className="pb-2 font-medium pr-4">Produit</th>
                                            <th className="pb-2 font-medium pr-4">Catégorie</th>
                                            <th className="pb-2 font-medium pr-4 text-right">Total sorti</th>
                                            <th className="pb-2 font-medium text-right">Conso/jour</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {data.top_conso.map((c, i) => (
                                            <tr key={i}>
                                                <td className="py-1.5 pr-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-muted-foreground w-4 text-right shrink-0 text-xs">{i + 1}.</span>
                                                        <ColorDot color={c.couleur} />
                                                        <span className="font-medium">{c.nom}</span>
                                                    </div>
                                                </td>
                                                <td className="py-1.5 pr-4 text-muted-foreground text-xs">{c.categorie}</td>
                                                <td className="py-1.5 pr-4 text-right">{num(c.total_sorti)}</td>
                                                <td className="py-1.5 text-right font-medium">{c.taux_journalier.toFixed(2)} u/j</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* Fréquence de réapprovisionnement */}
                    {data.top_reappros.length > 0 && (
                        <Card className="p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <RefreshCw className="size-4 text-primary" />
                                <h2 className="font-display font-semibold">Fréquence de réapprovisionnement — Top 15</h2>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                                Nombre d'entrées en stock enregistrées sur la période.
                            </p>
                            <HBarChart
                                data={data.top_reappros}
                                dataKey="nb_reappros"
                                color={VERT_COLOR}
                                formatter={(v: number) => `${num(v)} réappro${v > 1 ? 's' : ''}`}
                            />
                            <div className="mt-4 border-t pt-4 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-muted-foreground">
                                            <th className="pb-2 font-medium pr-4">Produit</th>
                                            <th className="pb-2 font-medium pr-4">Catégorie</th>
                                            <th className="pb-2 font-medium pr-4 text-right">Nb réappros</th>
                                            <th className="pb-2 font-medium pr-4 text-right">Qté reçue</th>
                                            <th className="pb-2 font-medium text-right">Intervalle moy.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {data.top_reappros.map((r, i) => (
                                            <tr key={i}>
                                                <td className="py-1.5 pr-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-muted-foreground w-4 text-right shrink-0 text-xs">{i + 1}.</span>
                                                        <ColorDot color={r.couleur} />
                                                        <span className="font-medium">{r.nom}</span>
                                                    </div>
                                                </td>
                                                <td className="py-1.5 pr-4 text-muted-foreground text-xs">{r.categorie}</td>
                                                <td className="py-1.5 pr-4 text-right font-medium">{r.nb_reappros}</td>
                                                <td className="py-1.5 pr-4 text-right">{num(r.total_entre)}</td>
                                                <td className="py-1.5 text-right text-muted-foreground">
                                                    {r.intervalle_moyen !== null ? `~${r.intervalle_moyen} j` : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Intervalle moyen = durée de la période ÷ nombre de réapprovisionnements (affiché si ≥ 2 réappros).
                                </p>
                            </div>
                        </Card>
                    )}

                    {/* Scatter : consommation × fréquence réappro */}
                    {data.scatter.length >= 2 && (
                        <Card className="p-5">
                            <button
                                type="button"
                                className="flex items-center justify-between w-full text-left gap-4"
                                onClick={() => setShowScatter(s => !s)}
                            >
                                <div>
                                    <h2 className="font-display font-semibold">Carte risque : consommation × réapprovisionnement</h2>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        {data.scatter.length} produit{data.scatter.length > 1 ? 's' : ''} avec données complètes.
                                        La zone en haut à droite signale les produits à surveiller.
                                    </p>
                                </div>
                                {showScatter
                                    ? <ChevronUp className="size-5 text-muted-foreground shrink-0" />
                                    : <ChevronDown className="size-5 text-muted-foreground shrink-0" />}
                            </button>

                            {showScatter && (
                                <div className="mt-4 border-t pt-4">
                                    <ResponsiveContainer width="100%" height={320}>
                                        <ScatterChart margin={{ top: 16, right: 24, left: 0, bottom: 16 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis
                                                type="number" dataKey="x"
                                                name="Conso/jour"
                                                label={{ value: 'Consommation (u/j) →', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                                axisLine={false} tickLine={false}
                                            />
                                            <YAxis
                                                type="number" dataKey="y"
                                                name="Intervalle réappro"
                                                label={{ value: '↑ Intervalle réappro (j)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                                axisLine={false} tickLine={false} width={48}
                                            />
                                            <Tooltip content={<ScatterTooltip />} />
                                            {/* Zone de risque : forte conso + réappros rares */}
                                            <ReferenceArea
                                                x1={scatterExtents.medX} y1={scatterExtents.medY}
                                                fillOpacity={0.07} fill="hsl(var(--destructive))"
                                            />
                                            <ReferenceLine x={scatterExtents.medX} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 2" strokeOpacity={0.5} />
                                            <ReferenceLine y={scatterExtents.medY} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 2" strokeOpacity={0.5} />
                                            <Scatter
                                                data={data.scatter}
                                                shape={(props: any) => {
                                                    const { cx, cy, payload } = props;
                                                    return <circle cx={cx} cy={cy} r={6} fill={payload.couleur} fillOpacity={0.8} stroke={payload.couleur} strokeWidth={1} />;
                                                }}
                                            />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                        <div className="rounded-lg border border-border/50 px-3 py-2">
                                            <span className="font-medium text-foreground">↗ Haut-droite (zone rouge)</span><br />
                                            Forte consommation, réappros rares → <span className="text-destructive font-medium">risque élevé</span>
                                        </div>
                                        <div className="rounded-lg border border-border/50 px-3 py-2">
                                            <span className="font-medium text-foreground">↘ Bas-droite</span><br />
                                            Forte consommation, réappros fréquents → bien géré
                                        </div>
                                        <div className="rounded-lg border border-border/50 px-3 py-2">
                                            <span className="font-medium text-foreground">↖ Haut-gauche</span><br />
                                            Faible consommation, réappros rares → rotation lente
                                        </div>
                                        <div className="rounded-lg border border-border/50 px-3 py-2">
                                            <span className="font-medium text-foreground">↙ Bas-gauche</span><br />
                                            Faible consommation, réappros fréquents → sur-géré
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}

AnalyseStocks.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
