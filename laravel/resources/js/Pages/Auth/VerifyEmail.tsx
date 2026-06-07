import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});
    const submit: FormEventHandler = (e) => { e.preventDefault(); post(route('verification.send')); };
    return (
        <GuestLayout>
            <Head title="Vérification e-mail" />
            <p className="mb-4 text-sm text-muted-foreground">Vérifiez votre e-mail pour continuer.</p>
            {status === 'verification-link-sent' && <p className="mb-4 text-sm text-success">Lien envoyé !</p>}
            <form onSubmit={submit} className="flex items-center justify-between">
                <Button type="submit" disabled={processing}>Renvoyer</Button>
                <Link href={route('logout')} method="post" as="button" className="text-sm text-muted-foreground underline">Déconnexion</Link>
            </form>
        </GuestLayout>
    );
}
