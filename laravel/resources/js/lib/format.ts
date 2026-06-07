export const eur = (v: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);

export const num = (v: number) =>
    new Intl.NumberFormat('fr-FR').format(v);
