import { useState, useEffect, useMemo } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft, Loader2, Users, ShoppingCart, TrendingUp, Coins,
    ChevronDown, ChevronUp, Search,
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { eur, num } from '@/lib/format';
import { THEMES, type ThemeKey } from '@/lib/themes';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// — Types —
type Stats = { nb_adherents: number; nb_ventes: number; ca_total: number; panier_moyen: number };
type TypeStat = { type: string; nb_ventes: number; total: number; panier_moyen: number };
type TopMontant = { nom: string; numero: number | null; total: number; nb_ventes: number };
type TopVolume = { nom: string; numero: number | null; volume: number };
type TopFrequence = { nom: string; numero: number | null; nb_jours: number; total: number };
type Absent = { nom: string; numero: number; type: string | null };
type VentItem = { label: string; nb_ventes: number; total: number; nb_adherents: number; panier_moyen: number };
type Data = {
    stats: Stats;
    panier_par_type: TypeStat[];
    top_montant: TopMontant[];
    top_volume: TopVolume[];
    top_frequence: TopFrequence[];
    absents: Absent[];
    ventilation: VentItem[];
};

type Session = { id: string; label: string };
type Categorie = { id: string; nom: string };
type Props = { categories: Categorie[]; sessions: Session[] };
type VentMetric = 'total' | 'panier_moyen' | 'nb_adherents';
type TopTab = 'montant' | 'volume' | 'frequence';

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

const VENT_METRIC_LABELS: Record<VentMetric, string> = {
    total:        'CA (€)',
    panier_moyen: 'Panier moyen (€)',
    nb_adherents: 'Adhérents',
};

function RankBar({ value, max }: { value: number; max: number }) {
    const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
    return (
        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
        </div>
    );
}

export default function AnalyseAdherents({ categories, sessions }: Props) {
    const { couleurTheme: themeKey } = usePage().props as any;

    const chartColor = useMemo(() => {
        const t = THEMES[(themeKey as ThemeKey)] ?? THEMES['rusty-nail'];
        return `hsl(${t.vars['--primary']})`;
    }, [themeKey]);

    // ── Filtres UI (saisie) ──
    const [mode, setMode]                 = useState<'periode' | 'session'>('periode');
    const [dateDebutInput, setDateDebutInput] = useState(subDays(30));
    const [dateFinInput, setDateFinInput]     = useState(todayStr());
    const [sessionId, setSessionId]       = useState('');
    const [ventilation, setVentilation]   = useState<'none' | 'jour' | 'mois'>('none');
    const [categorieId, setCategorieId]   = useState('');

    // ── Filtres confirmés (déclenchent le fetch) ──
    const [activeDebut, setActiveDebut]   = useState(subDays(30));
    const [activeFin, setActiveFin]       = useState(todayStr());

    // ── État des résultats ──
    const [data, setData]             = useState<Data | null>(null);
    const [loading, setLoading]       = useState(false);
    const [showAbsents, setShowAbsents] = useState(false);
    const [topTab, setTopTab]         = useState<TopTab>('montant');
    const [ventMetric, setVentMetric] = useState<VentMetric>('total');

    // Fetch déclenché uniquement par les filtres confirmés
    useEffect(() => {
        if (mode === 'session' && !sessionId) {
            setData(null);
            return;
        }

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
        fetch(`/admin/analyse/adherents/data?${params}`, { signal: controller.signal })
            .then(res => res.ok ? res.json() : null)
            .then(json => { if (json) setData(json); })
            .catch(e => { if (e.name !== 'AbortError') console.error(e); })
            .finally(() => setLoading(false));

        return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, activeDebut, activeFin, sessionId, ventilation, categorieId]);

    // Raccourcis : confirment immédiatement les dates sans passer par le bouton
    const applyShortcut = (s: typeof SHORTCUTS[0]) => {
        const debut = s.debut();
        const fin   = s.fin();
        setMode('periode');
        setDateDebutInput(debut);
        setDateFinInput(fin);
        setActiveDebut(debut);
        setActiveFin(fin);
    };

    // Bouton "Analyser" : confirme les dates saisies manuellement
    const handleSearch = () => {
        setActiveDebut(dateDebutInput);
        setActiveFin(dateFinInput);
    };

    const datesModifiees = dateDebutInput !== activeDebut || dateFinInput !== activeFin;

    const maxMontant   = data?.top_montant[0]?.total    ?? 1;
    const maxVolume    = data?.top_volume[0]?.volume     ?? 1;
    const maxFrequence = data?.top_frequence[0]?.nb_jours ?? 1;

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1100px] mx-auto">
            {/* En-tête */}
            <div>
                <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
                    <ArrowLeft className="size-4" />
                    Administration
                </Link>
                <h1 className="font-display text-2xl md:text-3xl font-semibold">Analyse des adhérents</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Fréquentation, panier moyen et passages sur la période sélectionnée.
                </p>
            </div>

            {/* Panneau de filtres */}
            <Card className="p-5 space-y-4">
                {/* Mode : période / session */}
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant={mode === 'periode' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMode('periode')}
                    >Par période</Button>
                    <Button
                        type="button"
                        variant={mode === 'session' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMode('session')}
                    >Par session</Button>
                </div>

                {mode === 'periode' ? (
                    <div className="space-y-3">
                        {/* Raccourcis */}
                        <div className="flex flex-wrap gap-1.5">
                            {SHORTCUTS.map(s => (
                                <Button
                                    key={s.label}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => applyShortcut(s)}
                                >{s.label}</Button>
                            ))}
                        </div>
                        {/* Saisie manuelle + bouton Analyser */}
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex items-center gap-2">
                                <Label className="text-sm whitespace-nowrap">Du</Label>
                                <Input
                                    type="date"
                                    value={dateDebutInput}
                                    onChange={e => setDateDebutInput(e.target.value)}
                                    className="w-40 text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-sm whitespace-nowrap">Au</Label>
                                <Input
                                    type="date"
                                    value={dateFinInput}
                                    onChange={e => setDateFinInput(e.target.value)}
                                    className="w-40 text-sm"
                                />
                            </div>
                            <Button
                                type="button"
                                variant={datesModifiees ? 'default' : 'outline'}
                                size="sm"
                                className="gap-1.5"
                                onClick={handleSearch}
                            >
                                <Search className="size-3.5" />
                                Analyser
                            </Button>
                        </div>
                        {/* Indicateur de la période active si différente de la saisie */}
                        {datesModifiees && (
                            <p className="text-xs text-muted-foreground">
                                Résultats affichés pour :{' '}
                                <span className="font-medium">
                                    {activeDebut || 'toute la période'}
                                    {activeFin ? ` → ${activeFin}` : ''}
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
                                {sessions.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )
                )}

                {/* Filtres secondaires : ventilation + catégorie */}
                <div className="border-t pt-4 flex flex-wrap gap-6 items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium whitespace-nowrap">Ventilation :</span>
                        <div className="flex gap-1">
                            {(['none', 'jour', 'mois'] as const).map(v => (
                                <Button
                                    key={v}
                                    type="button"
                                    variant={ventilation === v ? 'default' : 'outline'}
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => setVentilation(v)}
                                >
                                    {v === 'none' ? 'Aucune' : v === 'jour' ? 'Par jour' : 'Par mois'}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium whitespace-nowrap">Catégorie :</span>
                        <Select
                            value={categorieId || '__all__'}
                            onValueChange={v => setCategorieId(v === '__all__' ? '' : v)}
                        >
                            <SelectTrigger className="w-52">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">Toutes les catégories</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                                ))}
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

            {/* Placeholder session non sélectionnée */}
            {!loading && !data && mode === 'session' && (
                <div className="text-center py-10 text-muted-foreground text-sm">
                    Sélectionnez une session pour afficher les analyses.
                </div>
            )}

            {/* Résultats */}
            {!loading && data && (
                <>
                    {/* KPI */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-5">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Users className="size-4" />
                                <span className="text-xs font-medium">Adhérents présents</span>
                            </div>
                            <div className="text-2xl font-display font-semibold">{num(data.stats.nb_adherents)}</div>
                        </Card>
                        <Card className="p-5">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <ShoppingCart className="size-4" />
                                <span className="text-xs font-medium">Passages (ventes)</span>
                            </div>
                            <div className="text-2xl font-display font-semibold">{num(data.stats.nb_ventes)}</div>
                        </Card>
                        <Card className="p-5">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <TrendingUp className="size-4" />
                                <span className="text-xs font-medium">CA adhérents</span>
                            </div>
                            <div className="text-2xl font-display font-semibold text-primary">{eur(data.stats.ca_total)}</div>
                        </Card>
                        <Card className="p-5">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Coins className="size-4" />
                                <span className="text-xs font-medium">Panier moyen</span>
                            </div>
                            <div className="text-2xl font-display font-semibold text-primary">{eur(data.stats.panier_moyen)}</div>
                        </Card>
                    </div>

                    {data.stats.nb_ventes === 0 && (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                            Aucun passage d'adhérent enregistré sur cette période.
                        </div>
                    )}

                    {data.stats.nb_ventes > 0 && (
                        <>
                            {/* Ventilation temporelle */}
                            {ventilation !== 'none' && data.ventilation.length > 0 && (
                                <Card className="p-5">
                                    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                                        <h2 className="font-display font-semibold">
                                            {ventilation === 'jour'
                                                ? 'Répartition par jour de la semaine'
                                                : 'Évolution mensuelle'}
                                        </h2>
                                        <div className="flex gap-1">
                                            {(Object.keys(VENT_METRIC_LABELS) as VentMetric[]).map(m => (
                                                <Button
                                                    key={m}
                                                    type="button"
                                                    variant={ventMetric === m ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="text-xs h-7"
                                                    onClick={() => setVentMetric(m)}
                                                >{VENT_METRIC_LABELS[m]}</Button>
                                            ))}
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={240}>
                                        <BarChart data={data.ventilation} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                            <XAxis
                                                dataKey="label"
                                                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                                                axisLine={false} tickLine={false}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                                axisLine={false} tickLine={false} width={48}
                                                tickFormatter={v => ventMetric === 'nb_adherents' ? String(v) : `${v}€`}
                                            />
                                            <Tooltip
                                                formatter={(v: number) => [
                                                    ventMetric === 'nb_adherents' ? num(v) : eur(v),
                                                    VENT_METRIC_LABELS[ventMetric],
                                                ]}
                                                contentStyle={{
                                                    fontSize: 12, borderRadius: 8,
                                                    border: '1px solid hsl(var(--border))',
                                                    background: 'hsl(var(--card))',
                                                }}
                                            />
                                            <Bar dataKey={ventMetric} fill={chartColor} radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>

                                    {data.ventilation.length > 1 && (
                                        <div className="mt-4 border-t pt-4 overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-xs text-muted-foreground">
                                                        <th className="pb-2 font-medium pr-4">
                                                            {ventilation === 'jour' ? 'Jour' : 'Mois'}
                                                        </th>
                                                        <th className="pb-2 font-medium pr-4 text-right">Adhérents</th>
                                                        <th className="pb-2 font-medium pr-4 text-right">Passages</th>
                                                        <th className="pb-2 font-medium pr-4 text-right">CA</th>
                                                        <th className="pb-2 font-medium text-right">Panier moy.</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/50">
                                                    {data.ventilation.map((v, i) => (
                                                        <tr key={i}>
                                                            <td className="py-1.5 pr-4 font-medium">{v.label}</td>
                                                            <td className="py-1.5 pr-4 text-right">{num(v.nb_adherents)}</td>
                                                            <td className="py-1.5 pr-4 text-right">{num(v.nb_ventes)}</td>
                                                            <td className="py-1.5 pr-4 text-right">{eur(v.total)}</td>
                                                            <td className="py-1.5 text-right">{eur(v.panier_moyen)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </Card>
                            )}

                            {/* Panier moyen par type */}
                            {data.panier_par_type.length > 0 && (
                                <Card className="p-5">
                                    <h2 className="font-display font-semibold mb-4">Panier moyen par type d'adhérent</h2>
                                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {data.panier_par_type.map(t => (
                                            <div key={t.type} className="border rounded-xl p-4 space-y-1 bg-muted/30">
                                                <div className="text-sm font-medium text-muted-foreground">{t.type}</div>
                                                <div className="text-2xl font-display font-semibold text-primary">
                                                    {eur(t.panier_moyen)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {num(t.nb_ventes)} passage{t.nb_ventes > 1 ? 's' : ''}
                                                    {' · '}
                                                    {eur(t.total)} au total
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {/* Top 10 */}
                            <Card className="p-5">
                                <h2 className="font-display font-semibold mb-4">Top 10 des adhérents</h2>
                                <div className="flex gap-1 mb-5 border-b pb-3 flex-wrap">
                                    {([
                                        { key: 'montant' as TopTab,   label: 'Par montant (€)' },
                                        { key: 'volume' as TopTab,    label: "Par volume d'articles" },
                                        { key: 'frequence' as TopTab, label: 'Par fréquence de passage' },
                                    ]).map(t => (
                                        <Button
                                            key={t.key}
                                            type="button"
                                            variant={topTab === t.key ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setTopTab(t.key)}
                                        >{t.label}</Button>
                                    ))}
                                </div>

                                {topTab === 'montant' && (
                                    <div className="space-y-2">
                                        {data.top_montant.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
                                        ) : data.top_montant.map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 py-1">
                                                <span className="text-sm font-medium text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-medium">{item.nom}</span>
                                                    {item.numero != null && (
                                                        <span className="text-xs text-muted-foreground ml-1.5">#{item.numero}</span>
                                                    )}
                                                </div>
                                                <RankBar value={item.total} max={maxMontant} />
                                                <div className="text-right min-w-[90px] shrink-0">
                                                    <div className="text-sm font-semibold">{eur(item.total)}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.nb_ventes} passage{item.nb_ventes > 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {topTab === 'volume' && (
                                    <div className="space-y-2">
                                        {data.top_volume.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
                                        ) : data.top_volume.map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 py-1">
                                                <span className="text-sm font-medium text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-medium">{item.nom}</span>
                                                    {item.numero != null && (
                                                        <span className="text-xs text-muted-foreground ml-1.5">#{item.numero}</span>
                                                    )}
                                                </div>
                                                <RankBar value={item.volume} max={maxVolume} />
                                                <div className="text-right min-w-[90px] shrink-0">
                                                    <div className="text-sm font-semibold">
                                                        {num(item.volume)} article{item.volume > 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {topTab === 'frequence' && (
                                    <div className="space-y-2">
                                        {data.top_frequence.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
                                        ) : data.top_frequence.map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 py-1">
                                                <span className="text-sm font-medium text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm font-medium">{item.nom}</span>
                                                    {item.numero != null && (
                                                        <span className="text-xs text-muted-foreground ml-1.5">#{item.numero}</span>
                                                    )}
                                                </div>
                                                <RankBar value={item.nb_jours} max={maxFrequence} />
                                                <div className="text-right min-w-[90px] shrink-0">
                                                    <div className="text-sm font-semibold">
                                                        {item.nb_jours} jour{item.nb_jours > 1 ? 's' : ''}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{eur(item.total)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </>
                    )}

                    {/* Adhérents absents */}
                    <Card className="p-5">
                        <button
                            type="button"
                            className="flex items-center justify-between w-full text-left gap-4"
                            onClick={() => setShowAbsents(s => !s)}
                        >
                            <div>
                                <h2 className="font-display font-semibold">Adhérents absents sur la période</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {data.absents.length === 0
                                        ? 'Tous les adhérents ont été présents.'
                                        : `${data.absents.length} adhérent${data.absents.length > 1 ? 's' : ''} sans passage enregistré`}
                                </p>
                            </div>
                            {data.absents.length > 0 && (
                                showAbsents
                                    ? <ChevronUp className="size-5 text-muted-foreground shrink-0" />
                                    : <ChevronDown className="size-5 text-muted-foreground shrink-0" />
                            )}
                        </button>

                        {showAbsents && data.absents.length > 0 && (
                            <div className="mt-4 border-t pt-4 max-h-72 overflow-y-auto">
                                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                                    {data.absents.map((a, i) => (
                                        <div key={i} className="flex items-center gap-2 py-1 text-sm">
                                            <span className="text-muted-foreground shrink-0 tabular-nums">#{a.numero}</span>
                                            <span className="flex-1 truncate">{a.nom}</span>
                                            {a.type && (
                                                <Badge variant="secondary" className="text-xs shrink-0">{a.type}</Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}

AnalyseAdherents.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
