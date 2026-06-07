import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormEventHandler } from 'react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({ password: '' });
    const submit: FormEventHandler = (e) => { e.preventDefault(); post(route('password.confirm'), { onFinish: () => reset('password') }); };
    return (
        <GuestLayout>
            <Head title="Confirmation" />
            <h1 className="mb-4 font-display text-xl font-semibold">Confirmer le mot de passe</h1>
            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5"><Label>Mot de passe</Label><Input type="password" value={data.password} autoFocus onChange={e => setData('password', e.target.value)} />{errors.password && <p className="text-xs text-destructive">{errors.password}</p>}</div>
                <Button type="submit" disabled={processing} className="w-full">{processing ? '…' : 'Confirmer'}</Button>
            </form>
        </GuestLayout>
    );
}
