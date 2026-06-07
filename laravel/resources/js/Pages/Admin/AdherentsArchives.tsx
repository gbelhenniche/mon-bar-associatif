import { useState } from 'react';
import { router } from '@inertiajs/react';
import { RotateCcw, Trash2, Search } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

type Archive = {
    id: string;
    numero: number | null;
    prenom: string | null;
    nom: string;
    type_adhesion: string;
    archived_at: string;
    archived_by_name: string | null;
    archive_motif: string;
    archive_motif_label: string;
    archive_motif_detail: string | null;
};

type Props = { archives: Archive[] };

function fullName(a: Archive) {
    return [a.prenom, a.nom].filter(Boolean).join(' ');
}

function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function AdherentsArchives({ archives }: Props) {
    const [search, setSearch] = useState('');
    const [restoreTarget, setRestoreTarget] = useState<Archive | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Archive | null>(null);
    const [processing, setProcessing] = useState(false);

    const filtered = archives.filter(a => {
        const q = search.toLowerCase();
        return (
            fullName(a).toLowerCase().includes(q) ||
            (a.numero?.toString() ?? '').includes(q) ||
            a.archive_motif_label.toLowerCase().includes(q)
        );
    });

    function confirmRestore() {
        if (!restoreTarget) return;
        setProcessing(true);
        router.post(`/admin/adherents-archives/${restoreTarget.id}/restore`, {}, {
            onFinish: () => { setProcessing(false); setRestoreTarget(null); },
        });
    }

    function confirmDelete() {
        if (!deleteTarget) return;
        setProcessing(true);
        router.delete(`/admin/adherents-archives/${deleteTarget.id}`, {
            onFinish: () => { setProcessing(false); setDeleteTarget(null); },
        });
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold">Adhérents archivés</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {archives.length} adhérent{archives.length !== 1 ? 's' : ''} archivé{archives.length !== 1 ? 's' : ''}.
                    Vous pouvez les restaurer ou les supprimer définitivement.
                </p>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                    className="pl-9"
                    placeholder="Rechercher par nom, numéro ou motif…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    {search ? 'Aucun résultat.' : 'Aucun adhérent archivé.'}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(a => (
                        <div
                            key={a.id}
                            className="flex items-start gap-4 p-4 rounded-xl border border-border/60 bg-card shadow-soft"
                        >
                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">{fullName(a)}</span>
                                    {a.numero && (
                                        <span className="text-xs text-muted-foreground">#{a.numero}</span>
                                    )}
                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                        {a.type_adhesion}
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground/70">{a.archive_motif_label}</span>
                                    {a.archive_motif_detail && (
                                        <span className="ml-1">— {a.archive_motif_detail}</span>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Archivé le {formatDate(a.archived_at)}
                                    {a.archived_by_name && <> par <span className="font-medium">{a.archived_by_name}</span></>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRestoreTarget(a)}
                                    className="gap-1.5"
                                >
                                    <RotateCcw className="size-3.5" />
                                    Restaurer
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteTarget(a)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Restore dialog */}
            <Dialog open={!!restoreTarget} onOpenChange={open => { if (!open) setRestoreTarget(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Restaurer l'adhérent</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        <strong>{restoreTarget && fullName(restoreTarget)}</strong> sera réintroduit dans la liste active des adhérents.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRestoreTarget(null)} disabled={processing}>
                            Annuler
                        </Button>
                        <Button onClick={confirmRestore} disabled={processing}>
                            {processing ? 'En cours…' : 'Restaurer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Suppression définitive</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        <strong>{deleteTarget && fullName(deleteTarget)}</strong> sera supprimé définitivement et ne pourra pas être récupéré.
                        Ses ventes associées seront conservées.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={processing}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={processing}>
                            {processing ? 'Suppression…' : 'Supprimer définitivement'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

AdherentsArchives.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
