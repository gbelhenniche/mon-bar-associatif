import { useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

const MOTIFS = [
    { value: 'doublon',  label: 'Doublon' },
    { value: 'demande',  label: 'Demande de suppression' },
    { value: 'erreur',   label: 'Erreur de saisie' },
    { value: 'autre',    label: 'Autre' },
];
import { Plus, Pencil, Archive, Truck, Download, Upload, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type Fournisseur = {
    id: number;
    nom: string;
    adresse: string | null;
    email: string | null;
    telephone: string | null;
    visible: boolean;
};

type Props = { fournisseurs: Fournisseur[] };
type FormState = {
    id?: number;
    nom: string;
    adresse: string;
    email: string;
    telephone: string;
    visible: boolean;
};

const emptyForm = (): FormState => ({ nom: '', adresse: '', email: '', telephone: '', visible: true });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

export default function Fournisseurs({ fournisseurs }: Props) {
    const isAdmin: boolean = (usePage().props as any).auth?.isAdmin ?? false;
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [showHidden, setShowHidden] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const [archiveDialog, setArchiveDialog] = useState(false);
    const [archiveTarget, setArchiveTarget] = useState<Fournisseur | null>(null);
    const [archiveMotif, setArchiveMotif] = useState('');
    const [archiveMotifDetail, setArchiveMotifDetail] = useState('');
    const [archiving, setArchiving] = useState(false);

    const hiddenCount = useMemo(() => fournisseurs.filter(f => !f.visible).length, [fournisseurs]);

    const filtered = useMemo(
        () => showHidden ? fournisseurs : fournisseurs.filter(f => f.visible),
        [fournisseurs, showHidden],
    );

    const save = () => {
        if (!form.nom.trim()) return toast.error('Nom requis');
        const payload = {
            nom:       form.nom,
            adresse:   form.adresse || null,
            email:     form.email || null,
            telephone: form.telephone || null,
            visible:   form.visible,
        };
        if (form.id) {
            router.put(`/fournisseurs/${form.id}`, payload, {
                onSuccess: () => { toast.success('Mis à jour'); setOpen(false); setForm(emptyForm()); },
                onError: () => toast.error('Erreur lors de la mise à jour'),
            });
        } else {
            router.post('/fournisseurs', payload, {
                onSuccess: () => { toast.success('Fournisseur créé'); setOpen(false); setForm(emptyForm()); },
                onError: () => toast.error('Erreur lors de la création'),
            });
        }
    };

    const startEdit = (f: Fournisseur) => {
        setForm({ id: f.id, nom: f.nom, adresse: f.adresse ?? '', email: f.email ?? '', telephone: f.telephone ?? '', visible: f.visible });
        setOpen(true);
    };

    const startArchive = (f: Fournisseur) => {
        setArchiveTarget(f);
        setArchiveMotif('');
        setArchiveMotifDetail('');
        setArchiveDialog(true);
    };

    const confirmArchive = () => {
        if (!archiveTarget || !archiveMotif) return toast.error('Veuillez choisir un motif');
        if (archiveMotif === 'autre' && !archiveMotifDetail.trim()) return toast.error('Précisez le motif');
        setArchiving(true);
        router.post(`/fournisseurs/${archiveTarget.id}/archiver`, {
            motif: archiveMotif,
            motif_detail: archiveMotifDetail || null,
        }, {
            onSuccess: () => { toast.success('Fournisseur archivé'); setArchiveDialog(false); setArchiveTarget(null); },
            onError: () => toast.error("Erreur lors de l'archivage"),
            onFinish: () => setArchiving(false),
        });
    };

    const handleImport = (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        router.post('/fournisseurs/import', fd as any, {
            forceFormData: true,
            onSuccess: () => toast.success('Import terminé'),
            onError: () => toast.error("Erreur lors de l'import"),
        });
    };

    return (
        <>
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="font-display text-2xl md:text-3xl font-semibold">Fournisseurs</h1>
                    <p className="text-sm text-muted-foreground mt-1">{fournisseurs.length} fournisseur(s)</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isAdmin && (
                        <Button variant="outline" onClick={() => { window.location.href = '/fournisseurs/export'; }}>
                            <Download className="size-4 mr-1.5" /> Export
                        </Button>
                    )}
                    {isAdmin && (
                        <Button variant="outline" onClick={() => fileRef.current?.click()}>
                            <Upload className="size-4 mr-1.5" /> Import
                        </Button>
                    )}
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ''; }}
                    />
                    {hiddenCount > 0 && (
                        <Button
                            variant={showHidden ? 'secondary' : 'outline'}
                            onClick={() => setShowHidden(v => !v)}
                        >
                            {showHidden ? <Eye className="size-4 mr-1.5" /> : <EyeOff className="size-4 mr-1.5" />}
                            {showHidden ? 'Masquer les cachés' : `Masqués (${hiddenCount})`}
                        </Button>
                    )}
                    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setForm(emptyForm()); }}>
                        <DialogTrigger asChild>
                            <Button><Plus className="size-4 mr-1.5" /> Ajouter un fournisseur</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>{form.id ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <Field label="Identifiant">
                                    <Input disabled value={form.id ?? 'Auto'} className="bg-muted text-muted-foreground" />
                                </Field>
                                <Field label="Nom *">
                                    <Input
                                        value={form.nom}
                                        onChange={e => setForm({ ...form, nom: e.target.value })}
                                        placeholder="ex. Biozh"
                                        autoFocus
                                    />
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Email">
                                        <Input
                                            type="email"
                                            value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                            placeholder="contact@exemple.fr"
                                        />
                                    </Field>
                                    <Field label="Téléphone">
                                        <Input
                                            type="tel"
                                            value={form.telephone}
                                            onChange={e => setForm({ ...form, telephone: e.target.value })}
                                            placeholder="02 99 …"
                                        />
                                    </Field>
                                </div>
                                <Field label="Adresse">
                                    <Textarea
                                        rows={3}
                                        value={form.adresse}
                                        onChange={e => setForm({ ...form, adresse: e.target.value })}
                                        placeholder="Rue, ville, code postal…"
                                    />
                                </Field>
                                <Field label="Visibilité">
                                    <RadioGroup
                                        value={form.visible ? 'visible' : 'masque'}
                                        onValueChange={v => setForm({ ...form, visible: v === 'visible' })}
                                        className="flex gap-6 pt-1"
                                    >
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="visible" id="fvis-visible" />
                                            <Label htmlFor="fvis-visible" className="text-sm font-normal cursor-pointer">Visible</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="masque" id="fvis-masque" />
                                            <Label htmlFor="fvis-masque" className="text-sm font-normal cursor-pointer">Masqué</Label>
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
            </div>

            {/* Liste */}
            <Card className="shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium w-12">#</th>
                                <th className="text-left px-4 py-3 font-medium">Nom</th>
                                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Contact</th>
                                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Adresse</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                                        <Truck className="size-10 mx-auto mb-2 opacity-40" />
                                        Aucun fournisseur
                                    </td>
                                </tr>
                            )}
                            {filtered.map(f => (
                                <tr key={f.id} className="border-t border-border hover:bg-muted/30">
                                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{f.id}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium">{f.nom}</span>
                                            {!f.visible && (
                                                <Badge variant="secondary" className="text-xs font-normal">Masqué</Badge>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        {f.email && <div className="text-muted-foreground">{f.email}</div>}
                                        {f.telephone && <div className="text-xs text-muted-foreground">{f.telephone}</div>}
                                        {!f.email && !f.telephone && <span className="text-muted-foreground">—</span>}
                                    </td>
                                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground whitespace-pre-line">
                                        {f.adresse ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button size="icon" variant="ghost" title="Modifier" onClick={() => startEdit(f)}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" title="Archiver" onClick={() => startArchive(f)}>
                                                <Archive className="size-4 text-muted-foreground" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>

        {/* Dialogue d'archivage */}

        <Dialog open={archiveDialog} onOpenChange={o => { if (!o) { setArchiveDialog(false); setArchiveTarget(null); } }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Archiver « {archiveTarget?.nom} »</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-1">
                    <p className="text-sm text-muted-foreground">
                        Le fournisseur sera masqué. Un administrateur pourra le restaurer ou le supprimer définitivement.
                    </p>
                    <div className="space-y-2">
                        <Label className="text-xs">Motif *</Label>
                        <RadioGroup value={archiveMotif} onValueChange={setArchiveMotif} className="space-y-1.5">
                            {MOTIFS.map(m => (
                                <div key={m.value} className="flex items-center gap-2">
                                    <RadioGroupItem value={m.value} id={`motif-${m.value}`} />
                                    <Label htmlFor={`motif-${m.value}`} className="text-sm font-normal cursor-pointer">{m.label}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                    {archiveMotif === 'autre' && (
                        <div className="space-y-1.5">
                            <Label className="text-xs">Précision *</Label>
                            <Textarea
                                rows={3}
                                value={archiveMotifDetail}
                                onChange={e => setArchiveMotifDetail(e.target.value)}
                                placeholder="Expliquez brièvement le motif…"
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setArchiveDialog(false)} disabled={archiving}>Annuler</Button>
                    <Button onClick={confirmArchive} disabled={archiving || !archiveMotif}>
                        {archiving ? 'Archivage…' : 'Archiver'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}

Fournisseurs.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
