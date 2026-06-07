import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormEventHandler } from 'react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({ name: '', email: '', password: '', password_confirmation: '' });
    const submit: FormEventHandler = (e) => { e.preventDefault(); post(route('register'), { onFinish: () => reset('password', 'password_confirmation') }); };
    return (
        <GuestLayout>
            <Head title="Inscription" />
            <h1 className="mb-4 font-display text-xl font-semibold">Créer un compte</h1>
            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5"><Label>Nom</Label><Input value={data.name} autoFocus onChange={e => setData('name', e.target.value)} />{errors.name && <p className="text-xs text-destructive">{errors.name}</p>}</div>
                <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={data.email} onChange={e => setData('email', e.target.value)} />{errors.email && <p className="text-xs text-destructive">{errors.email}</p>}</div>
                <div className="space-y-1.5"><Label>Mot de passe</Label><Input type="password" value={data.password} onChange={e => setData('password', e.target.value)} />{errors.password && <p className="text-xs text-destructive">{errors.password}</p>}</div>
                <div className="space-y-1.5"><Label>Confirmation</Label><Input type="password" value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} /></div>
                <div className="flex items-center justify-between pt-2">
                    <Link href={route('login')} className="text-sm text-muted-foreground underline">Déjà un compte ?</Link>
                    <Button type="submit" disabled={processing}>{processing ? '…' : "S'inscrire"}</Button>
                </div>
            </form>
        </GuestLayout>
    );
}
