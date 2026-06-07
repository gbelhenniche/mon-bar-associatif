import { useEffect, useRef, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { applyTheme, type ThemeKey } from "@/lib/themes";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    History,
    LogOut,
    Warehouse,
    Settings,
    Truck,
    Loader2,
    CircleHelp,
    MessageCircleQuestion,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Markdown from "react-markdown";

const BASE_NAV = [
    { href: "/dashboard",   label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/caisse",      label: "Caisse",           icon: ShoppingCart },
    { href: "/historique",  label: "Historique",       icon: History },
    { href: "/produits",    label: "Produits",         icon: Package },
    { href: "/materiels",   label: "Stocks matériel",  icon: Warehouse },
    { href: "/fournisseurs",label: "Fournisseurs",     icon: Truck },
    { href: "/adherents",   label: "Adhérents",        icon: Users },
];

const ADMIN_ENTRY = { href: "/admin", label: "Administration", icon: Settings };

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { url, props } = usePage();
    const isAdmin        = (props as any).auth?.isAdmin ?? false;
    const nomBar         = (props as any).nomBar ?? "Mon Bar Associatif";
    const titreApp       = (props as any).titreApp ?? nomBar;
    const nomCourt       = nomBar.split(/[\s·]/)[0] ?? "PB";
    const couleurTheme   = ((props as any).couleurTheme ?? 'rusty-nail') as ThemeKey;
    const aideRubriques: Record<string, string> = (props as any).aideRubriques ?? {};
    const appVersion     = (props as any).appVersion ?? '1.0.0';
    const changelog      = (props as any).changelog ?? '';

    const [changelogOpen, setChangelogOpen] = useState(false);

    const [loading, setLoading] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        applyTheme(couleurTheme);
    }, [couleurTheme]);

    useEffect(() => {
        const stopStart = router.on('start', () => {
            timerRef.current = setTimeout(() => setLoading(true), 150);
        });
        const stopFinish = router.on('finish', () => {
            if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
            setLoading(false);
        });
        return () => { stopStart(); stopFinish(); if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    return (
        <>
        <Head title={titreApp} />
        <div className="flex h-screen bg-background">
            <aside className="w-14 sm:w-60 shrink-0 bg-sidebar-background flex flex-col transition-all">
                <div className="h-[61px] px-2 sm:px-6 border-b border-sidebar-border flex items-center justify-center sm:justify-start">
                    <span className="font-display text-base font-semibold text-sidebar-foreground sm:hidden">{nomCourt.slice(0,2).toUpperCase()}</span>
                    <div className="hidden sm:flex items-baseline gap-2">
                        <span className="font-display text-xl font-semibold text-sidebar-foreground">{nomBar}</span>
                        <button
                            onClick={() => setChangelogOpen(true)}
                            title="Voir le changelog et la roadmap"
                            className="text-[10px] font-mono text-sidebar-foreground/40 hover:text-sidebar-foreground/80 transition-colors leading-none"
                        >
                            v{appVersion}
                        </button>
                    </div>
                </div>
                <nav className="flex-1 px-2 sm:px-3 py-4 space-y-1">
                    {BASE_NAV.map((n) => {
                        const active = url.startsWith(n.href);
                        const rubriquKey = n.href.slice(1);
                        const helpText = aideRubriques[rubriquKey];
                        return (
                            <div key={n.href} className="flex items-center gap-0.5">
                                <Link
                                    href={n.href}
                                    title={n.label}
                                    className={`flex-1 flex items-center justify-center sm:justify-start gap-0 sm:gap-3 px-0 sm:px-3 py-2.5 rounded-lg text-sm font-display font-light transition-colors ${
                                        active
                                            ? "bg-sidebar-accent text-sidebar-foreground"
                                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                    }`}
                                >
                                    <n.icon className="size-5 sm:size-4 shrink-0" />
                                    <span className="hidden sm:inline">{n.label}</span>
                                </Link>
                                {helpText && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button
                                                title={`Aide : ${n.label}`}
                                                className="hidden sm:flex size-6 items-center justify-center rounded text-sidebar-foreground/30 hover:text-sidebar-foreground/70 transition-colors shrink-0"
                                            >
                                                <MessageCircleQuestion className="size-3.5" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent side="right" align="center" className="w-80">
                                            <p className="font-medium text-sm mb-2">{n.label}</p>
                                            <div className="markdown-content text-sm text-popover-foreground">
                                                <Markdown>{helpText}</Markdown>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>
                        );
                    })}

                    {isAdmin && (() => {
                        const active = url.startsWith(ADMIN_ENTRY.href);
                        const maintenanceTotal: number = (props as any).maintenanceAlerts?.total ?? 0;
                        return (
                            <Link
                                href={ADMIN_ENTRY.href}
                                title={ADMIN_ENTRY.label}
                                className={`flex items-center justify-center sm:justify-start gap-0 sm:gap-3 px-0 sm:px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mt-2 ${
                                    active
                                        ? "bg-sidebar-accent text-sidebar-primary font-display font-light"
                                        : "font-display font-light text-sidebar-primary/70 hover:bg-sidebar-accent/50 hover:text-sidebar-primary"
                                }`}
                            >
                                <span className="relative shrink-0">
                                    <ADMIN_ENTRY.icon className="size-5 sm:size-4" />
                                    {maintenanceTotal > 0 && (
                                        <span className="sm:hidden absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
                                            {maintenanceTotal}
                                        </span>
                                    )}
                                </span>
                                <span className="hidden sm:inline">{ADMIN_ENTRY.label}</span>
                                {maintenanceTotal > 0 && (
                                    <span className="hidden sm:flex ml-auto min-w-[18px] h-[18px] rounded-full bg-orange-500 text-white text-[10px] font-bold items-center justify-center px-1 leading-none">
                                        {maintenanceTotal}
                                    </span>
                                )}
                            </Link>
                        );
                    })()}
                </nav>
                <div className="px-2 sm:px-3 py-4 border-t border-sidebar-border space-y-1">
                    <Link
                        href="/aide-faq"
                        title="Aide et FAQ"
                        className={`flex items-center justify-center sm:justify-start gap-0 sm:gap-3 w-full px-0 sm:px-3 py-2.5 rounded-lg text-sm font-display font-light transition-colors ${
                            url.startsWith('/aide-faq')
                                ? "bg-sidebar-accent text-sidebar-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }`}
                    >
                        <CircleHelp className="size-5 sm:size-4 shrink-0" />
                        <span className="hidden sm:inline">Aide et FAQ</span>
                    </Link>
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        title="Déconnexion"
                        className="flex items-center justify-center sm:justify-start gap-0 sm:gap-3 w-full px-0 sm:px-3 py-2.5 rounded-lg text-sm font-display font-light text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
                    >
                        <LogOut className="size-5 sm:size-4 shrink-0" />
                        <span className="hidden sm:inline">Déconnexion</span>
                    </Link>
                </div>
            </aside>
            <main className="flex-1 overflow-auto relative">
                {children}
                {loading && (
                    <div className="fixed inset-0 z-[200] pointer-events-none flex items-start justify-end p-4">
                        <div className="flex items-center gap-2 rounded-full bg-background/90 border border-border shadow-lg px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
                            <Loader2 className="size-3.5 animate-spin text-primary" />
                            <span>Enregistrement…</span>
                        </div>
                    </div>
                )}
            </main>
            <Toaster />
        </div>
        <Dialog open={changelogOpen} onOpenChange={setChangelogOpen}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-display">Changelog &amp; Roadmap — v{appVersion}</DialogTitle>
                </DialogHeader>
                <div className="markdown-content text-sm text-popover-foreground prose prose-sm max-w-none">
                    <Markdown>{changelog}</Markdown>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}
