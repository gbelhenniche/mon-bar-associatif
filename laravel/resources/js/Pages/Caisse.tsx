import { useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Search, Plus, Minus, Trash2, CreditCard, Banknote, ShoppingCart, X, Lock, Unlock,
    ArrowDownToLine, UserCheck, UserX, BadgeEuro, ClipboardPen, ShieldX, ShieldAlert,
    AlertTriangle, Phone, MapPin, RotateCcw, Coins,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DynamicIcon } from 'lucide-react/dynamic';
import { toast } from 'sonner';
import { eur } from '@/lib/format';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type Cat = { id: string; nom: string; couleur: string | null; icone: string | null };
type Prod = { id: string; nom: string; prix_vente: number; categorie_id: string | null; stock_actuel: number; suivi_stock: boolean };
type CartItem = { cart_key: string; produit_id: string | null; nom: string; prix: number; qte: number; note?: string };
type Session = { id: string; nom: string | null; opened_at: string; fond_ouverture: number };
type Adherent = {
    id: string; prenom: string; nom: string; numero: number | null;
    type_adhesion: string; adhesion_valide: boolean;
    email: string | null; telephone: string | null; ville: string | null;
};
type DerniereNote = { notes: string; closed_at: string };
type RecenteVente = { id: string; total: number; paiement: string; created_at: string; items: CartItem[] };
type TypeAdherent = { id: string; slug: string; nom: string; icone: string | null; couleur: string | null; autorisation: 'toujours' | 'ponctuel' | 'jamais' };

type Props = {
    categories: Cat[];
    produits: Prod[];
    session: Session | null;
    adherents: Adherent[];
    adherentsTodayIds: string[];
    adherentsTopIds: string[];
    derniereNoteSession: DerniereNote | null;
    dernieresDenominations: Record<string, number> | null;
    dernierDecompteAt: string | null;
    accordPonctuelActif: boolean;
    localites: string[];
};

const PAIEMENTS = [
    { id: "cb",      label: "Carte",    icon: CreditCard },
    { id: "especes", label: "Espèces",  icon: Banknote },
] as const;

const DENOMS: { value: number; label: string; kind: "billet" | "piece" }[] = [
    { value: 50,  label: "50 €",    kind: "billet" },
    { value: 20,  label: "20 €",    kind: "billet" },
    { value: 10,  label: "10 €",    kind: "billet" },
    { value: 5,   label: "5 €",     kind: "billet" },
    { value: 2,   label: "2 €",     kind: "piece" },
    { value: 1,   label: "1 €",     kind: "piece" },
    { value: 0.5, label: "0,50 €",  kind: "piece" },
    { value: 0.2, label: "0,20 €",  kind: "piece" },
    { value: 0.1, label: "0,10 €",  kind: "piece" },
];

function sumDenoms(counts: Record<string, number>): number {
    return DENOMS.reduce((s, d) => s + d.value * (Number(counts[d.value]) || 0), 0);
}

function formatDenoms(counts: Record<string, number>): string {
    const parts = DENOMS.map(d => ({ d, n: Number(counts[d.value]) || 0 })).filter(x => x.n > 0)
        .map(({ d, n }) => `${d.label} × ${n}`);
    return parts.length ? `Détail: ${parts.join(", ")}` : "";
}

function normalize(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function subsequenceScore(needle: string, haystack: string): number {
    let hi = 0, score = 0;
    for (let ni = 0; ni < needle.length; ni++) {
        while (hi < haystack.length && haystack[hi] !== needle[ni]) hi++;
        if (hi < haystack.length) { score++; hi++; }
    }
    return score;
}

function fuzzyMatch(query: string, a: Adherent): number {
    const q = normalize(query);
    const n1 = normalize(`${a.prenom} ${a.nom}`);
    const n2 = normalize(`${a.nom} ${a.prenom}`);
    if (n1.includes(q) || n2.includes(q)) return 100;
    const score = Math.max(subsequenceScore(q, n1), subsequenceScore(q, n2));
    return score >= Math.ceil(q.length * 0.6) ? score : 0;
}

function getCsrfToken(): string {
    const cookie = document.cookie.split('; ').find(r => r.startsWith('XSRF-TOKEN='));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
}

function CashCounter({ counts, onChange }: { counts: Record<string, number>; onChange: (c: Record<string, number>) => void }) {
    const set = (v: number, n: number) => onChange({ ...counts, [v]: Math.max(0, n) });
    return (
        <div className="rounded-lg border border-border divide-y divide-border">
            {DENOMS.map(d => {
                const n = Number(counts[d.value]) || 0;
                return (
                    <div key={d.value} className="flex items-center gap-2 px-3 py-2">
                        <span className="w-16 font-medium text-sm">{d.label}</span>
                        <span className="text-[10px] uppercase text-muted-foreground w-12">{d.kind}</span>
                        <div className="flex items-center gap-1 ml-auto">
                            <Button type="button" size="icon" variant="outline" className="size-8" onClick={() => set(d.value, n - 1)}><Minus className="size-3" /></Button>
                            <Input type="number" min={0} className="w-16 h-9 text-center" value={n} onChange={e => set(d.value, Number(e.target.value))} />
                            <Button type="button" size="icon" variant="outline" className="size-8" onClick={() => set(d.value, n + 1)}><Plus className="size-3" /></Button>
                        </div>
                        <span className="w-20 text-right text-sm tabular-nums text-muted-foreground">{eur(d.value * n)}</span>
                    </div>
                );
            })}
        </div>
    );
}

function CashView({ counts }: { counts: Record<string, number> }) {
    const lines = DENOMS.map(d => ({ d, n: Number(counts[d.value]) || 0 })).filter(x => x.n > 0);
    if (lines.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Aucune dénomination enregistrée.</p>;
    return (
        <div className="rounded-lg border border-border divide-y divide-border">
            {lines.map(({ d, n }) => (
                <div key={d.value} className="flex items-center gap-2 px-3 py-2">
                    <span className="w-16 font-medium text-sm">{d.label}</span>
                    <span className="text-[10px] uppercase text-muted-foreground w-12">{d.kind}</span>
                    <span className="ml-auto font-medium tabular-nums text-sm">{n}</span>
                    <span className="w-20 text-right text-sm tabular-nums text-muted-foreground">{eur(d.value * n)}</span>
                </div>
            ))}
        </div>
    );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
    return (
        <div className={`flex justify-between text-sm ${muted ? "text-muted-foreground" : ""}`}>
            <span>{label}</span>
            <span className={bold ? "font-display font-semibold" : "font-medium"}>{value}</span>
        </div>
    );
}

const currentYear = new Date().getFullYear();

export default function Caisse({
    categories, produits, session, adherents,
    adherentsTodayIds, adherentsTopIds, derniereNoteSession,
    dernieresDenominations, dernierDecompteAt, accordPonctuelActif, localites,
}: Props) {
    const typesAdherent: TypeAdherent[] = (usePage().props as any).typesAdherent ?? [];

    const [activeCat, setActiveCat] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const [selectedAdherent, setSelectedAdherent] = useState<Adherent | null>(null);
    const [adherentSearch, setAdherentSearch] = useState("");
    const [adherentDropdownOpen, setAdherentDropdownOpen] = useState(false);
    const adherentInputRef = useRef<HTMLInputElement>(null);

    const [prixLibreDialog, setPrixLibreDialog] = useState(false);
    const [prixLibrePrix, setPrixLibrePrix] = useState("");
    const [prixLibreNature, setPrixLibreNature] = useState("Vente d'un produit à prix libre");

    const [openDialog, setOpenDialog] = useState(false);
    const [openNom, setOpenNom] = useState("");
    const [openCounts, setOpenCounts] = useState<Record<string, number>>({});
    const openFond = useMemo(() => sumDenoms(openCounts), [openCounts]);

    const [closeDialog, setCloseDialog] = useState(false);
    const [closeCounts, setCloseCounts] = useState<Record<string, number>>({});
    const closeTotal = useMemo(() => sumDenoms(closeCounts), [closeCounts]);
    const [closeNotes, setCloseNotes] = useState("");
    const [sessionTotals, setSessionTotals] = useState({ especes: 0, cb: 0, nbVentes: 0, retraits: 0, depots: 0 });

    const [retraitDialog, setRetraitDialog] = useState(false);
    const [retraitMontant, setRetraitMontant] = useState("");
    const [retraitMotif, setRetraitMotif] = useState("");

    // Dialog alerte adhérent expiré
    const [expiredAlertDialog, setExpiredAlertDialog] = useState(false);
    const [pendingPaiement, setPendingPaiement] = useState<string | null>(null);

    // Dialog informations manquantes après vente
    const [coordsDialog, setCoordsDialog] = useState(false);
    const [coordsAdherent, setCoordsAdherent] = useState<Adherent | null>(null);
    const [coordsEmail, setCoordsEmail] = useState("");
    const [coordsTel, setCoordsTel] = useState("");
    const [coordsVille, setCoordsVille] = useState("");
    const [coordsSaving, setCoordsSaving] = useState(false);

    // Dialog consultation espèces
    const [especesDialog, setEspecesDialog] = useState(false);

    // Dialog correction dernières opérations
    const [corrigerDialog, setCorrigerDialog] = useState(false);
    const [recentesVentes, setRecentesVentes] = useState<RecenteVente[]>([]);
    const [corrigerLoading, setCorrigerLoading] = useState(false);
    const [annulationPending, setAnnulationPending] = useState<string | null>(null);

    // Détection discordance type / produit adhésion
    useEffect(() => {
        if (!selectedAdherent) return;
        const adhesionItems = cart.filter(x => /^adhésion/i.test(x.nom));
        for (const item of adhesionItems) {
            const words = item.nom.split(' ');
            if (words.length >= 2) {
                const productTypeSlug = words[1].toLowerCase();
                const adherentTypeSlug = selectedAdherent.type_adhesion.toLowerCase();
                if (productTypeSlug !== adherentTypeSlug) {
                    const tProduit = typesAdherent.find(t => t.slug === productTypeSlug);
                    const tAdherent = typesAdherent.find(t => t.slug === adherentTypeSlug);
                    toast.warning(
                        `Le produit "${item.nom}" est une adhésion "${tProduit?.nom ?? productTypeSlug}", mais l'adhérent est de type "${tAdherent?.nom ?? adherentTypeSlug}".`,
                        { duration: 7000, id: 'adhesion-mismatch' }
                    );
                    return;
                }
            }
        }
    }, [cart, selectedAdherent]);

    const adherentSuggestions = useMemo(() => {
        if (selectedAdherent) return [];
        const q = adherentSearch.trim();
        if (!q) {
            const todaySet = new Set(adherentsTodayIds);
            const today = adherents.filter(a => todaySet.has(a.id));
            if (today.length > 0) return today.slice(0, 10);
            const topSet = new Set(adherentsTopIds);
            return adherents.filter(a => topSet.has(a.id));
        }
        if (/^\d+$/.test(q)) {
            return adherents.filter(a => a.numero != null && String(a.numero).includes(q)).slice(0, 8);
        }
        return adherents
            .map(a => ({ a, score: fuzzyMatch(q, a) }))
            .filter(x => x.score > 0)
            .sort((x, y) => y.score - x.score)
            .slice(0, 8)
            .map(x => x.a);
    }, [adherents, adherentSearch, adherentsTodayIds, adherentsTopIds, selectedAdherent]);

    const selectAdherent = (a: Adherent) => {
        setSelectedAdherent(a);
        setAdherentSearch("");
        setAdherentDropdownOpen(false);
    };

    const clearAdherent = () => {
        setSelectedAdherent(null);
        setAdherentSearch("");
        setTimeout(() => adherentInputRef.current?.focus(), 50);
    };

    const clearAll = () => {
        setCart([]);
        setSelectedAdherent(null);
        setAdherentSearch("");
    };

    const handleOpenDialog = () => {
        setOpenCounts(dernieresDenominations ?? {});
        setOpenNom("");
        setOpenDialog(true);
    };

    const ouvrirSession = () => {
        router.post('/caisse/session/ouvrir', { fond_ouverture: openFond, nom: openNom.trim() || null }, {
            preserveState: false,
            onSuccess: () => {
                toast.success(`Caisse ouverte — fond ${eur(openFond)}`);
                setOpenDialog(false);
                setOpenCounts({});
                setOpenNom("");
            },
            onError: () => toast.error('Erreur lors de l\'ouverture'),
        });
    };

    const ouvrirCloseDialog = async () => {
        if (!session) return;
        try {
            const res = await fetch(`/caisse/session/totaux?session_id=${session.id}`);
            const data = await res.json();
            setSessionTotals(data);
            setCloseCounts({});
            setCloseNotes("");
            setCloseDialog(true);
        } catch {
            toast.error('Impossible de récupérer les totaux');
        }
    };

    const fermerSession = () => {
        if (!session) return;
        const theorique = session.fond_ouverture + sessionTotals.especes + sessionTotals.depots - sessionTotals.retraits;
        const ecart = closeTotal - theorique;
        router.post('/caisse/session/fermer', {
            session_id:      session.id,
            fond_fermeture:  closeTotal,
            especes_comptees:closeTotal,
            ecart,
            notes:           closeNotes.trim() || null,
            detail_especes:  formatDenoms(closeCounts) || null,
            denominations:   closeCounts,
        }, {
            preserveState: false,
            onSuccess: () => {
                toast.success(`Caisse fermée — écart ${ecart >= 0 ? "+" : ""}${eur(ecart)}`);
                setCloseDialog(false);
            },
            onError: () => toast.error('Erreur lors de la fermeture'),
        });
    };

    const enregistrerRetrait = () => {
        if (!session) return;
        const montant = Number(retraitMontant.replace(",", "."));
        if (!montant || montant <= 0) return toast.error("Montant invalide");
        router.post('/caisse/retrait', { session_id: session.id, montant, motif: retraitMotif || null }, {
            preserveState: true,
            onSuccess: () => {
                toast.success(`Retrait de ${eur(montant)} enregistré`);
                setRetraitDialog(false);
                setRetraitMontant("");
                setRetraitMotif("");
            },
            onError: () => toast.error('Erreur lors du retrait'),
        });
    };

    const filtered = useMemo(() => produits.filter(p => {
        const okCat = activeCat === "all" || p.categorie_id === activeCat;
        const okSearch = !search || p.nom.toLowerCase().includes(search.toLowerCase());
        return okCat && okSearch;
    }), [produits, activeCat, search]);

    const addToCart = (p: Prod) => setCart(prev => {
        const i = prev.findIndex(x => x.cart_key === p.id);
        if (i >= 0) { const n = [...prev]; n[i] = { ...n[i], qte: n[i].qte + 1 }; return n; }
        return [...prev, { cart_key: p.id, produit_id: p.id, nom: p.nom, prix: Number(p.prix_vente), qte: 1 }];
    });

    const addPrixLibre = () => {
        const prix = Number(prixLibrePrix.replace(",", "."));
        if (!prix || prix <= 0) return toast.error("Veuillez saisir un prix valide");
        if (!prixLibreNature.trim()) return toast.error("Veuillez préciser la nature de la vente");
        setCart(prev => [...prev, {
            cart_key: `prix-libre-${Date.now()}`,
            produit_id: null,
            nom: "Prix libre",
            prix,
            qte: 1,
            note: prixLibreNature.trim(),
        }]);
        setPrixLibreDialog(false);
        setPrixLibrePrix("");
        setPrixLibreNature("Vente d'un produit à prix libre");
    };

    const inc = (key: string, d: number) => setCart(prev =>
        prev.map(x => x.cart_key === key ? { ...x, qte: Math.max(0, x.qte + d) } : x).filter(x => x.qte > 0));

    const remove = (key: string) => setCart(prev => prev.filter(x => x.cart_key !== key));

    const total = cart.reduce((a, x) => a + x.prix * x.qte, 0);

    // Vérifie si l'adhérent sélectionné est autorisé
    const getAutorisationInfo = () => {
        if (!selectedAdherent) return null;
        const type = typesAdherent.find(t => t.slug === selectedAdherent.type_adhesion);
        const autorisation = type?.autorisation ?? 'toujours';
        if (autorisation === 'jamais') {
            return { bloque: true, icon: ShieldX, message: `Ce type d'adhérent (${type?.nom ?? selectedAdherent.type_adhesion}) n'est jamais autorisé à utiliser le bar.`, color: 'destructive' as const };
        }
        if (autorisation === 'ponctuel' && !accordPonctuelActif) {
            return { bloque: true, icon: ShieldAlert, message: `Ce type d'adhérent (${type?.nom ?? selectedAdherent.type_adhesion}) n'est autorisé que pendant un accord ponctuel. Aucun accord actif.`, color: 'warning' as const };
        }
        return null;
    };

    const autorisationInfo = useMemo(getAutorisationInfo, [selectedAdherent, typesAdherent, accordPonctuelActif]);

    const doValider = (paiement: string) => {
        if (!selectedAdherent || !session) return;
        setSubmitting(true);
        router.post('/caisse/vente', {
            session_id:   session.id,
            adherent_id:  selectedAdherent.id,
            paiement,
            items: cart.map(x => ({ produit_id: x.produit_id, nom: x.nom, prix: x.prix, qte: x.qte, note: x.note ?? null })),
        }, {
            preserveState: true,
            onSuccess: () => {
                toast.success(`Vente — ${eur(total)}`);
                const noCoords = !selectedAdherent.email && !selectedAdherent.telephone;
                const noVille  = !selectedAdherent.ville;
                const adherentCapture = selectedAdherent;
                clearAll();
                if (noCoords || noVille) {
                    setCoordsAdherent(adherentCapture);
                    setCoordsEmail('');
                    setCoordsTel('');
                    setCoordsVille('');
                    setCoordsDialog(true);
                }
                setSubmitting(false);
            },
            onError: (errors: Record<string, string>) => {
                toast.error(errors._message ?? 'Erreur lors de la vente');
                setSubmitting(false);
            },
        });
    };

    const valider = (paiement: typeof PAIEMENTS[number]["id"]) => {
        if (cart.length === 0) return toast.error("Panier vide");
        if (!session) return toast.error("Ouvrez d'abord la caisse");
        if (!selectedAdherent) return toast.error("Veuillez sélectionner un adhérent");

        // Blocage autorisation
        if (autorisationInfo?.bloque) {
            return toast.error(autorisationInfo.message);
        }

        // Alerte adhérent expiré sans adhésion au panier
        const hasAdhesionInCart = cart.some(x => /^adhésion/i.test(x.nom));
        if (!selectedAdherent.adhesion_valide && !hasAdhesionInCart) {
            setPendingPaiement(paiement);
            setExpiredAlertDialog(true);
            return;
        }

        doValider(paiement);
    };

    const sauvegarderCoords = async () => {
        if (!coordsAdherent) return;
        setCoordsSaving(true);
        try {
            await fetch(`/adherents/${coordsAdherent.id}/coordonnees`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCsrfToken() },
                body: JSON.stringify({
                    email:     coordsEmail || null,
                    telephone: coordsTel   || null,
                    ville:     coordsVille || null,
                }),
            });
            toast.success('Informations enregistrées');
            setCoordsDialog(false);
        } catch {
            toast.error('Erreur lors de l\'enregistrement');
        } finally {
            setCoordsSaving(false);
        }
    };

    const openCorrigerDialog = async () => {
        if (!session) return;
        setCorrigerLoading(true);
        setCorrigerDialog(true);
        setRecentesVentes([]);
        try {
            const res = await fetch('/caisse/recentes');
            const data = await res.json();
            setRecentesVentes(data);
        } catch {
            toast.error('Impossible de charger les ventes récentes');
            setCorrigerDialog(false);
        } finally {
            setCorrigerLoading(false);
        }
    };

    const corrigerPaiement = async (venteId: string, newPaiement: string) => {
        try {
            const res = await fetch(`/caisse/vente/${venteId}/paiement`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCsrfToken() },
                body: JSON.stringify({ paiement: newPaiement }),
            });
            if (res.ok) {
                setRecentesVentes(prev => prev.map(v => v.id === venteId ? { ...v, paiement: newPaiement } : v));
                toast.success('Mode de paiement corrigé');
            }
        } catch {
            toast.error('Erreur lors de la correction');
        }
    };

    const annulerVente = async (venteId: string) => {
        try {
            const res = await fetch(`/caisse/vente/${venteId}`, {
                method: 'DELETE',
                headers: { 'X-XSRF-TOKEN': getCsrfToken() },
            });
            if (res.ok) {
                const data = await res.json();
                setRecentesVentes(prev => prev.filter(v => v.id !== venteId));
                setAnnulationPending(null);
                // Pré-remplir le panier
                const items: CartItem[] = (data.items ?? []).map((i: any, idx: number) => ({
                    cart_key: `restored-${idx}-${Date.now()}`,
                    produit_id: i.produit_id,
                    nom: i.nom,
                    prix: i.prix,
                    qte: i.qte,
                    note: i.note ?? undefined,
                }));
                setCart(items);
                setCorrigerDialog(false);
                toast.info('Vente annulée. Les articles ont été remis dans le panier — pensez à resaisir la vente.', { duration: 6000 });
            }
        } catch {
            toast.error('Erreur lors de l\'annulation');
        }
    };

    const paiementLabel: Record<string, string> = { cb: 'Carte', especes: 'Espèces', prepayee: 'Prépayée', gratuite: 'Gratuite' };

    return (
        <>
            <div className="flex flex-col h-full">
            {/* Barre de session */}
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-3 text-sm flex-wrap shrink-0">
                {session ? (
                    <>
                        <div className="size-2 rounded-full bg-success" />
                        <span className="font-medium">{session.nom ?? "Caisse ouverte"}</span>
                        <span className="text-muted-foreground hidden sm:inline">
                            depuis {new Date(session.opened_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            {" · "}fond {eur(session.fond_ouverture)}
                        </span>
                        <div className="flex items-center gap-2 ml-auto">
                            <Button size="sm" variant="outline" onClick={() => setEspecesDialog(true)} title="Consulter les espèces">
                                <Coins className="size-4 mr-1.5" /> Espèces
                            </Button>
                            <Button size="sm" variant="outline" onClick={openCorrigerDialog} title="Corriger une opération récente">
                                <ClipboardPen className="size-4 mr-1.5" /> Corriger
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setRetraitDialog(true)}>
                                <ArrowDownToLine className="size-4 mr-1.5" /> Retrait
                            </Button>
                            <Button size="sm" variant="outline" onClick={ouvrirCloseDialog}>
                                <Lock className="size-4 mr-1.5" /> Fermer
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="size-2 rounded-full bg-destructive" />
                        <span className="font-medium">Caisse fermée</span>
                        <div className="flex items-center gap-2 ml-auto">
                            <Button size="sm" variant="outline" onClick={() => setEspecesDialog(true)} title="Consulter les espèces">
                                <Coins className="size-4 mr-1.5" /> Espèces
                            </Button>
                            <Button size="sm" onClick={handleOpenDialog}>
                                <Unlock className="size-4 mr-1.5" /> Ouvrir la caisse
                            </Button>
                        </div>
                    </>
                )}
            </div>

            <div className="grid lg:grid-cols-[1fr_380px] flex-1 min-h-0">
                {/* Catalogue */}
                <div className="flex flex-col min-h-0 border-r border-border">
                    <div className="p-4 border-b border-border space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-12 text-base" />
                        </div>
                        <Tabs value={activeCat} onValueChange={setActiveCat}>
                            <TabsList className="h-auto flex-wrap justify-start bg-transparent p-0 gap-1">
                                <TabsTrigger value="all" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Tout</TabsTrigger>
                                {categories.map(c => (
                                    <TabsTrigger
                                        key={c.id} value={c.id}
                                        className="rounded-full data-[state=active]:text-primary-foreground"
                                        style={activeCat === c.id && c.couleur ? { backgroundColor: c.couleur } : undefined}
                                    >
                                        {c.nom}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            <button onClick={() => { setPrixLibrePrix(""); setPrixLibreNature("Vente d'un produit à prix libre"); setPrixLibreDialog(true); }}
                                className="cursor-pointer h-28 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:shadow-card transition-all flex flex-col text-left overflow-hidden">
                                <div className="flex-1 p-2.5 flex items-start gap-1.5">
                                    <BadgeEuro className="size-3.5 shrink-0 mt-0.5 opacity-55 text-muted-foreground" />
                                    <span className="font-medium text-sm leading-tight text-muted-foreground">Prix libre</span>
                                </div>
                                <div className="px-2.5 py-1.5 bg-muted">
                                    <span className="font-display text-base font-semibold text-muted-foreground">—</span>
                                </div>
                            </button>
                            {filtered.map(p => {
                                const out = p.suivi_stock && Number(p.stock_actuel) <= 0;
                                const cat = categories.find(c => c.id === p.categorie_id);
                                return (
                                    <button key={p.id} onClick={() => !out && addToCart(p)} disabled={out}
                                        className="group relative cursor-pointer h-28 rounded-xl bg-card border border-border hover:border-primary hover:shadow-card transition-all flex flex-col text-left disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden">
                                        <div className="flex-1 p-2.5 flex items-start gap-1.5 overflow-hidden">
                                            {cat?.icone && (
                                                <DynamicIcon name={cat.icone as any} size={13} className="shrink-0 mt-0.5 opacity-60" style={{ color: cat.couleur ?? undefined }} />
                                            )}
                                            <span className="font-medium text-sm leading-tight line-clamp-3">{p.nom}</span>
                                        </div>
                                        <div
                                            className="px-2.5 py-1.5 flex items-center justify-between gap-1"
                                            style={cat?.couleur ? { backgroundColor: cat.couleur } : { backgroundColor: 'var(--muted)' }}
                                        >
                                            <span
                                                className="font-display text-base font-semibold"
                                                style={cat?.couleur
                                                    ? { color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.25)' }
                                                    : { color: 'var(--primary)' }
                                                }
                                            >
                                                {eur(Number(p.prix_vente))}
                                            </span>
                                            {out && <Badge variant="destructive" className="text-[10px] shrink-0">Rupture</Badge>}
                                        </div>
                                    </button>
                                );
                            })}
                            {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">Aucun produit</div>}
                        </div>
                    </div>
                </div>

                {/* Panier */}
                <div className="flex flex-col min-h-0 bg-card">
                    <div className="p-4 border-b border-border flex items-center gap-2">
                        <ShoppingCart className="size-5 text-primary" />
                        <h2 className="font-display font-semibold">Panier</h2>
                        <Badge variant="secondary" className="ml-auto">
                            {cart.reduce((a, x) => a + x.qte, 0)} article{cart.reduce((a, x) => a + x.qte, 0) > 1 ? "s" : ""}
                        </Badge>
                    </div>

                    {/* Sélection adhérent */}
                    <div className="px-3 pt-3 pb-2 border-b border-border relative">
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Adhérent *</Label>
                        {selectedAdherent ? (
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium">{selectedAdherent.prenom} {selectedAdherent.nom}</span>
                                        {selectedAdherent.numero && (
                                            <span className="text-xs text-muted-foreground ml-1.5">#{selectedAdherent.numero}</span>
                                        )}
                                    </div>
                                    {(() => {
                                        const t = typesAdherent.find(x => x.slug === selectedAdherent.type_adhesion);
                                        return (
                                            <span className="shrink-0 flex items-center gap-1 text-xs font-medium" style={{ color: t?.couleur ?? undefined }}>
                                                {t?.icone && <DynamicIcon name={t.icone as any} size={14} />}
                                                {t?.nom ?? selectedAdherent.type_adhesion}
                                            </span>
                                        );
                                    })()}
                                    {selectedAdherent.adhesion_valide ? (
                                        <Badge className="shrink-0 text-xs gap-1 bg-success/15 text-success border-success/30 hover:bg-success/15">
                                            <UserCheck className="size-3" /> {currentYear}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="shrink-0 text-xs gap-1 text-destructive border-destructive/40">
                                            <UserX className="size-3" /> Expiré
                                        </Badge>
                                    )}
                                    <Button size="icon" variant="ghost" className="size-6 shrink-0" onClick={clearAdherent}>
                                        <X className="size-3" />
                                    </Button>
                                </div>
                                {/* Alerte autorisation */}
                                {autorisationInfo?.bloque && (
                                    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs border ${
                                        autorisationInfo.color === 'destructive'
                                            ? 'bg-destructive/8 border-destructive/30 text-destructive'
                                            : 'bg-warning/8 border-warning/30 text-warning'
                                    }`}>
                                        <autorisationInfo.icon className="size-3.5 mt-0.5 shrink-0" />
                                        <span>{autorisationInfo.message}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                                    <Input
                                        ref={adherentInputRef}
                                        placeholder="Nom, prénom ou n° membre…"
                                        value={adherentSearch}
                                        onChange={e => {
                                        const val = e.target.value;
                                        const numMatch = val.match(/^(\d+)\s$/);
                                        if (numMatch) {
                                            const num = Number(numMatch[1]);
                                            const found = adherents.find(a => a.numero === num);
                                            if (found) { selectAdherent(found); return; }
                                            // Numéro introuvable : enlever l'espace
                                            setAdherentSearch(numMatch[1]);
                                            setAdherentDropdownOpen(true);
                                            return;
                                        }
                                        setAdherentSearch(val);
                                        setAdherentDropdownOpen(true);
                                    }}
                                        onFocus={() => setAdherentDropdownOpen(true)}
                                        onBlur={() => setTimeout(() => setAdherentDropdownOpen(false), 150)}
                                        className="pl-8 h-9 text-sm"
                                    />
                                </div>
                                {adherentDropdownOpen && (adherentSuggestions.length > 0 || adherentSearch.trim()) && (
                                    <div className="absolute z-50 left-3 right-3 top-full mt-1 rounded-lg border border-border bg-popover shadow-lg max-h-52 overflow-y-auto">
                                        {adherentSuggestions.length === 0 ? (
                                            <div className="px-3 py-3 text-sm text-muted-foreground text-center">Aucun résultat</div>
                                        ) : adherentSuggestions.map(a => (
                                            <button key={a.id}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 text-sm"
                                                onMouseDown={() => selectAdherent(a)}>
                                                <span className="flex-1 min-w-0 truncate">
                                                    {a.prenom} <span className="font-medium">{a.nom}</span>
                                                </span>
                                                {a.numero && (
                                                    <span className="text-xs text-muted-foreground shrink-0">#{a.numero}</span>
                                                )}
                                                {a.adhesion_valide ? (
                                                    <span className="shrink-0 text-[10px] text-success font-medium">✓ valide</span>
                                                ) : (
                                                    <span className="shrink-0 text-[10px] text-muted-foreground">expiré</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Articles */}
                    <div className="flex-1 overflow-auto p-3">
                        {cart.length === 0 ? (
                            <div className="h-full grid place-items-center text-sm text-muted-foreground p-8 text-center">
                                Touchez un produit pour l'ajouter
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {cart.map(x => (
                                    <li key={x.cart_key} className="rounded-lg border border-border p-3 flex items-center gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">{x.nom}</div>
                                            {x.note && <div className="text-xs text-muted-foreground italic truncate">{x.note}</div>}
                                            <div className="text-xs text-muted-foreground">{eur(x.prix)} × {x.qte}</div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button size="icon" variant="outline" className="size-8" onClick={() => inc(x.cart_key, -1)}><Minus className="size-3" /></Button>
                                            <span className="w-7 text-center font-medium">{x.qte}</span>
                                            <Button size="icon" variant="outline" className="size-8" onClick={() => inc(x.cart_key, 1)}><Plus className="size-3" /></Button>
                                        </div>
                                        <Button size="icon" variant="ghost" className="size-8" onClick={() => remove(x.cart_key)}><X className="size-4" /></Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Footer panier */}
                    <div className="p-4 border-t border-border bg-card space-y-3">
                        <div className="flex items-baseline justify-between">
                            <span className="text-sm text-muted-foreground">Total</span>
                            <span className="font-display text-3xl font-semibold">{eur(total)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {PAIEMENTS.map(p => (
                                <Button key={p.id} onClick={() => valider(p.id)}
                                    disabled={submitting || cart.length === 0 || !!autorisationInfo?.bloque}
                                    className="h-14 flex-col gap-1" variant={p.id === "cb" ? "default" : "outline"}>
                                    <p.icon className="size-4" />
                                    <span className="text-xs">{p.label}</span>
                                </Button>
                            ))}
                        </div>
                        {cart.length > 0 && (
                            <Button variant="ghost" className="w-full text-destructive" onClick={clearAll}>
                                <Trash2 className="size-4 mr-1" /> Vider le panier
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            </div>

            {/* Dialog consultation espèces */}
            <Dialog open={especesDialog} onOpenChange={setEspecesDialog}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Coins className="size-5" /> État de la caisse espèces
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 space-y-4">
                        {dernierDecompteAt ? (
                            <>
                                <p className="text-xs text-muted-foreground">
                                    Dernier décompte : {new Date(dernierDecompteAt).toLocaleString('fr-FR', {
                                        day: 'numeric', month: 'long', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </p>
                                <CashView counts={dernieresDenominations ?? {}} />
                                {dernieresDenominations && Object.values(dernieresDenominations).some(v => Number(v) > 0) && (
                                    <div className="flex items-baseline justify-between border-t border-border pt-3">
                                        <span className="text-sm text-muted-foreground">Total compté</span>
                                        <span className="font-display text-2xl font-semibold">{eur(sumDenoms(dernieresDenominations))}</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-6">
                                Aucun décompte enregistré pour l'instant.
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEspecesDialog(false)}>Fermer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog ouverture */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Ouvrir la caisse</DialogTitle></DialogHeader>
                    <div className="py-2 space-y-3">
                        {derniereNoteSession && (
                            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-3 space-y-1">
                                <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                                    Note de la dernière fermeture
                                    <span className="font-normal ml-1 opacity-70">
                                        ({new Date(derniereNoteSession.closed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})
                                    </span>
                                </p>
                                <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{derniereNoteSession.notes}</p>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label className="text-xs">Nom de la session <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                            <Input value={openNom} onChange={e => setOpenNom(e.target.value)}
                                placeholder="Ex. Soirée concert, Service du vendredi…" maxLength={100} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Comptez les billets et pièces présents avant le service.
                            {dernieresDenominations && Object.values(dernieresDenominations).some(v => v > 0) &&
                                <span className="text-primary ml-1">Prérempli depuis la dernière clôture.</span>
                            }
                        </p>
                        <CashCounter counts={openCounts} onChange={setOpenCounts} />
                        <div className="flex items-baseline justify-between border-t border-border pt-3">
                            <span className="text-sm text-muted-foreground">Fond d'ouverture</span>
                            <span className="font-display text-2xl font-semibold">{eur(openFond)}</span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDialog(false)}>Annuler</Button>
                        <Button onClick={ouvrirSession}>Ouvrir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog fermeture */}
            <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Fermer la caisse</DialogTitle></DialogHeader>
                    <div className="py-2 space-y-4">
                        <Card className="p-3 space-y-1.5 bg-muted/30">
                            <Row label="Fond d'ouverture" value={eur(session?.fond_ouverture ?? 0)} />
                            <Row label={`Ventes espèces (${sessionTotals.nbVentes} ventes)`} value={eur(sessionTotals.especes)} />
                            <Row label="Ventes CB" value={eur(sessionTotals.cb)} muted />
                            {sessionTotals.depots > 0 && <Row label="Dépôts" value={`+${eur(sessionTotals.depots)}`} />}
                            {sessionTotals.retraits > 0 && <Row label="Retraits" value={`-${eur(sessionTotals.retraits)}`} />}
                            <div className="border-t border-border pt-1.5">
                                <Row label="Espèces théoriques"
                                    value={eur((session?.fond_ouverture ?? 0) + sessionTotals.especes + sessionTotals.depots - sessionTotals.retraits)}
                                    bold />
                            </div>
                        </Card>
                        <div className="space-y-2">
                            <Label className="text-xs">Comptage des espèces</Label>
                            <CashCounter counts={closeCounts} onChange={setCloseCounts} />
                        </div>
                        <div className="flex items-baseline justify-between border-t border-border pt-3">
                            <span className="text-sm text-muted-foreground">Total compté</span>
                            <span className="font-display text-2xl font-semibold">{eur(closeTotal)}</span>
                        </div>
                        {(() => {
                            const theo = (session?.fond_ouverture ?? 0) + sessionTotals.especes + sessionTotals.depots - sessionTotals.retraits;
                            const ecart = closeTotal - theo;
                            const cls = ecart === 0 ? "text-success" : ecart > 0 ? "text-warning" : "text-destructive";
                            return <div className={`text-sm font-medium text-right ${cls}`}>Écart : {ecart >= 0 ? "+" : ""}{eur(ecart)}</div>;
                        })()}
                        <div className="space-y-2">
                            <Label className="text-xs">Notes (optionnel)</Label>
                            <Textarea rows={2} value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="Pourboires, incidents…" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCloseDialog(false)}>Annuler</Button>
                        <Button onClick={fermerSession}>Fermer la caisse</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog prix libre */}
            <Dialog open={prixLibreDialog} onOpenChange={open => { setPrixLibreDialog(open); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Prix libre</DialogTitle></DialogHeader>
                    <div className="py-2 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Prix (€) *</Label>
                            <Input type="number" inputMode="decimal" step="0.01" min="0.01" autoFocus
                                placeholder="0,00" className="h-12 text-lg"
                                value={prixLibrePrix} onChange={e => setPrixLibrePrix(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Nature de la vente *</Label>
                            <Textarea rows={3} value={prixLibreNature} onChange={e => setPrixLibreNature(e.target.value)} />
                            <p className="text-xs text-muted-foreground">Merci de préciser aussi clairement que possible la nature de la vente.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPrixLibreDialog(false)}>Annuler</Button>
                        <Button onClick={addPrixLibre}>Ajouter au panier</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog retrait */}
            <Dialog open={retraitDialog} onOpenChange={setRetraitDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Retrait de fond de caisse</DialogTitle></DialogHeader>
                    <div className="py-2 space-y-4">
                        <p className="text-xs text-muted-foreground">Sortie d'espèces de la caisse pendant le service.</p>
                        <div className="space-y-2">
                            <Label className="text-xs">Montant retiré (€)</Label>
                            <Input type="number" inputMode="decimal" step="0.01" min="0" autoFocus placeholder="0,00"
                                value={retraitMontant} onChange={e => setRetraitMontant(e.target.value)} className="h-12 text-lg" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Motif (optionnel)</Label>
                            <Textarea rows={2} value={retraitMotif} onChange={e => setRetraitMotif(e.target.value)} placeholder="Ex. dépôt banque…" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRetraitDialog(false)}>Annuler</Button>
                        <Button onClick={enregistrerRetrait}><ArrowDownToLine className="size-4 mr-1.5" /> Confirmer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog alerte adhérent expiré sans adhésion */}
            <Dialog open={expiredAlertDialog} onOpenChange={o => { if (!o) { setExpiredAlertDialog(false); setPendingPaiement(null); } }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-warning">
                            <AlertTriangle className="size-5" /> Adhérent non à jour
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 space-y-3 text-sm">
                        <p>
                            <strong>{selectedAdherent?.prenom} {selectedAdherent?.nom}</strong> n'est pas à jour de sa cotisation {currentYear} et aucune adhésion n'est présente dans le panier.
                        </p>
                        <p className="text-muted-foreground">
                            Il est encore temps d'ajouter une adhésion à ce panier avant de valider.
                        </p>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => { setExpiredAlertDialog(false); setPendingPaiement(null); }}>
                            Revenir au panier
                        </Button>
                        <Button variant="destructive" onClick={() => {
                            setExpiredAlertDialog(false);
                            if (pendingPaiement) doValider(pendingPaiement);
                            setPendingPaiement(null);
                        }}>
                            Valider quand même
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog informations manquantes après vente */}
            <Dialog open={coordsDialog} onOpenChange={o => { if (!o) setCoordsDialog(false); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {coordsAdherent && !coordsAdherent.ville && coordsAdherent.email && coordsAdherent.telephone
                                ? <><MapPin className="size-5 text-primary" /> Localité manquante</>
                                : coordsAdherent && !coordsAdherent.email && !coordsAdherent.telephone && coordsAdherent.ville
                                    ? <><Phone className="size-5 text-primary" /> Coordonnées manquantes</>
                                    : <><Phone className="size-5 text-primary" /> Informations manquantes</>
                            }
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 space-y-4 text-sm">
                        <p className="text-muted-foreground">
                            <strong>{coordsAdherent?.prenom} {coordsAdherent?.nom}</strong> a des informations manquantes. Voulez-vous les renseigner maintenant ?
                        </p>
                        {coordsAdherent && !coordsAdherent.email && (
                            <div className="space-y-1.5">
                                <Label className="text-xs">E-mail</Label>
                                <Input type="email" placeholder="prenom.nom@exemple.fr"
                                    value={coordsEmail} onChange={e => setCoordsEmail(e.target.value)} />
                            </div>
                        )}
                        {coordsAdherent && !coordsAdherent.telephone && (
                            <div className="space-y-1.5">
                                <Label className="text-xs">Téléphone</Label>
                                <Input type="tel" placeholder="06 xx xx xx xx"
                                    value={coordsTel} onChange={e => setCoordsTel(e.target.value)} />
                            </div>
                        )}
                        {coordsAdherent && !coordsAdherent.ville && (
                            <div className="space-y-1.5">
                                <Label className="text-xs">Ville</Label>
                                {localites.length > 0 ? (
                                    <Select value={coordsVille || '__none__'} onValueChange={v => setCoordsVille(v === '__none__' ? '' : v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choisir une ville…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">—</SelectItem>
                                            {localites.map(v => (
                                                <SelectItem key={v} value={v}>{v}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                        Aucune ville configurée. Rendez-vous dans Administration → Villes des adhérents.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCoordsDialog(false)}>Ignorer</Button>
                        <Button
                            onClick={sauvegarderCoords}
                            disabled={coordsSaving || (!coordsEmail && !coordsTel && !coordsVille)}
                        >
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog correction opérations */}
            <Dialog open={corrigerDialog} onOpenChange={o => { if (!o) { setCorrigerDialog(false); setAnnulationPending(null); } }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardPen className="size-5" /> Corriger une opération récente
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 space-y-3">
                        {corrigerLoading && (
                            <p className="text-sm text-muted-foreground text-center py-4">Chargement…</p>
                        )}
                        {!corrigerLoading && recentesVentes.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">Aucune vente dans cette session.</p>
                        )}
                        {recentesVentes.map(v => (
                            <div key={v.id} className={`rounded-xl border p-4 space-y-2 ${annulationPending === v.id ? 'border-destructive/40 bg-destructive/5' : 'border-border/60 bg-card'}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="font-medium text-sm">{eur(v.total)}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(v.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            {" · "}
                                            <span className="font-medium">{paiementLabel[v.paiement] ?? v.paiement}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {v.items.map(i => `${i.nom} ×${i.qte}`).join(', ')}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {/* Corriger paiement */}
                                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                                            onClick={() => corrigerPaiement(v.id, v.paiement === 'cb' ? 'especes' : 'cb')}>
                                            <CreditCard className="size-3" />
                                            {v.paiement === 'cb' ? '→ Espèces' : '→ Carte'}
                                        </Button>
                                        {annulationPending !== v.id ? (
                                            <Button size="sm" variant="outline" className="text-xs h-7 gap-1 text-destructive border-destructive/40 hover:bg-destructive hover:text-destructive-foreground"
                                                onClick={() => setAnnulationPending(v.id)}>
                                                <RotateCcw className="size-3" /> Annuler
                                            </Button>
                                        ) : (
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setAnnulationPending(null)}>
                                                    Non
                                                </Button>
                                                <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => annulerVente(v.id)}>
                                                    Confirmer
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {annulationPending === v.id && (
                                    <p className="text-xs text-destructive">Les articles seront remis dans le panier pour que vous puissiez resaisir la vente.</p>
                                )}
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setCorrigerDialog(false); setAnnulationPending(null); }}>Fermer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Caisse.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
