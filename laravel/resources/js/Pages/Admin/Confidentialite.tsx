import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type Props = {
    dcdic: string;
    reinitQuestion: string;
};

const DCDIC_OPTIONS = [
    { value: 'jamais',      label: 'Jamais (par défaut)' },
    { value: '3_ans',       label: '3 ans' },
    { value: '1_an',        label: '1 an' },
    { value: '6_mois',      label: '6 mois' },
    { value: '3_mois',      label: '3 mois' },
    { value: '1_mois',      label: '1 mois' },
    { value: 'fin_session', label: 'À la fin de chaque session de caisse' },
];

const DCDIC_RANK: Record<string, number> = {
    fin_session: 0, '1_mois': 1, '3_mois': 2, '6_mois': 3, '1_an': 4, '3_ans': 5, jamais: 6,
};

function isReduction(oldVal: string, newVal: string): boolean {
    return (DCDIC_RANK[newVal] ?? 6) < (DCDIC_RANK[oldVal] ?? 6);
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
    return (
        <div className="pb-3 border-b border-border">
            <h2 className="font-display font-semibold text-sm">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
    );
}

export default function Confidentialite({ dcdic: initialDcdic, reinitQuestion: reinitQuestionProp }: Props) {
    const { props } = usePage();
    const question = reinitQuestionProp || (props as any).reinitQuestion || '';

    const [dcdic, setDcdic] = useState(initialDcdic);
    const [saving, setSaving] = useState(false);

    // Dialog : confirmation de réduction
    const [confirmDialog, setConfirmDialog] = useState(false);
    const [pendingDcdic, setPendingDcdic] = useState('');
    const [answer, setAnswer] = useState('');
    const [answerError, setAnswerError] = useState('');
    const [confirmLoading, setConfirmLoading] = useState(false);

    // Dialog : anonymisation manuelle
    const [applyDialog, setApplyDialog] = useState(false);
    const [applyAnswer, setApplyAnswer] = useState('');
    const [applyAnswerError, setApplyAnswerError] = useState('');
    const [applyLoading, setApplyLoading] = useState(false);

    const changed = dcdic !== initialDcdic;
    const willReduce = changed && isReduction(initialDcdic, dcdic);

    const handleSave = () => {
        if (!changed) return;

        if (willReduce) {
            setPendingDcdic(dcdic);
            setAnswer('');
            setAnswerError('');
            setConfirmDialog(true);
            return;
        }

        setSaving(true);
        router.put('/admin/confidentialite', { dcdic }, {
            onSuccess: () => toast.success('Paramètre enregistré.'),
            onError: () => toast.error('Erreur lors de l\'enregistrement.'),
            onFinish: () => setSaving(false),
        });
    };

    const confirmSave = () => {
        if (!answer.trim() || confirmLoading) return;
        setConfirmLoading(true);
        setAnswerError('');
        router.put('/admin/confidentialite', { dcdic: pendingDcdic, confirmation: answer }, {
            onSuccess: () => {
                setConfirmDialog(false);
                toast.success('Paramètre enregistré.');
            },
            onError: (errors) => {
                if (errors.confirmation) setAnswerError(errors.confirmation);
                else toast.error('Erreur lors de l\'enregistrement.');
            },
            onFinish: () => setConfirmLoading(false),
        });
    };

    const confirmApply = () => {
        if (!applyAnswer.trim() || applyLoading) return;
        setApplyLoading(true);
        setApplyAnswerError('');
        router.post('/admin/confidentialite/appliquer', { confirmation: applyAnswer }, {
            onSuccess: (page) => {
                const msg = (page.props as any).flash?.success;
                toast.success(msg ?? 'Anonymisation appliquée.');
                setApplyDialog(false);
                setApplyAnswer('');
            },
            onError: (errors) => {
                if (errors.confirmation) setApplyAnswerError(errors.confirmation);
                else toast.error('Erreur lors de l\'anonymisation.');
            },
            onFinish: () => setApplyLoading(false),
        });
    };

    const currentLabel = DCDIC_OPTIONS.find(o => o.value === initialDcdic)?.label ?? initialDcdic;
    const pendingLabel  = DCDIC_OPTIONS.find(o => o.value === pendingDcdic)?.label ?? pendingDcdic;

    return (
        <div className="p-4 md:p-8 max-w-xl mx-auto space-y-6">
            <div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold">Confidentialité</h1>
                <p className="text-sm text-muted-foreground mt-1">Gestion de la durée de conservation des données personnelles.</p>
            </div>

            {/* DCDIC */}
            <Card className="p-6 shadow-soft space-y-5">
                <SectionTitle
                    title="Durée de conservation des données individuelles de consommation (DCDIC)"
                    description="Définit combien de temps les ventes restent associées à un adhérent identifié. Passé ce délai, le lien entre la vente et l'adhérent est supprimé de façon irréversible : les ventes sont conservées pour la comptabilité, mais ne sont plus nominatives."
                />

                <div className="space-y-1.5">
                    <Label className="text-xs">Durée de conservation</Label>
                    <Select value={dcdic} onValueChange={setDcdic}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {DCDIC_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {dcdic === 'fin_session' && (
                    <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
                        En mode <strong>fin de session</strong>, les ventes sont anonymisées automatiquement
                        dès la fermeture de chaque session de caisse. Les ventes des sessions déjà fermées
                        seront anonymisées immédiatement lors de l'enregistrement.
                    </div>
                )}

                {willReduce && (
                    <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                        <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Réduction irréversible de la durée</p>
                            <p className="mt-1 text-destructive/80 text-xs leading-relaxed">
                                Ce changement entraînera la suppression immédiate et définitive du lien
                                entre les ventes et les adhérents au-delà de la nouvelle durée.
                                Une confirmation par la question de sécurité sera demandée.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={saving || !changed}>
                        <Save className="size-4 mr-1.5" />
                        Enregistrer
                    </Button>
                </div>
            </Card>

            {/* Anonymisation manuelle */}
            {initialDcdic !== 'jamais' && (
                <Card className="p-6 shadow-soft space-y-4">
                    <SectionTitle
                        title="Anonymisation immédiate"
                        description="Appliquer manuellement l'anonymisation selon la durée actuellement configurée."
                    />
                    <p className="text-sm text-muted-foreground">
                        Durée actuelle : <strong>{currentLabel}</strong>.
                        Toutes les ventes concernées par cette règle seront anonymisées immédiatement
                        et de façon définitive.
                    </p>
                    <Button
                        variant="outline"
                        className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => {
                            setApplyAnswer('');
                            setApplyAnswerError('');
                            setApplyDialog(true);
                        }}
                    >
                        <ShieldCheck className="size-4 mr-1.5" />
                        Anonymiser maintenant
                    </Button>
                </Card>
            )}

            {/* ── Dialog réduction ── */}
            <Dialog open={confirmDialog} onOpenChange={o => { if (!o && !confirmLoading) setConfirmDialog(false); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" />
                            Réduction irréversible
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 text-sm">
                        <p>
                            Vous êtes sur le point de réduire la durée de conservation à{' '}
                            <strong>{pendingLabel}</strong>.
                        </p>
                        <p className="text-muted-foreground">
                            Les ventes au-delà de cette durée seront{' '}
                            <strong>immédiatement et définitivement anonymisées</strong>.
                            Ce changement ne peut pas être annulé.
                        </p>
                        <div className="space-y-1.5 pt-1">
                            <Label className="text-sm">{question}</Label>
                            <Input
                                autoFocus
                                value={answer}
                                onChange={e => { setAnswer(e.target.value); setAnswerError(''); }}
                                onKeyDown={e => { if (e.key === 'Enter' && answer.trim()) confirmSave(); }}
                                placeholder="Votre réponse…"
                            />
                            {answerError && (
                                <p className="text-xs text-destructive">{answerError}</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDialog(false)} disabled={confirmLoading}>
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmSave}
                            disabled={!answer.trim() || confirmLoading}
                        >
                            {confirmLoading ? 'Enregistrement…' : 'Confirmer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog anonymisation manuelle ── */}
            <Dialog open={applyDialog} onOpenChange={o => { if (!o && !applyLoading) setApplyDialog(false); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" />
                            Anonymiser maintenant
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 text-sm">
                        <p>
                            Toutes les ventes concernées par la règle{' '}
                            <strong>« {currentLabel} »</strong> seront anonymisées immédiatement.
                        </p>
                        <p className="text-muted-foreground">Cette action est irréversible.</p>
                        <div className="space-y-1.5 pt-1">
                            <Label className="text-sm">{question}</Label>
                            <Input
                                autoFocus
                                value={applyAnswer}
                                onChange={e => { setApplyAnswer(e.target.value); setApplyAnswerError(''); }}
                                onKeyDown={e => { if (e.key === 'Enter' && applyAnswer.trim()) confirmApply(); }}
                                placeholder="Votre réponse…"
                            />
                            {applyAnswerError && (
                                <p className="text-xs text-destructive">{applyAnswerError}</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApplyDialog(false)} disabled={applyLoading}>
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmApply}
                            disabled={!applyAnswer.trim() || applyLoading}
                        >
                            {applyLoading ? 'Anonymisation…' : 'Confirmer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

Confidentialite.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
