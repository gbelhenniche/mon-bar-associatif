import { PropsWithChildren } from 'react';
import { usePage } from '@inertiajs/react';

export default function Guest({ children }: PropsWithChildren) {
    const { props } = usePage();
    const nomBar = (props as any).nomBar ?? 'Mon Bar Associatif';

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <div className="mb-6">
                <span className="font-display text-2xl font-semibold text-primary">{nomBar}</span>
            </div>
            <div className="w-full max-w-md rounded-xl border border-border bg-card px-8 py-8 shadow-card">
                {children}
            </div>
        </div>
    );
}
