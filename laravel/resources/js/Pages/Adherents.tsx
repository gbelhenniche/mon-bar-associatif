import { useMemo, useRef, useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DynamicIcon } from 'lucide-react/dynamic';
import { Plus, Search, Pencil, Archive, Users, History, Download, Upload, Mail, Phone, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { eur } from '@/lib/format';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type AdhesionAchat = {
    produit_nom: string;
    montant: number;
    paiement: string;
    created_at: string;
};

type Adherent = {
    id: string;
    numero: number | null;
    prenom: string | null;
    nom: string;
    email: string | null;
    telephone: string | null;
    ville: string | null;
    type_adhesion: string;
    date_premiere_adhesion: string | null;
    notes: string | null;
    actif: boolean;
    created_at: string;
    adhesion_produits: string[];
};

type Vente = { id: string; total: number; paiement: string; created_at: string };

type Props = {
    adherents: Adherent[];
    currentYear: number;
    availableYears: number[];
    localites: string[];
};

const today = new Date().toISOString().slice(0, 10);

const empty: Partial<Adherent> = {
    numero: null, prenom: "", nom: "", email: "", telephone: "", ville: null,
    type_adhesion: "", date_premiere_adhesion: today, notes: "", actif: true,
};

const MOTIFS = [
    { value: 'doublon', label: 'Doublon' },
    { value: 'demande', label: "Demande de l'adhérent" },
    { value: 'erreur',  label: 'Erreur de saisie' },
    { value: 'autre',   label: 'Autre' },
] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "destructive" }) {
    const cls = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
    return (
        <Card className="p-4 shadow-soft">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
            <div className={`mt-1 font-display text-2xl font-semibold ${cls}`}>{value}</div>
        </Card>
    );
}

type TypeAdherent = { id: string; slug: string; nom: string; icone: string | null; couleur: string | null };

function toTitleCase(s: string): string {
    return s.toLowerCase().replace(/(^|[\s-])(\S)/g, (_, sep, char) => sep + char.toUpperCase());
}

function fullName(a: Pick<Adherent, 'prenom' | 'nom'>): string {
    return [a.prenom, a.nom].filter(Boolean).join(' ');
}

export default function Adherents({ adherents, currentYear, availableYears, localites }: Props) {
    const pageProps = usePage().props as any;
    const { flash } = pageProps as { flash?: { success?: string; error?: string } };
    const typesAdherent: TypeAdherent[] = pageProps.typesAdherent ?? [];
    const isAdmin: boolean = pageProps.auth?.isAdmin ?? false;
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterStatut, setFilterStatut] = useState<string>("all");
    const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Partial<Adherent>>(empty);
    const fileRef = useRef<HTMLInputElement>(null);

    const [selected, setSelected] = useState<Adherent | null>(null);
    const [adhesions, setAdhesions] = useState<AdhesionAchat[]>([]);
    const [stats, setStats] = useState({ valides: 0, expires: 0, total: 0 });

    // Dialog archivage
    const [archiveDialog, setArchiveDialog] = useState(false);
    const [archiveTarget, setArchiveTarget] = useState<Adherent | null>(null);
    const [archiveMotif, setArchiveMotif] = useState<string>("");
    const [archiveMotifDetail, setArchiveMotifDetail] = useState<string>("");
    const [archiving, setArchiving] = useState(false);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const res = await fetch(`/adherents/adhesion-stats?year=${selectedYear}`);
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error('Erreur lors du chargement des stats', err);
            }
        };
        loadStats();
    }, [selectedYear]);

    const isUpToDate = (adherent: Adherent): boolean => {
        return adherent.adhesion_produits?.some(nom => nom.includes(selectedYear)) ?? false;
    };

    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        return adherents.filter(a => {
            if (s && !`${a.prenom ?? ''} ${a.nom} ${a.email || ""} ${a.numero || ""} ${a.telephone || ""} ${a.ville || ""}`.toLowerCase().includes(s)) return false;
            if (filterType !== "all" && a.type_adhesion !== filterType) return false;
            const upToDate = isUpToDate(a);
            if (filterStatut === "valide" && !upToDate) return false;
            if (filterStatut === "expire" && upToDate) return false;
            return true;
        });
    }, [adherents, search, filterType, filterStatut, selectedYear]);

    const save = () => {
        if (!editing.nom) return toast.error("Nom requis");
        if (!editing.type_adhesion) return toast.error("Type d'adhésion requis");
        const payload = {
            numero: editing.numero || null,
            prenom: editing.prenom ? toTitleCase(editing.prenom.trim()) : null,
            nom: toTitleCase(editing.nom.trim()),
            email: editing.email || null,
            telephone: editing.telephone || null,
            ville: editing.ville || null,
            type_adhesion: editing.type_adhesion,
            date_premiere_adhesion: editing.date_premiere_adhesion || null,
            notes: editing.notes || null,
            actif: editing.actif ?? true,
        };
        if (editing.id) {
            router.put(`/adherents/${editing.id}`, payload, {
                onSuccess: () => { toast.success('Mis à jour'); setOpen(false); setEditing(empty); },
                onError: () => toast.error('Erreur lors de la mise à jour'),
            });
        } else {
            router.post('/adherents', payload, {
                onSuccess: () => { toast.success('Adhérent créé'); setOpen(false); setEditing(empty); },
                onError: () => toast.error('Erreur lors de la création'),
            });
        }
    };

    const openArchiveDialog = (a: Adherent, e: React.MouseEvent) => {
        e.stopPropagation();
        setArchiveTarget(a);
        setArchiveMotif("");
        setArchiveMotifDetail("");
        setArchiveDialog(true);
    };

    const confirmArchive = () => {
        if (!archiveTarget || !archiveMotif) return toast.error("Veuillez choisir un motif");
        if (archiveMotif === "autre" && !archiveMotifDetail.trim()) return toast.error("Veuillez préciser le motif");
        setArchiving(true);
        router.post(`/adherents/${archiveTarget.id}/archiver`, {
            motif: archiveMotif,
            motif_detail: archiveMotif === "autre" ? archiveMotifDetail.trim() : null,
        }, {
            onSuccess: () => {
                toast.success(`${fullName(archiveTarget)} archivé`);
                setArchiveDialog(false);
                setArchiveTarget(null);
            },
            onError: () => toast.error("Erreur lors de l'archivage"),
            onFinish: () => setArchiving(false),
        });
    };

    const openDetail = async (a: Adherent) => {
        setSelected(a);
        setAdhesions([]);
        try {
            const res = await fetch(`/adherents/${a.id}/adhesions-by-year`);
            setAdhesions(await res.json());
        } catch {
            setAdhesions([]);
        }
    };

    const doExport = () => { window.location.href = '/adherents/export'; };

    const handleImport = (file: File) => {
        const form = new FormData();
        form.append('file', file);
        router.post('/adherents/import', form as any, {
            forceFormData: true,
            onSuccess: (page) => {
                const msg = (page.props as any).flash?.success;
                toast.success(msg || 'Import terminé');
            },
            onError: () => toast.error("Erreur lors de l'import"),
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="font-display text-2xl md:text-3xl font-semibold">Adhérents</h1>
                    <p className="text-sm text-muted-foreground mt-1">{adherents.length} adhérents</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isAdmin && <Button variant="outline" onClick={doExport}><Download className="size-4 mr-1.5" /> Export</Button>}
                    {isAdmin && <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="size-4 mr-1.5" /> Import</Button>}
                    <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }} />
                    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
                        <DialogTrigger asChild>
                            <Button className="h-9"><Plus className="size-4 mr-1.5" /> Nouvel adhérent</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editing.id ? "Modifier" : "Nouvel adhérent"}</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4 py-2">
                                <Field label="N° adhérent">
                                    {editing.id ? (
                                        <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium">
                                            {editing.numero ?? '—'}
                                        </div>
                                    ) : (
                                        <Input
                                            type="number"
                                            min={1}
                                            value={editing.numero ?? ''}
                                            onChange={e => setEditing({ ...editing, numero: e.target.value ? parseInt(e.target.value) : null })}
                                            placeholder="Auto-attribué"
                                        />
                                    )}
                                </Field>
                                <Field label="Type d'adhésion *">
                                    <Select
                                        value={editing.type_adhesion || ""}
                                        onValueChange={v => setEditing({ ...editing, type_adhesion: v })}
                                    >
                                        <SelectTrigger className={!editing.type_adhesion ? "text-muted-foreground" : ""}>
                                            <SelectValue placeholder="Choisir un type…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {typesAdherent.map(t => (
                                                <SelectItem key={t.slug} value={t.slug}>{t.nom}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Prénom">
                                    <Input value={editing.prenom ?? ""} onChange={e => setEditing({ ...editing, prenom: e.target.value })} />
                                </Field>
                                <Field label="Nom *">
                                    <Input value={editing.nom ?? ""} onChange={e => setEditing({ ...editing, nom: e.target.value })} />
                                </Field>
                                <Field label="Date de 1ère adhésion">
                                    <Input
                                        type="date"
                                        value={editing.date_premiere_adhesion ?? ""}
                                        onChange={e => setEditing({ ...editing, date_premiere_adhesion: e.target.value || null })}
                                    />
                                </Field>
                                <Field label="Email">
                                    <Input type="email" value={editing.email ?? ""} onChange={e => setEditing({ ...editing, email: e.target.value })} />
                                </Field>
                                <Field label="Téléphone">
                                    <Input value={editing.telephone ?? ""} onChange={e => setEditing({ ...editing, telephone: e.target.value })} />
                                </Field>
                                <Field label="Ville">
                                    <Select
                                        value={editing.ville ?? "__none__"}
                                        onValueChange={v => setEditing({ ...editing, ville: v === '__none__' ? null : v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Non renseignée" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">Non renseignée</SelectItem>
                                            {localites.map(v => (
                                                <SelectItem key={v} value={v}>{v}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <div className="col-span-2">
                                    <Field label="Notes">
                                        <Textarea rows={3} value={editing.notes ?? ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} />
                                    </Field>
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

            {/* Sélecteur d'année */}
            <Card className="p-4 shadow-soft">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <Label className="text-sm font-medium pt-2">Filtrer par année :</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-full sm:w-32 h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Stats par année */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label={`Valides ${selectedYear}`} value={stats.valides} tone="success" />
                <StatCard label={`Expirés ${selectedYear}`} value={stats.expires} tone="destructive" />
                {typesAdherent.map(t => (
                    <StatCard key={t.slug} label={t.nom} value={adherents.filter(a => a.type_adhesion === t.slug).length} />
                ))}
            </div>

            <Card className="p-4 shadow-soft">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-11" />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full sm:w-44 h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous types</SelectItem>
                            {typesAdherent.map(t => (
                                <SelectItem key={t.slug} value={t.slug}>{t.nom}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterStatut} onValueChange={setFilterStatut}>
                        <SelectTrigger className="w-full sm:w-44 h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous statuts</SelectItem>
                            <SelectItem value="valide">Valides {selectedYear}</SelectItem>
                            <SelectItem value="expire">Expirés {selectedYear}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            <Card className="shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium">Adhérent</th>
                                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Contact</th>
                                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Type</th>
                                <th className="text-center px-4 py-3 font-medium">Statut {selectedYear}</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                                        <Users className="size-10 mx-auto mb-2 opacity-40" /> Aucun adhérent
                                    </td>
                                </tr>
                            )}
                            {filtered.map(a => {
                                const upToDate = isUpToDate(a);
                                return (
                                    <tr key={a.id}
                                        className={`border-t border-border cursor-pointer ${upToDate ? "hover:bg-muted/30" : "bg-destructive/5 hover:bg-destructive/10"}`}
                                        onClick={() => openDetail(a)}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{fullName(a)}</div>
                                            {a.numero && <div className="text-xs text-muted-foreground">N° {a.numero}</div>}
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Mail className="size-3.5 shrink-0" />
                                                {a.email
                                                    ? <CheckCircle className="size-3.5 text-success" />
                                                    : <XCircle className="size-3.5 opacity-30" />}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <Phone className="size-3.5 shrink-0" />
                                                {a.telephone
                                                    ? <CheckCircle className="size-3.5 text-success" />
                                                    : <XCircle className="size-3.5 opacity-30" />}
                                            </div>
                                            {a.ville && <div className="text-xs mt-1">{a.ville}</div>}
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            {(() => {
                                                const t = typesAdherent.find(x => x.slug === a.type_adhesion);
                                                return (
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: t?.couleur ?? undefined }}>
                                                        {t?.icone && <DynamicIcon name={t.icone as any} size={13} />}
                                                        {t?.nom ?? a.type_adhesion}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {upToDate
                                                ? <Badge className="bg-success text-success-foreground hover:bg-success/90">À jour</Badge>
                                                : <Badge variant="destructive">Expirée</Badge>}
                                        </td>
                                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1">
                                                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditing(a); setOpen(true); }}>
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={(e) => openArchiveDialog(a, e)}>
                                                    <Archive className="size-4 text-muted-foreground" />
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

            {/* Dialog archivage */}
            <Dialog open={archiveDialog} onOpenChange={o => { if (!o) { setArchiveDialog(false); setArchiveTarget(null); } }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Archive className="size-4" />
                            Archiver {archiveTarget ? fullName(archiveTarget) : ''}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            L'adhérent sera retiré de la liste active et placé dans les archives. Cette action est réversible.
                        </p>
                        <div className="space-y-2">
                            <Label className="text-xs">Motif *</Label>
                            <RadioGroup value={archiveMotif} onValueChange={setArchiveMotif} className="space-y-2">
                                {MOTIFS.map(m => (
                                    <div key={m.value} className="flex items-center gap-2">
                                        <RadioGroupItem value={m.value} id={`motif-${m.value}`} />
                                        <Label htmlFor={`motif-${m.value}`} className="font-normal cursor-pointer">{m.label}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                        {archiveMotif === "autre" && (
                            <div className="space-y-1.5">
                                <Label className="text-xs">Précisez *</Label>
                                <Textarea
                                    rows={2}
                                    value={archiveMotifDetail}
                                    onChange={e => setArchiveMotifDetail(e.target.value)}
                                    placeholder="Décrivez le motif…"
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setArchiveDialog(false)}>Annuler</Button>
                        <Button
                            variant="destructive"
                            onClick={confirmArchive}
                            disabled={archiving || !archiveMotif || (archiveMotif === "autre" && !archiveMotifDetail.trim())}
                        >
                            <Archive className="size-4 mr-1.5" /> Archiver
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Panneau détail */}
            <Sheet open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
                <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                    {selected && (
                        <>
                            <SheetHeader>
                                <SheetTitle className="font-display text-2xl">{fullName(selected)}</SheetTitle>
                                <p className="text-xs text-muted-foreground">
                                    {selected.date_premiere_adhesion
                                        ? `Membre depuis le ${new Date(selected.date_premiere_adhesion).toLocaleDateString("fr-FR")}`
                                        : `Inscrit le ${new Date(selected.created_at).toLocaleDateString("fr-FR")}`}
                                </p>
                            </SheetHeader>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                {isUpToDate(selected)
                                    ? <Badge className="bg-success text-success-foreground">À jour ({selectedYear})</Badge>
                                    : <Badge variant="destructive">Adhésion expirée</Badge>}
                                <Badge variant="outline">{{ simple: 'Individuelle', famille: 'Famille' }[selected.type_adhesion] ?? selected.type_adhesion}</Badge>
                                {selected.ville && <Badge variant="secondary">{selected.ville}</Badge>}
                            </div>
                            <div className="mt-6">
                                <h3 className="font-medium mb-2 flex items-center gap-2"><History className="size-4" /> Historique d'adhésions</h3>
                                <Card className="divide-y divide-border max-h-96 overflow-y-auto">
                                    {adhesions.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">Aucune adhésion enregistrée</div>}
                                    {adhesions.map((adh, idx) => (
                                        <div key={idx} className="p-3 flex items-center justify-between text-sm">
                                            <div>
                                                <div className="font-medium">{adh.produit_nom}</div>
                                                <div className="text-xs text-muted-foreground capitalize">{adh.paiement}</div>
                                                <div className="text-xs text-muted-foreground">{new Date(adh.created_at).toLocaleDateString("fr-FR")}</div>
                                            </div>
                                            <div className="font-medium">{eur(Number(adh.montant))}</div>
                                        </div>
                                    ))}
                                </Card>
                            </div>
                            {selected.notes && (
                                <div className="mt-6">
                                    <h3 className="font-medium mb-2">Notes</h3>
                                    <Card className="p-3 text-sm text-muted-foreground whitespace-pre-wrap">{selected.notes}</Card>
                                </div>
                            )}
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

Adherents.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
