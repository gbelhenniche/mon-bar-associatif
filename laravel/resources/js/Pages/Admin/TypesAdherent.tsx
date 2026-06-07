import { useState } from 'react';
import { router } from '@inertiajs/react';
import { DynamicIcon } from 'lucide-react/dynamic';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, UserCog, CalendarRange, ShieldCheck, ShieldAlert, ShieldX, X } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type Autorisation = 'toujours' | 'ponctuel' | 'jamais';
type TypeAdherent = { id: string; slug: string; nom: string; icone: string | null; couleur: string | null; ordre: number; autorisation: Autorisation };
type AccordPonctuel = { id: string; date_debut: string; date_fin: string; notes: string | null };
type Props = { types: TypeAdherent[]; accords: AccordPonctuel[] };

const AUTORISATIONS: { value: Autorisation; label: string; icon: React.ElementType; color: string }[] = [
    { value: 'toujours', label: 'Toujours autorisé',       icon: ShieldCheck, color: 'text-success' },
    { value: 'ponctuel', label: 'Accord ponctuel requis',  icon: ShieldAlert, color: 'text-warning' },
    { value: 'jamais',   label: 'Jamais autorisé',         icon: ShieldX,     color: 'text-destructive' },
];

function AutorisationBadge({ value }: { value: Autorisation }) {
    const info = AUTORISATIONS.find(a => a.value === value) ?? AUTORISATIONS[0];
    return (
        <span className={`flex items-center gap-1 text-xs font-medium ${info.color}`}>
            <info.icon className="size-3.5" />
            {info.label}
        </span>
    );
}

const today = new Date().toISOString().split('T')[0];

function accordStatus(accord: AccordPonctuel): 'actif' | 'futur' | 'expiré' {
    if (accord.date_fin < today) return 'expiré';
    if (accord.date_debut > today) return 'futur';
    return 'actif';
}

const empty = { nom: '', icone: '', couleur: '#000000', autorisation: 'toujours' as Autorisation };

function IconPreview({ icone, couleur }: { icone: string; couleur: string }) {
    if (!icone.trim()) return <div className="size-8 rounded-md bg-muted" />;
    return (
        <div className="size-8 rounded-md bg-muted flex items-center justify-center" style={{ color: couleur }}>
            <DynamicIcon name={icone as any} size={18} />
        </div>
    );
}

function slugify(s: string) {
    return s.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export default function TypesAdherent({ types, accords }: Props) {
    const [editTarget, setEditTarget] = useState<TypeAdherent | null>(null);
    const [editForm, setEditForm] = useState(empty);
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState(empty);
    const [deleteTarget, setDeleteTarget] = useState<TypeAdherent | null>(null);
    const [remplacerPar, setRemplacerPar] = useState('');
    const [saving, setSaving] = useState(false);

    // Accord ponctuel
    const [accordDialog, setAccordDialog] = useState(false);
    const [accordDateDebut, setAccordDateDebut] = useState(today);
    const [accordDateFin, setAccordDateFin] = useState(today);
    const [accordNotes, setAccordNotes] = useState('');
    const [accordSaving, setAccordSaving] = useState(false);

    const hasPonctuel = types.some(t => t.autorisation === 'ponctuel');

    const openCreate = () => { setCreateForm(empty); setCreateOpen(true); };

    const openEdit = (t: TypeAdherent) => {
        setEditTarget(t);
        setEditForm({ nom: t.nom, icone: t.icone ?? '', couleur: t.couleur ?? '#000000', autorisation: t.autorisation ?? 'toujours' });
    };

    const openDelete = (t: TypeAdherent) => {
        const others = types.filter(x => x.id !== t.id);
        setDeleteTarget(t);
        setRemplacerPar(others[0]?.slug ?? '');
    };

    const doCreate = () => {
        if (!createForm.nom.trim()) return toast.error('Le nom est requis');
        setSaving(true);
        router.post('/admin/types-adherent', {
            nom:          createForm.nom.trim(),
            icone:        createForm.icone.trim() || null,
            couleur:      createForm.couleur || null,
            autorisation: createForm.autorisation,
        }, {
            onSuccess: () => { toast.success('Type créé'); setCreateOpen(false); },
            onError: (e) => toast.error(e.nom ?? 'Erreur lors de la création'),
            onFinish: () => setSaving(false),
        });
    };

    const doEdit = () => {
        if (!editTarget || !editForm.nom.trim()) return toast.error('Le nom est requis');
        setSaving(true);
        router.put(`/admin/types-adherent/${editTarget.id}`, {
            nom:          editForm.nom.trim(),
            icone:        editForm.icone.trim() || null,
            couleur:      editForm.couleur || null,
            autorisation: editForm.autorisation,
        }, {
            onSuccess: () => { toast.success('Mis à jour'); setEditTarget(null); },
            onError: () => toast.error('Erreur lors de la mise à jour'),
            onFinish: () => setSaving(false),
        });
    };

    const doDelete = () => {
        if (!deleteTarget || !remplacerPar) return;
        setSaving(true);
        router.delete(`/admin/types-adherent/${deleteTarget.id}`, {
            data: { remplacer_par: remplacerPar },
            onSuccess: () => { toast.success('Supprimé, adhérents migrés'); setDeleteTarget(null); },
            onError: (e) => toast.error(e.delete ?? e.remplacer_par ?? 'Erreur'),
            onFinish: () => setSaving(false),
        });
    };

    const openAccordDialog = () => {
        setAccordDateDebut(today);
        setAccordDateFin(today);
        setAccordNotes('');
        setAccordDialog(true);
    };

    const doCreateAccord = () => {
        if (!accordDateDebut || !accordDateFin) return toast.error('Les dates sont requises');
        if (accordDateFin < accordDateDebut) return toast.error('La date de fin doit être après la date de début');
        setAccordSaving(true);
        router.post('/admin/accords-ponctuels', {
            date_debut: accordDateDebut,
            date_fin:   accordDateFin,
            notes:      accordNotes.trim() || null,
        }, {
            preserveState: true,
            onSuccess: () => {
                toast.success('Accord ponctuel créé');
                setAccordDateDebut(today);
                setAccordDateFin(today);
                setAccordNotes('');
            },
            onError: (e) => toast.error(e.date_fin ?? e.date_debut ?? 'Erreur'),
            onFinish: () => setAccordSaving(false),
        });
    };

    const doDeleteAccord = (id: string) => {
        router.delete(`/admin/accords-ponctuels/${id}`, {
            preserveState: true,
            onSuccess: () => toast.success('Accord supprimé'),
            onError: () => toast.error('Erreur'),
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="font-display text-2xl md:text-3xl font-semibold">Types d'adhésion</h1>
                    <p className="text-sm text-muted-foreground mt-1">Statuts disponibles pour les adhérents.</p>
                </div>
                <div className="flex items-center gap-2">
                    {hasPonctuel && (
                        <Button variant="outline" onClick={openAccordDialog} className="gap-2">
                            <CalendarRange className="size-4" /> Accord ponctuel
                        </Button>
                    )}
                    <Button onClick={openCreate}><Plus className="size-4 mr-1.5" /> Ajouter</Button>
                </div>
            </div>

            <div className="space-y-3">
                {types.map(t => (
                    <div key={t.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card shadow-soft">
                        <IconPreview icone={t.icone ?? ''} couleur={t.couleur ?? '#888'} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{t.nom}</span>
                                <Badge variant="outline" className="text-[10px] font-mono">{t.slug}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                                {t.icone && <span>icône : {t.icone}</span>}
                                {t.couleur && (
                                    <span className="flex items-center gap-1">
                                        <span className="inline-block size-3 rounded-full border border-border/50" style={{ background: t.couleur }} />
                                        {t.couleur}
                                    </span>
                                )}
                                <AutorisationBadge value={t.autorisation ?? 'toujours'} />
                            </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                                <Pencil className="size-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive"
                                disabled={types.length <= 1} onClick={() => openDelete(t)}>
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    </div>
                ))}
                {types.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <UserCog className="size-10 mx-auto mb-2 opacity-40" /> Aucun type défini
                    </div>
                )}
            </div>

            {/* Création */}
            <Dialog open={createOpen} onOpenChange={o => { if (!o) setCreateOpen(false); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Nouveau type d'adhésion</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Nom *</Label>
                            <Input autoFocus value={createForm.nom}
                                onChange={e => setCreateForm({ ...createForm, nom: e.target.value })}
                                placeholder="Ex. Bienfaiteur" />
                            {createForm.nom.trim() && (
                                <p className="text-xs text-muted-foreground">Identifiant : <code className="font-mono">{slugify(createForm.nom)}</code></p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Icône Lucide</Label>
                            <div className="flex items-center gap-2">
                                <Input value={createForm.icone}
                                    onChange={e => setCreateForm({ ...createForm, icone: e.target.value })}
                                    placeholder="Ex. user-round, star, heart…" className="flex-1" />
                                <IconPreview icone={createForm.icone} couleur={createForm.couleur} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Couleur</Label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={createForm.couleur}
                                    onChange={e => setCreateForm({ ...createForm, couleur: e.target.value })}
                                    className="size-9 rounded border border-input cursor-pointer p-0.5" />
                                <span className="text-sm font-mono text-muted-foreground">{createForm.couleur}</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Autorisation d'accès au bar</Label>
                            <Select value={createForm.autorisation} onValueChange={v => setCreateForm({ ...createForm, autorisation: v as Autorisation })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {AUTORISATIONS.map(a => (
                                        <SelectItem key={a.value} value={a.value}>
                                            <span className={`flex items-center gap-1.5 ${a.color}`}>
                                                <a.icon className="size-4" /> {a.label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
                        <Button onClick={doCreate} disabled={saving}>Créer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Édition */}
            <Dialog open={!!editTarget} onOpenChange={o => { if (!o) setEditTarget(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Modifier — {editTarget?.nom}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Identifiant (slug)</Label>
                            <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-mono text-muted-foreground">
                                {editTarget?.slug}
                            </div>
                            <p className="text-xs text-muted-foreground">L'identifiant est permanent et ne peut pas être modifié.</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Nom affiché *</Label>
                            <Input autoFocus value={editForm.nom} onChange={e => setEditForm({ ...editForm, nom: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Icône Lucide</Label>
                            <div className="flex items-center gap-2">
                                <Input value={editForm.icone}
                                    onChange={e => setEditForm({ ...editForm, icone: e.target.value })}
                                    placeholder="Ex. user-round, star, heart…" className="flex-1" />
                                <IconPreview icone={editForm.icone} couleur={editForm.couleur} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Couleur</Label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={editForm.couleur}
                                    onChange={e => setEditForm({ ...editForm, couleur: e.target.value })}
                                    className="size-9 rounded border border-input cursor-pointer p-0.5" />
                                <span className="text-sm font-mono text-muted-foreground">{editForm.couleur}</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Autorisation d'accès au bar</Label>
                            <Select value={editForm.autorisation} onValueChange={v => setEditForm({ ...editForm, autorisation: v as Autorisation })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {AUTORISATIONS.map(a => (
                                        <SelectItem key={a.value} value={a.value}>
                                            <span className={`flex items-center gap-1.5 ${a.color}`}>
                                                <a.icon className="size-4" /> {a.label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTarget(null)}>Annuler</Button>
                        <Button onClick={doEdit} disabled={saving}>Enregistrer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Suppression avec remplacement */}
            <Dialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Supprimer — {deleteTarget?.nom}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">
                            Tous les adhérents ayant ce type seront basculés vers le type de remplacement choisi.
                        </p>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Remplacer par *</Label>
                            <Select value={remplacerPar} onValueChange={setRemplacerPar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {types.filter(t => t.id !== deleteTarget?.id).map(t => (
                                        <SelectItem key={t.slug} value={t.slug}>{t.nom}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
                        <Button variant="destructive" onClick={doDelete} disabled={saving || !remplacerPar}>Supprimer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Accord ponctuel */}
            <Dialog open={accordDialog} onOpenChange={o => { if (!o) setAccordDialog(false); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarRange className="size-5 text-warning" /> Accords ponctuels
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">
                            Pendant un accord actif, les types marqués « Accord ponctuel requis » sont autorisés à utiliser le bar.
                        </p>

                        {/* Liste des accords */}
                        {accords.length > 0 && (
                            <div className="space-y-2">
                                {accords.map(a => {
                                    const status = accordStatus(a);
                                    return (
                                        <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                                            status === 'actif'   ? 'border-success/40 bg-success/5' :
                                            status === 'futur'   ? 'border-primary/30 bg-primary/5' :
                                            'border-border/40 bg-muted/30 opacity-60'
                                        }`}>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-medium">
                                                        {new Date(a.date_debut).toLocaleDateString('fr-FR')} → {new Date(a.date_fin).toLocaleDateString('fr-FR')}
                                                    </span>
                                                    <Badge variant="outline" className={`text-[10px] ${
                                                        status === 'actif' ? 'text-success border-success/40' :
                                                        status === 'futur' ? 'text-primary border-primary/40' :
                                                        'text-muted-foreground'
                                                    }`}>
                                                        {status === 'actif' ? 'Actif' : status === 'futur' ? 'À venir' : 'Expiré'}
                                                    </Badge>
                                                </div>
                                                {a.notes && <p className="text-xs text-muted-foreground mt-0.5">{a.notes}</p>}
                                            </div>
                                            <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive shrink-0"
                                                onClick={() => doDeleteAccord(a.id)}>
                                                <X className="size-3.5" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Formulaire d'ajout */}
                        <div className="border-t border-border pt-4 space-y-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nouvel accord</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Date de début</Label>
                                    <Input type="date" value={accordDateDebut} onChange={e => setAccordDateDebut(e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Date de fin</Label>
                                    <Input type="date" value={accordDateFin} onChange={e => setAccordDateFin(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Notes <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                                <Input value={accordNotes} onChange={e => setAccordNotes(e.target.value)} placeholder="Ex. Fête de fin d'année" />
                            </div>
                            <Button onClick={doCreateAccord} disabled={accordSaving} className="w-full gap-2">
                                <Plus className="size-4" /> Créer l'accord
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAccordDialog(false)}>Fermer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

TypesAdherent.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
