import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FormEventHandler } from 'react';

export default function Login({ status, canResetPassword }: { status?: string; canResetPassword: boolean }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout>
            <Head title="Connexion" />
            <h1 className="mb-6 font-display text-xl font-semibold">Connexion</h1>

            {status && <div className="mb-4 text-sm font-medium text-success">{status}</div>}

            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="email">Adresse e-mail</Label>
                    <Input id="email" type="email" value={data.email} autoComplete="username" autoFocus
                        onChange={e => setData('email', e.target.value)} />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input id="password" type="password" value={data.password} autoComplete="current-password"
                        onChange={e => setData('password', e.target.value)} />
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                <div className="flex items-center gap-2">
                    <Checkbox id="remember" checked={data.remember}
                        onCheckedChange={v => setData('remember', v as boolean)} />
                    <Label htmlFor="remember" className="font-normal text-sm cursor-pointer">Se souvenir de moi</Label>
                </div>

                <div className="flex items-center justify-between pt-2">
                    {canResetPassword && (
                        <Link href={route('password.request')} className="text-sm text-muted-foreground underline hover:text-foreground">
                            Mot de passe oublié ?
                        </Link>
                    )}
                    <Button type="submit" disabled={processing} className="ml-auto">
                        {processing ? 'Connexion…' : 'Se connecter'}
                    </Button>
                </div>
            </form>
        </GuestLayout>
    );
}
