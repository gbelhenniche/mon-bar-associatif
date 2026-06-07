import { useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { TrendingUp, Wallet, Package, AlertTriangle, ClipboardList, Coins, UserX, FileSpreadsheet, PackageX, Info, Megaphone, DatabaseBackup } from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
    PieChart, Pie, Cell, Legend,
} from 'recharts';
import { THEMES, type ThemeKey } from '@/lib/themes';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { eur, num } from '@/lib/format';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type LowStockItem = { id: string; nom: string; stock_actuel: number; stock_minimum: number };
type LowMaterielItem = { id: number; nom: string; quantite: number; seuil_alerte: number };
type TopVente = { nom: string; qte: number; total: number };
type ParJour = { day: string; date: string; total: number };
type ParCat = { name: string; value: number };
type RecentVente = { id: string; total: number; paiement: string; created_at: string; nb: number };
type ImportLog = { id: string; direction: string; type: string; filename: string | null; lignes_ok: number; lignes_erreur: number; created_at: string };

type Props = {
    caDay: number;
    caMonth: number;
    marge: number;
    nbProduits: number;
    adhValides: number;
    adhExpires: number;
    zeroStock: LowStockItem[];
    zeroMateriels: LowMaterielItem[];
    lowStock: LowStockItem[];
    lowMateriels: LowMaterielItem[];
    topVentes: TopVente[];
    parJour: ParJour[];
    parCat: ParCat[];
    recent: RecentVente[];
    imports: ImportLog[];
    messageImportant: string | null;
    messagesSavistu: string[];
    backupLastDate: string | null;
    backupAlertDays: number;
    backupIsOverdue: boolean;
};

export default function Dashboard({
    caDay, caMonth, marge, nbProduits, adhValides, adhExpires,
    zeroStock, zeroMateriels, lowStock, lowMateriels,
    topVentes, parJour, parCat, recent, imports,
    messageImportant, messagesSavistu,
    backupLastDate, backupAlertDays, backupIsOverdue,
}: Props) {
    const { auth, couleurTheme: themeKey } = usePage().props as any;
    const isAdmin = auth?.isAdmin ?? false;

    const chartColors = useMemo(() => {
        const t = THEMES[(themeKey as ThemeKey)] ?? THEMES['rusty-nail'];
        return [
            t.vars['--primary'],
            t.vars['--gold'],
            t.vars['--primary-deep'],
            t.vars['--ring'],
            t.vars['--sidebar-accent'],
            t.vars['--border'],
            t.vars['--secondary-foreground'],
        ];
    }, [themeKey]);

    const parCatWithColors = useMemo(
        () => parCat.map((item, i) => ({ ...item, fill: chartColors[i % chartColors.length] })),
        [parCat, chartColors],
    );

    const savistu = useMemo(() => {
        if (messageImportant || messagesSavistu.length === 0) return null;
        return messagesSavistu[Math.floor(Math.random() * messagesSavistu.length)];
    }, [messageImportant, messagesSavistu]);

    const cards = [
        { label: "CA aujourd'hui", value: eur(caDay), icon: Wallet, accent: 'text-primary' },
        { label: 'CA ce mois', value: eur(caMonth), icon: TrendingUp, accent: 'text-primary' },
        { label: 'Marge estimée (30j)', value: eur(marge), icon: Coins, accent: 'text-gold' },
        { label: 'Produits actifs', value: num(nbProduits), icon: Package, accent: 'text-primary-deep' },
        { label: 'Adhésions valides', value: num(adhValides), icon: ClipboardList, accent: 'text-success' },
        { label: 'Adhésions expirées', value: num(adhExpires), icon: UserX, accent: 'text-destructive' },
    ];

    const hasStockAlerts = zeroStock.length > 0 || zeroMateriels.length > 0 || lowStock.length > 0 || lowMateriels.length > 0;

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto">
            <div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold">Tableau de bord</h1>
                <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de l'activité du bar.</p>
            </div>

            {/* Alerte sauvegarde (admins uniquement) */}
            {isAdmin && backupIsOverdue && (
                <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/8 px-5 py-4">
                    <DatabaseBackup className="size-5 text-warning mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-warning mb-0.5">Sauvegarde requise</p>
                        <p className="text-sm">
                            {backupLastDate
                                ? `Dernière sauvegarde il y a ${Math.floor((Date.now() - new Date(backupLastDate).getTime()) / 86400000)} jours (seuil : ${backupAlertDays} jours).`
                                : 'Aucune sauvegarde n\'a encore été réalisée.'
                            }
                            {' '}
                            <Link href="/admin/sauvegarde" className="underline underline-offset-2 font-medium">
                                Effectuer une sauvegarde
                            </Link>
                        </p>
                    </div>
                </div>
            )}

            {/* Alertes stocks */}
            {hasStockAlerts && (
                <div className="grid sm:grid-cols-2 gap-4">
                    {/* Stocks épuisés */}
                    {(zeroStock.length > 0 || zeroMateriels.length > 0) && (
                        <Card className="p-5 shadow-soft border-destructive/40 bg-destructive/5">
                            <div className="flex items-center gap-2 mb-3">
                                <PackageX className="size-4 text-destructive" />
                                <h3 className="font-display font-semibold text-destructive">
                                    Stocks épuisés
                                    <span className="ml-2 text-sm font-normal">({zeroStock.length + zeroMateriels.length})</span>
                                </h3>
                            </div>
                            <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                                {zeroStock.map(p => (
                                    <li key={`zp-${p.id}`} className="flex items-center justify-between gap-2 text-sm">
                                        <span className="truncate flex-1">{p.nom}</span>
                                        <span className="text-xs text-muted-foreground shrink-0">produit</span>
                                        <Badge variant="destructive" className="shrink-0">0</Badge>
                                    </li>
                                ))}
                                {zeroMateriels.map(m => (
                                    <li key={`zm-${m.id}`} className="flex items-center justify-between gap-2 text-sm">
                                        <span className="truncate flex-1">{m.nom}</span>
                                        <span className="text-xs text-muted-foreground shrink-0">matériel</span>
                                        <Badge variant="destructive" className="shrink-0">0</Badge>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {/* Stocks faibles */}
                    {(lowStock.length > 0 || lowMateriels.length > 0) && (
                        <Card className="p-5 shadow-soft border-warning/40 bg-warning/5">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="size-4 text-warning" />
                                <h3 className="font-display font-semibold text-warning">
                                    Stocks faibles
                                    <span className="ml-2 text-sm font-normal">({lowStock.length + lowMateriels.length})</span>
                                </h3>
                            </div>
                            <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                                {lowStock.map(p => (
                                    <li key={`lp-${p.id}`} className="flex items-center justify-between gap-2 text-sm">
                                        <span className="truncate flex-1">{p.nom}</span>
                                        <span className="text-xs text-muted-foreground shrink-0">produit</span>
                                        <Badge variant="secondary" className="shrink-0">{p.stock_actuel} / {p.stock_minimum}</Badge>
                                    </li>
                                ))}
                                {lowMateriels.map(m => (
                                    <li key={`lm-${m.id}`} className="flex items-center justify-between gap-2 text-sm">
                                        <span className="truncate flex-1">{m.nom}</span>
                                        <span className="text-xs text-muted-foreground shrink-0">matériel</span>
                                        <Badge variant="secondary" className="shrink-0">{m.quantite} / {m.seuil_alerte}</Badge>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {/* Cas où un seul panneau s'affiche : occuper les 2 colonnes si l'autre est vide */}
                    {(zeroStock.length > 0 || zeroMateriels.length > 0) && lowStock.length === 0 && lowMateriels.length === 0 && (
                        <div className="hidden sm:block" />
                    )}
                </div>
            )}

            {/* Zone message */}
            {messageImportant ? (
                <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/8 px-5 py-4">
                    <Megaphone className="size-5 text-destructive mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-destructive mb-0.5">Message important</p>
                        <p className="text-sm">{messageImportant}</p>
                    </div>
                </div>
            ) : savistu ? (
                <div className="flex items-start gap-4 rounded-xl border-2 border-primary/40 bg-primary/8 px-6 py-5">
                    <Info className="size-6 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-primary">Le savais-tu ?</p>
                        <p className="text-base font-medium leading-relaxed">{savistu}</p>
                    </div>
                </div>
            ) : null}

            {/* Cartes synthèse */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {cards.map(c => (
                    <Card key={c.label} className="p-5 shadow-soft border-border/60">
                        <div className="flex items-start justify-between">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</div>
                            <c.icon className={`size-4 ${c.accent}`} />
                        </div>
                        <div className="mt-3 font-display text-2xl md:text-3xl font-semibold">{c.value}</div>
                    </Card>
                ))}
            </div>

            {/* Graphiques */}
            <div className="grid lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 p-5 shadow-soft">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display font-semibold">Ventes — 30 derniers jours</h3>
                        <Badge variant="secondary">{eur(parJour.reduce((a, d) => a + d.total, 0))}</Badge>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={parJour} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartColors[5]} strokeOpacity={0.4} />
                                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                                <YAxis tick={{ fontSize: 11 }} width={42} />
                                <Tooltip formatter={(v: number) => eur(v)} />
                                <Bar
                                    dataKey="total"
                                    fill={chartColors[0]}
                                    radius={[3, 3, 0, 0]}
                                    style={{ cursor: 'pointer' }}
                                    onClick={(data: ParJour) => {
                                        if (data?.date) router.visit(`/historique?type=jour&date=${data.date}`);
                                    }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-5 shadow-soft">
                    <h3 className="font-display font-semibold mb-4">Par catégorie (30j)</h3>
                    {parCatWithColors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune vente sur la période.</p>
                    ) : (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={parCatWithColors} dataKey="value" nameKey="name"
                                        cx="50%" cy="45%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                                        {parCatWithColors.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                    </Pie>
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v: number) => eur(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>
            </div>

            {/* Ligne inférieure */}
            <div className="grid lg:grid-cols-3 gap-4">
                <Card className="p-5 shadow-soft">
                    <h3 className="font-display font-semibold mb-4">Top ventes (30j)</h3>
                    {topVentes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune vente.</p>
                    ) : (
                        <ul className="space-y-3">
                            {topVentes.map((p, i) => (
                                <li key={p.nom} className="flex items-center gap-3">
                                    <span className="grid place-items-center size-7 rounded-md bg-primary/10 text-primary text-xs font-semibold">{i + 1}</span>
                                    <span className="flex-1 truncate text-sm">{p.nom}</span>
                                    <span className="text-xs text-muted-foreground">×{p.qte}</span>
                                    <span className="text-sm font-medium">{eur(p.total)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card className="p-5 shadow-soft">
                    <div className="flex items-center gap-2 mb-4">
                        <ClipboardList className="size-4 text-primary" />
                        <h3 className="font-display font-semibold">Activité récente</h3>
                    </div>
                    {recent.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune vente enregistrée.</p>
                    ) : (
                        <ul className="space-y-2">
                            {recent.map(v => (
                                <li key={v.id} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{new Date(v.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{v.paiement}</span>
                                    <span className="font-medium">{eur(v.total)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card className="p-5 shadow-soft">
                    <div className="flex items-center gap-2 mb-4">
                        <FileSpreadsheet className="size-4 text-primary" />
                        <h3 className="font-display font-semibold">Derniers imports / exports</h3>
                    </div>
                    {imports.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun import ou export récent.</p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {imports.map(i => (
                                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Badge variant={i.direction === 'import' ? 'secondary' : 'outline'}>{i.direction}</Badge>
                                        <span className="text-xs uppercase tracking-wide text-muted-foreground">{i.type}</span>
                                        <span className="truncate text-muted-foreground">{i.filename || '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="text-success">{i.lignes_ok} ok</span>
                                        {i.lignes_erreur > 0 && <span className="text-destructive">{i.lignes_erreur} err</span>}
                                        <span className="text-muted-foreground">{new Date(i.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </div>
    );
}

Dashboard.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
