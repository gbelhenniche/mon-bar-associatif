<?php
namespace App\Services;

use App\Models\Adherent;
use App\Models\VenteItem;

class AdhesionService
{
    public static function getCurrentAdhesionYear(): int
    {
        return (int) now()->year;
    }

    /** Nombre d'adhérents ayant acheté un produit "Adhésion*<year>*" pour l'année donnée. */
    public static function countValidForYear(int $year): int
    {
        return Adherent::whereHas('ventes', function ($q) use ($year) {
            $q->whereHas('items', function ($q2) use ($year) {
                $q2->where('produit_nom', 'like', 'Adhésion%')
                   ->where('produit_nom', 'like', '%' . $year . '%');
            });
        })->count();
    }

    /** Retourne les noms de produits "Adhésion" achetés par un adhérent, groupés par adherent_id. */
    public static function adhesionProduitsByAdherent(): \Illuminate\Support\Collection
    {
        return VenteItem::join('ventes', 'ventes.id', '=', 'vente_items.vente_id')
            ->whereNotNull('ventes.adherent_id')
            ->where('vente_items.produit_nom', 'like', 'Adhésion%')
            ->select('ventes.adherent_id', 'vente_items.produit_nom')
            ->get()
            ->groupBy('adherent_id')
            ->map(fn($items) => $items->pluck('produit_nom')->unique()->values());
    }
}
