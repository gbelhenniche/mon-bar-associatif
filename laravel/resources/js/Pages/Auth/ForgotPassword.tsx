import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({ email: '' });
    const submit: FormEventHandler = (e) => { e.preventDefault(); post(route('password.email')); };
    return (
        <GuestLayout>
            <Head title="Mot de passe oublié" />
            <h1 className="mb-4 font-display text-xl font-semibold">Mot de passe oublié</h1>
            <p className="mb-4 text-sm text-muted-foreground">Entrez votre e-mail pour recevoir un lien de réinitialisation.</p>
            {status && <div className="mb-4 text-sm text-success">{status}</div>}
            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={data.email} autoFocus onChange={e => setData('email', e.target.value)} />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <Button type="submit" disabled={processing} className="w-full">{processing ? 'Envoi…' : 'Envoyer le lien'}</Button>
            </form>
        </GuestLayout>
    );
}
