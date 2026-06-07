import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormEventHandler } from 'react';

export default function ResetPassword({ token, email }: { token: string; email: string }) {
    const { data, setData, post, processing, errors, reset } = useForm({ token, email, password: '', password_confirmation: '' });
    const submit: FormEventHandler = (e) => { e.preventDefault(); post(route('password.store'), { onFinish: () => reset('password', 'password_confirmation') }); };
    return (
        <GuestLayout>
            <Head title="Réinitialisation" />
            <h1 className="mb-4 font-display text-xl font-semibold">Nouveau mot de passe</h1>
            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={data.email} onChange={e => setData('email', e.target.value)} />{errors.email && <p className="text-xs text-destructive">{errors.email}</p>}</div>
                <div className="space-y-1.5"><Label>Mot de passe</Label><Input type="password" value={data.password} autoFocus onChange={e => setData('password', e.target.value)} />{errors.password && <p className="text-xs text-destructive">{errors.password}</p>}</div>
                <div className="space-y-1.5"><Label>Confirmation</Label><Input type="password" value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} /></div>
                <Button type="submit" disabled={processing} className="w-full">{processing ? 'Enregistrement…' : 'Réinitialiser'}</Button>
            </form>
        </GuestLayout>
    );
}
