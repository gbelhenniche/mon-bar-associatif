import { Link, usePage } from '@inertiajs/react';
import {
    Users, Palette, Lightbulb, Megaphone, Trash2, ChevronRight,
    UserCog, DatabaseBackup, Archive, TrendingUp, UserCheck, Package, Layers, MapPin, Tag, Truck,
    CircleHelp, MessageCircleQuestion, ShieldCheck,
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type MaintenanceAlerts = {
    adherentsArchives: number;
    fournisseursArchives: number;
    sauvegardeRequise: boolean;
    total: number;
};

type SectionItem = {
    href?: string;
    icon: React.ElementType;
    label: string;
    description: string;
    danger?: boolean;
    future?: boolean;
    badge?: number;
};

type Group = {
    title: string;
    items: SectionItem[];
};

function getGroups(alerts: MaintenanceAlerts): Group[] {
    return [
        {
            title: 'Analyses',
            items: [
                {
                    icon: TrendingUp,
                    label: 'Analyse des marges',
                    description: 'Visualiser la rentabilité par produit et par période.',
                    future: true,
                },
                {
                    href: '/admin/analyse/adherents',
                    icon: UserCheck,
                    label: 'Analyse des adhérents',
                    description: 'Fréquentation, panier moyen, top adhérents et absences sur une période.',
                },
                {
                    href: '/admin/analyse/produits',
                    icon: Package,
                    label: 'Analyse des produits',
                    description: 'Performance des produits : ventes, rotations, tendances.',
                },
                {
                    href: '/admin/analyse/stocks',
                    icon: Layers,
                    label: 'Analyse des stocks',
                    description: 'Fréquence de réappro, vitesse de consommation et produits à risque.',
                },
            ],
        },
        {
            title: 'Configuration',
            items: [
                {
                    href: '/admin/utilisateurs',
                    icon: Users,
                    label: 'Gestion des utilisateurs',
                    description: 'Créer, modifier et supprimer les comptes et leurs rôles.',
                },
                {
                    href: '/admin/types-adherent',
                    icon: UserCog,
                    label: "Types d'adhésion",
                    description: "Gérer les statuts d'adhérent (Individuel, Famille…) avec icône et couleur.",
                },
                {
                    href: '/admin/personnalisation',
                    icon: Palette,
                    label: 'Personnalisation',
                    description: "Nom du bar et autres paramètres d'affichage.",
                },
                {
                    href: '/admin/confidentialite',
                    icon: ShieldCheck,
                    label: 'Confidentialité',
                    description: 'Durée de conservation des données individuelles de consommation (DCDIC).',
                },
                {
                    href: '/admin/localites',
                    icon: MapPin,
                    label: 'Villes des adhérents',
                    description: 'Gérer la liste des villes proposées dans le formulaire d\'adhérent.',
                },
                {
                    href: '/admin/categories',
                    icon: Tag,
                    label: 'Catégories & types de stocks',
                    description: 'Gérer les catégories de produits et les types de stocks matériel.',
                },
            ],
        },
        {
            title: 'Communication',
            items: [
                {
                    href: '/admin/savistu',
                    icon: Lightbulb,
                    label: 'Le savais-tu ?',
                    description: 'Gérer les messages affichés aléatoirement sur le tableau de bord.',
                },
                {
                    href: '/admin/messages-importants',
                    icon: Megaphone,
                    label: 'Messages importants',
                    description: "Diffuser un message urgent avec une date de fin d'affichage.",
                },
                {
                    href: '/admin/aide',
                    icon: CircleHelp,
                    label: 'Aide en ligne',
                    description: "Configurer les textes d'aide pour chaque rubrique du menu de navigation.",
                },
                {
                    href: '/admin/faq',
                    icon: MessageCircleQuestion,
                    label: 'FAQ',
                    description: 'Gérer la foire aux questions accessible à tous les utilisateurs.',
                },
            ],
        },
        {
            title: 'Maintenance',
            items: [
                {
                    href: '/admin/adherents-archives',
                    icon: Archive,
                    label: 'Adhérents temporairement archivés',
                    description: 'Consulter, restaurer ou supprimer définitivement les adhérents archivés.',
                    badge: alerts.adherentsArchives,
                },
                {
                    href: '/admin/fournisseurs-archives',
                    icon: Truck,
                    label: 'Fournisseurs temporairement archivés',
                    description: 'Consulter, restaurer ou supprimer définitivement les fournisseurs archivés.',
                    badge: alerts.fournisseursArchives,
                },
                {
                    href: '/admin/sauvegarde',
                    icon: DatabaseBackup,
                    label: 'Sauvegardes',
                    description: "Exporter ou restaurer l'intégralité de la base de données.",
                    badge: alerts.sauvegardeRequise ? 1 : 0,
                },
                {
                    href: '/admin/reinitialisation',
                    icon: Trash2,
                    label: 'Réinitialisation',
                    description: "Effacement définitif de données : produits, stocks, adhérents ou caisse.",
                    danger: true,
                },
            ],
        },
    ];
}

function SectionCard({ item }: { item: SectionItem }) {
    const showBadge = item.badge !== undefined && item.badge > 0;

    const inner = (
        <>
            <div className={`grid place-items-center size-10 rounded-lg shrink-0 transition-colors ${
                item.future
                    ? 'bg-muted text-muted-foreground'
                    : item.danger
                        ? 'bg-destructive/10 text-destructive group-hover:bg-destructive/15'
                        : 'bg-primary/10 text-primary group-hover:bg-primary/15'
            }`}>
                <item.icon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm flex items-center gap-2 flex-wrap ${item.future ? 'text-muted-foreground' : ''}`}>
                    <span>{item.label}</span>
                    {item.future && (
                        <span className="text-xs font-normal bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                            à venir
                        </span>
                    )}
                    {showBadge && (
                        <span className="text-xs font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                            {item.badge}
                        </span>
                    )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
            </div>
            {!item.future && (
                <ChevronRight className={`size-4 shrink-0 transition-colors ${
                    item.danger ? 'text-destructive/40 group-hover:text-destructive' : 'text-muted-foreground group-hover:text-primary'
                }`} />
            )}
        </>
    );

    const baseClass = `flex items-center gap-3 p-4 rounded-xl border bg-card shadow-soft transition-colors group`;

    if (item.future || !item.href) {
        return (
            <div className={`${baseClass} opacity-60 cursor-default border-border/40`}>
                {inner}
            </div>
        );
    }

    return (
        <Link
            href={item.href}
            className={`${baseClass} ${
                item.danger
                    ? 'border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5'
                    : showBadge
                        ? 'border-orange-300/60 hover:border-orange-400/60 hover:bg-orange-500/5'
                        : 'border-border/60 hover:border-primary/40 hover:bg-primary/5'
            }`}
        >
            {inner}
        </Link>
    );
}

export default function AdminIndex() {
    const { props } = usePage();
    const alerts: MaintenanceAlerts = (props as any).maintenanceAlerts ?? {
        adherentsArchives: 0,
        fournisseursArchives: 0,
        sauvegardeRequise: false,
        total: 0,
    };

    const groups = getGroups(alerts);

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="font-display text-2xl md:text-3xl font-semibold">Administration</h1>
                <p className="text-sm text-muted-foreground mt-1">Paramètres et outils de gestion.</p>
            </div>

            {groups.map(group => (
                <div key={group.title} className="space-y-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                        {group.title}
                    </h2>
                    <div className="space-y-2">
                        {group.items.map(item => (
                            <SectionCard key={item.label} item={item} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

AdminIndex.layout = (page: React.ReactNode) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
