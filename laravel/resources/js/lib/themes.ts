export type ThemeKey =
  | 'rusty-nail' | 'ocean'    | 'forest'  | 'burgundy' | 'plum'
  | 'teal'       | 'copper'   | 'sage'    | 'indigo'   | 'terracotta'
  | 'pine'       | 'mauve'    | 'navy'    | 'rose'     | 'slate'
  | 'olive'      | 'jade'     | 'dusk'    | 'sienna'   | 'cobalt';

export type Theme = {
    label:   string;
    sidebar: string; // shade 950 — sidebar bg preview
    primary: string; // shade 600 — primary color preview
    vars:    Record<string, string>;
};

/*
 * Chaque palette est déclinée de la même façon que rusty-nail :
 *   50  → background
 *  100  → secondary, muted
 *  200  → accent
 *  300  → border, input
 *  400  → gold / sidebar-primary
 *  500  → ring / sidebar-ring
 *  600  → primary
 *  700  → primary-deep, muted-foreground
 *  800  → sidebar-accent
 *  900  → secondary-foreground, accent-foreground, sidebar-border
 *  950  → foreground, sidebar-background
 */
function palette(
    s50:  string, s100: string, s200: string, s300: string,
    s400: string, s500: string, s600: string, s700: string,
    s800: string, s900: string, s950: string,
): Theme['vars'] {
    return {
        '--background':                 s50,
        '--foreground':                 s950,
        '--card':                       '#ffffff',
        '--card-foreground':            s950,
        '--popover':                    '#ffffff',
        '--popover-foreground':         s950,
        '--primary':                    s600,
        '--primary-foreground':         s50,
        '--primary-deep':               s700,
        '--secondary':                  s100,
        '--secondary-foreground':       s900,
        '--muted':                      s100,
        '--muted-foreground':           s700,
        '--accent':                     s200,
        '--accent-foreground':          s900,
        '--gold':                       s400,
        '--border':                     s300,
        '--input':                      s300,
        '--ring':                       s500,
        '--sidebar-background':         s950,
        '--sidebar-foreground':         s50,
        '--sidebar-primary':            s400,
        '--sidebar-primary-foreground': s950,
        '--sidebar-accent':             s800,
        '--sidebar-accent-foreground':  s50,
        '--sidebar-border':             s900,
        '--sidebar-ring':               s500,
    };
}

export const THEMES: Record<ThemeKey, Theme> = {
    'rusty-nail': {
        label: 'Rusty Nail',
        sidebar: '#382010', primary: '#a87926',
        vars: palette(
            '#faf8ec', '#f4efcd', '#eade9e', '#dec666',
            '#d2ae3d', '#c3992f', '#a87926', '#8c5d23',
            '#704923', '#613d22', '#382010',
        ),
    },
    'ocean': {
        label: 'Océan',
        sidebar: '#082f49', primary: '#0284c7',
        vars: palette(
            '#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc',
            '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1',
            '#075985', '#0c4a6e', '#082f49',
        ),
    },
    'forest': {
        label: 'Forêt',
        sidebar: '#072117', primary: '#22775a',
        vars: palette(
            '#f0f9f4', '#d7f0e3', '#aedfc9', '#77c9a9',
            '#4ab08a', '#2f9270', '#22775a', '#1a5f47',
            '#154b38', '#0f3929', '#072117',
        ),
    },
    'burgundy': {
        label: 'Bourgogne',
        sidebar: '#35080e', primary: '#a52031',
        vars: palette(
            '#fdf2f4', '#fad9df', '#f5b3bc', '#ed7d8c',
            '#de4f5e', '#c62f40', '#a52031', '#881927',
            '#6f131f', '#5c0f19', '#35080e',
        ),
    },
    'plum': {
        label: 'Prune',
        sidebar: '#3b0764', primary: '#9333ea',
        vars: palette(
            '#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe',
            '#c084fc', '#a855f7', '#9333ea', '#7e22ce',
            '#6b21a8', '#581c87', '#3b0764',
        ),
    },
    'teal': {
        label: 'Sarcelle',
        sidebar: '#042f2e', primary: '#0d9488',
        vars: palette(
            '#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4',
            '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e',
            '#115e59', '#134e4a', '#042f2e',
        ),
    },
    'copper': {
        label: 'Cuivre',
        sidebar: '#3b1205', primary: '#c24a10',
        vars: palette(
            '#fef5ec', '#fde8d0', '#fbd0a2', '#f8ae6b',
            '#f28335', '#de6019', '#c24a10', '#a13a0e',
            '#842e0d', '#6d260d', '#3b1205',
        ),
    },
    'sage': {
        label: 'Sauge',
        sidebar: '#0c1e12', primary: '#326d44',
        vars: palette(
            '#f2f7f3', '#dcebdf', '#b9d7c0', '#8cbf98',
            '#61a372', '#448757', '#326d44', '#275735',
            '#1d4429', '#163520', '#0c1e12',
        ),
    },
    'indigo': {
        label: 'Indigo',
        sidebar: '#1e1b4b', primary: '#4f46e5',
        vars: palette(
            '#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc',
            '#818cf8', '#6366f1', '#4f46e5', '#4338ca',
            '#3730a3', '#312e81', '#1e1b4b',
        ),
    },
    'terracotta': {
        label: 'Terracotta',
        sidebar: '#350f07', primary: '#af4019',
        vars: palette(
            '#fdf4ef', '#fae5d8', '#f5c9b1', '#eda37e',
            '#e27749', '#cc5526', '#af4019', '#913215',
            '#772812', '#62200e', '#350f07',
        ),
    },
    'pine': {
        label: 'Pin',
        sidebar: '#022c22', primary: '#059669',
        vars: palette(
            '#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7',
            '#34d399', '#10b981', '#059669', '#047857',
            '#065f46', '#064e3b', '#022c22',
        ),
    },
    'mauve': {
        label: 'Mauve',
        sidebar: '#340930', primary: '#9f2595',
        vars: palette(
            '#fbf0fa', '#f5d5f3', '#eeabe8', '#e478de',
            '#d44fcb', '#be32b3', '#9f2595', '#841c7b',
            '#6d1665', '#591153', '#340930',
        ),
    },
    'navy': {
        label: 'Marine',
        sidebar: '#172554', primary: '#2563eb',
        vars: palette(
            '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd',
            '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8',
            '#1e40af', '#1e3a8a', '#172554',
        ),
    },
    'rose': {
        label: 'Rose',
        sidebar: '#4c0519', primary: '#e11d48',
        vars: palette(
            '#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af',
            '#fb7185', '#f43f5e', '#e11d48', '#be123c',
            '#9f1239', '#881337', '#4c0519',
        ),
    },
    'slate': {
        label: 'Ardoise',
        sidebar: '#020617', primary: '#475569',
        vars: palette(
            '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1',
            '#94a3b8', '#64748b', '#475569', '#334155',
            '#1e293b', '#0f172a', '#020617',
        ),
    },
    'olive': {
        label: 'Olive',
        sidebar: '#1c2106', primary: '#647418',
        vars: palette(
            '#f5f7e8', '#e8eccc', '#d1d99a', '#b5c462',
            '#9aae35', '#7e9022', '#647418', '#4f5c12',
            '#3e490e', '#323b0b', '#1c2106',
        ),
    },
    'jade': {
        label: 'Jade',
        sidebar: '#052722', primary: '#0f8171',
        vars: palette(
            '#effaf7', '#d0f2eb', '#a3e5d7', '#66d1be',
            '#2fbaa5', '#179e8b', '#0f8171', '#0d685c',
            '#0c5349', '#0b433b', '#052722',
        ),
    },
    'dusk': {
        label: 'Crépuscule',
        sidebar: '#2e1065', primary: '#7c3aed',
        vars: palette(
            '#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd',
            '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9',
            '#5b21b6', '#4c1d95', '#2e1065',
        ),
    },
    'sienna': {
        label: 'Sienne',
        sidebar: '#3f1106', primary: '#c9430d',
        vars: palette(
            '#fef5ed', '#fde4d0', '#fac9a4', '#f7a46d',
            '#f27a37', '#e55a14', '#c9430d', '#a8350c',
            '#8b2a0c', '#73230c', '#3f1106',
        ),
    },
    'cobalt': {
        label: 'Cobalt',
        sidebar: '#0f163f', primary: '#2b44d0',
        vars: palette(
            '#eef1fe', '#d9e0fc', '#b6c5fa', '#85a0f6',
            '#5878ef', '#3b5ae3', '#2b44d0', '#2237b0',
            '#1c2c90', '#182373', '#0f163f',
        ),
    },
};

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

export function applyTheme(key: ThemeKey): void {
    const theme = THEMES[key];
    if (!theme) return;
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([prop, value]) => {
        root.style.setProperty(prop, value);
    });
}
