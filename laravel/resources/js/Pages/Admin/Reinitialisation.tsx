import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { Trash2, PackageX, BarChart2, Users, Receipt, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type Props = { reinitQuestion: string };

type Action = {
    route: string;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
};

const ACTIONS: Action[] = [
    {
        route: '/admin/reinitialisation/produits',
        label: 'Produits',
        description: 'Supprime tous les produits et l\'historique des mouvements de stock.',
        icon: PackageX,
        color: 'text-orange-600',
    },
    {
        route: '/admin/reinitialisation/stocks',
        label: 'Stocks',
        description: 'Remet tous les niveaux de stock à zéro et efface l\'historique des mouvements.',
        icon: BarChart2,
        color: 'text-yellow-600',
    },
    {
        route: '/admin/reinitialisation/adherents',
        label: 'Adhérents',
        description: 'Supprime tous les adhérents et leurs données d\'adhésion.',
        icon: Users,
        color: 'text-blue-600',
    },
    {
        route: '/admin/reinitialisation/caisse',
        label: 'Caisse',
        description: 'Supprime toutes les ventes, sessions de caisse et mouvements.',
        icon: Receipt,
        color: 'text-red-600',
    },
];

export default function Reinitialisation({ reinitQuestion }: Props) {
    const { props } = usePage();
    const question = reinitQuestion || (props as any).reinitQuestion || '';

    const [pending, setPending] = useState<Action | null>(null);
    const [answer, setAnswer] = useState('');
    const [answerError, setAnswerError] = useState('');
    const [loading, setLoading] = useState(false);

    const canSubmit = answer.trim().length > 0;

    const open = (action: Action) => {
        setPending(action);
        setAnswer('');
        setAnswerError('');
    };

    const close = () => {
        if (loading) return;
        setPending(null);
        setAnswer('');
        setAnswerError('');
    };

    const confirm = () => {
        if (!pending || !canSubmit || loading) return;
        setLoading(true);
        setAnswerError('');
        router.post(pending.route, { confirmation: answer }, {
            onSuccess: (page) => {
                const msg = (page.props as any).flash?.success;
                toast.success(msg || 'Données effacées.');
                setPending(null);
                setAnswer('');
            },
            onError: (errors) => {
                if (errors.confirmation) {
                    setAnswerError(errors.confirmation);
                } else {
                    toast.error('Une erreur est survenue.');
                }
            },
            onFinish: () => setLoading(false),
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold">Réinitialisation</h1>
                <p className="text-sm text-muted-foreground mt-1">Effacement définitif de données. Ces actions sont irréversibles.</p>
            </div>

            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 flex gap-3 text-sm text-destructive">
                <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                <div>Toutes les suppressions sont <strong>définitives</strong>. Aucune restauration n'est possible depuis l'interface.</div>
            </div>

            <div className="space-y-3">
                {ACTIONS.map(action => (
                    <div
                        key={action.route}
                        className="flex items-center gap-4 p-5 rounded-xl border border-border/60 bg-card shadow-soft"
                    >
                        <div className={`grid place-items-center size-11 rounded-lg bg-muted shrink-0 ${action.color}`}>
                            <action.icon className="size-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium">{action.label}</div>
                            <div className="text-sm text-muted-foreground mt-0.5">{action.description}</div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => open(action)}
                        >
                            <Trash2 className="size-4 mr-1.5" /> Effacer
                        </Button>
                    </div>
                ))}
            </div>

            <Dialog open={!!pending} onOpenChange={o => { if (!o) close(); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" />
                            Effacer — {pending?.label}
                        </DialogTitle>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">{pending?.description}</p>
                    <p className="text-sm font-medium mt-1">Cette action est irréversible.</p>

                    <div className="space-y-1.5 mt-2">
                        <Label className="text-sm">{question}</Label>
                        <Input
                            autoFocus
                            value={answer}
                            onChange={e => { setAnswer(e.target.value); setAnswerError(''); }}
                            onKeyDown={e => { if (e.key === 'Enter' && canSubmit) confirm(); }}
                            placeholder="Votre réponse…"
                        />
                        {answerError && (
                            <p className="text-xs text-destructive">{answerError}</p>
                        )}
                    </div>

                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={close} disabled={loading}>Annuler</Button>
                        <Button
                            variant="destructive"
                            onClick={confirm}
                            disabled={!canSubmit || loading}
                        >
                            {loading ? 'Suppression…' : 'Confirmer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

Reinitialisation.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
