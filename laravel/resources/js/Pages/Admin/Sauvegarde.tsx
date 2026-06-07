import { useRef, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    DatabaseBackup, Download, Upload, Clock, AlertTriangle, Save, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type Props = {
    lastBackupDate: string | null;
    alertDays: number;
    lastBackupUser: { name: string | null; email: string | null } | null;
};

export default function Sauvegarde({ lastBackupDate, alertDays, lastBackupUser }: Props) {
    const { props } = usePage();
    const flash = (props as any).flash as { success?: string; error?: string } | undefined;

    const lastDate = lastBackupDate ? new Date(lastBackupDate) : null;
    const now = new Date();
    const daysSince = lastDate
        ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;
    const isOverdue = daysSince === null || daysSince >= alertDays;

    // Settings form
    const settingsForm = useForm({ alert_days: alertDays });

    // Import dialog
    const [importOpen, setImportOpen] = useState(false);
    const importForm = useForm<{ fichier: File | null; confirmation: string }>({
        fichier: null,
        confirmation: '',
    });
    const fileRef = useRef<HTMLInputElement>(null);

    function handleSettingsSave(e: React.FormEvent) {
        e.preventDefault();
        settingsForm.put('/admin/sauvegarde/settings', {
            onSuccess: (page) => {
                const msg = (page.props as any).flash?.success;
                toast.success(msg || 'Paramètres enregistrés.');
            },
            onError: () => toast.error('Erreur lors de l\'enregistrement.'),
        });
    }

    function openImport() {
        importForm.reset();
        if (fileRef.current) fileRef.current.value = '';
        setImportOpen(true);
    }

    function closeImport() {
        if (importForm.processing) return;
        setImportOpen(false);
    }

    function handleImport() {
        importForm.post('/admin/sauvegarde/import', {
            forceFormData: true,
            onSuccess: (page) => {
                const msg = (page.props as any).flash?.success;
                toast.success(msg || 'Base de données restaurée.');
                setImportOpen(false);
            },
            onError: (errors) => {
                toast.error(errors.fichier || errors.confirmation || 'Erreur lors de l\'import.');
            },
        });
    }

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="grid place-items-center size-11 rounded-lg bg-primary/10 text-primary shrink-0">
                    <DatabaseBackup className="size-5" />
                </div>
                <div>
                    <h1 className="font-display text-2xl md:text-3xl font-semibold">Sauvegardes</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Export et restauration de la base de données.</p>
                </div>
            </div>

            {flash?.success && (
                <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/8 px-5 py-4 text-sm text-success font-medium">
                    <CheckCircle2 className="size-4 shrink-0" />
                    {flash.success}
                </div>
            )}

            {/* Statut */}
            <Card className={`p-5 shadow-soft ${
                isOverdue
                    ? 'border-warning/40 bg-warning/5'
                    : 'border-success/40 bg-success/5'
            }`}>
                <div className="flex items-start gap-3">
                    {isOverdue
                        ? <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
                        : <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
                    }
                    <div>
                        <div className={`font-medium ${isOverdue ? 'text-warning' : 'text-success'}`}>
                            {lastDate
                                ? `Dernière sauvegarde le ${lastDate.toLocaleDateString('fr-FR', { dateStyle: 'long' })} à ${lastDate.toLocaleTimeString('fr-FR', { timeStyle: 'short' })}`
                                : 'Aucune sauvegarde enregistrée'
                            }
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                            {daysSince !== null
                                ? `Il y a ${daysSince} jour${daysSince > 1 ? 's' : ''}${isOverdue ? ` — seuil de ${alertDays} jours dépassé` : ''}`
                                : 'Aucune sauvegarde n\'a encore été réalisée.'
                            }
                        </div>
                        {lastBackupUser && (
                            <div className="text-sm text-muted-foreground mt-1">
                                Par{' '}
                                <span className="font-medium text-foreground">
                                    {lastBackupUser.name ?? lastBackupUser.email}
                                </span>
                                {lastBackupUser.name && lastBackupUser.email && (
                                    <span className="ml-1 opacity-70">({lastBackupUser.email})</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Export */}
            <Card className="p-5 shadow-soft border-border/60">
                <div className="flex items-center gap-2 mb-2">
                    <Download className="size-4 text-primary" />
                    <h2 className="font-display font-semibold">Exporter la base de données</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                    Télécharge un fichier <code className="bg-muted px-1 rounded text-xs">.sql</code> complet
                    contenant toutes les tables et données. La date de sauvegarde est enregistrée automatiquement.
                </p>
                <Button asChild className="gap-2">
                    <a href="/admin/sauvegarde/export">
                        <Download className="size-4" />
                        Télécharger la sauvegarde
                    </a>
                </Button>
            </Card>

            {/* Import */}
            <Card className="p-5 shadow-soft border-destructive/30">
                <div className="flex items-center gap-2 mb-2">
                    <Upload className="size-4 text-destructive" />
                    <h2 className="font-display font-semibold text-destructive">Importer une sauvegarde</h2>
                </div>
                <div className="rounded-lg border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive mb-4">
                    <strong>Attention :</strong> l'import remplace intégralement toutes les données actuelles.
                    Cette action est irréversible.
                </div>
                <Button
                    variant="outline"
                    className="gap-2 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={openImport}
                >
                    <Upload className="size-4" />
                    Importer un fichier SQL…
                </Button>
            </Card>

            {/* Paramètre alerte */}
            <Card className="p-5 shadow-soft border-border/60">
                <div className="flex items-center gap-2 mb-2">
                    <Clock className="size-4 text-primary" />
                    <h2 className="font-display font-semibold">Alerte de sauvegarde</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                    Un avertissement s'affiche sur le tableau de bord si aucune sauvegarde n'a été réalisée
                    depuis le nombre de jours indiqué.
                </p>
                <form onSubmit={handleSettingsSave} className="flex items-end gap-3">
                    <div className="space-y-2 w-40">
                        <Label htmlFor="alert_days">Délai maximum (jours)</Label>
                        <Input
                            id="alert_days"
                            type="number"
                            min={1}
                            max={365}
                            value={settingsForm.data.alert_days}
                            onChange={e => settingsForm.setData('alert_days', parseInt(e.target.value) || 1)}
                        />
                    </div>
                    <Button
                        type="submit"
                        variant="outline"
                        className="gap-2"
                        disabled={settingsForm.processing}
                    >
                        <Save className="size-4" />
                        Enregistrer
                    </Button>
                </form>
            </Card>

            {/* Dialog import */}
            <Dialog open={importOpen} onOpenChange={o => { if (!o) closeImport(); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" />
                            Importer une sauvegarde
                        </DialogTitle>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">
                        Toutes les données actuelles seront remplacées par le contenu du fichier.
                        Cette action est <strong>irréversible</strong>.
                    </p>

                    <div className="space-y-4 mt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="fichier-import">Fichier SQL</Label>
                            <Input
                                id="fichier-import"
                                type="file"
                                accept=".sql,.txt"
                                ref={fileRef}
                                onChange={e => importForm.setData('fichier', e.target.files?.[0] ?? null)}
                            />
                            {importForm.errors.fichier && (
                                <p className="text-xs text-destructive">{importForm.errors.fichier}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="import-confirm">
                                Tapez <strong>CONFIRMER</strong> pour valider
                            </Label>
                            <Input
                                id="import-confirm"
                                value={importForm.data.confirmation}
                                onChange={e => importForm.setData('confirmation', e.target.value)}
                                placeholder="CONFIRMER"
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && importForm.data.confirmation === 'CONFIRMER' && importForm.data.fichier) {
                                        handleImport();
                                    }
                                }}
                            />
                            {importForm.errors.confirmation && (
                                <p className="text-xs text-destructive">{importForm.errors.confirmation}</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={closeImport} disabled={importForm.processing}>
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleImport}
                            disabled={
                                !importForm.data.fichier ||
                                importForm.data.confirmation !== 'CONFIRMER' ||
                                importForm.processing
                            }
                        >
                            {importForm.processing ? 'Import en cours…' : 'Importer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

Sauvegarde.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
