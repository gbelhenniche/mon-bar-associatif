<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{Categorie, Produit, SessionCaisse, VenteItem};
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AnalyseProduitsController extends Controller
{
    public function index()
    {
        $categories = Categorie::orderBy('ordre')->orderBy('nom')->get(['id', 'nom']);

        $sessions = SessionCaisse::whereNotNull('closed_at')
            ->orderByDesc('opened_at')
            ->limit(120)
            ->get(['id', 'nom', 'opened_at', 'closed_at'])
            ->map(fn($s) => [
                'id'    => $s->id,
                'label' => $s->nom ?: ('Session · ' . Carbon::parse($s->opened_at)->locale('fr')->isoFormat('D MMM YYYY')),
            ]);

        return Inertia::render('Admin/AnalyseProduits', compact('categories', 'sessions'));
    }

    public function data(Request $request)
    {
        $dateDebut   = $request->date_debut;
        $dateFin     = $request->date_fin;
        $sessionId   = $request->session_id;
        $ventilation = $request->ventilation ?? 'none';
        $categorieId = $request->categorie_id;

        // Fermeture appliquant les filtres communs à toute requête VenteItem
        $applyFilters = function ($q) use ($sessionId, $dateDebut, $dateFin, $categorieId) {
            $q->join('ventes', 'ventes.id', '=', 'vente_items.vente_id')
              ->leftJoin('produits', 'produits.id', '=', 'vente_items.produit_id')
              ->leftJoin('categories', 'categories.id', '=', 'produits.categorie_id');

            if ($sessionId) {
                $q->where('ventes.session_id', $sessionId);
            } else {
                if ($dateDebut) $q->whereDate('ventes.created_at', '>=', $dateDebut);
                if ($dateFin)   $q->whereDate('ventes.created_at', '<=', $dateFin);
            }

            if ($categorieId) {
                $q->where('produits.categorie_id', $categorieId);
            }

            return $q;
        };

        // 1. Stats globales
        $statsRow = $applyFilters(VenteItem::query())
            ->selectRaw('
                COUNT(DISTINCT vente_items.produit_nom) as nb_refs,
                COALESCE(SUM(vente_items.quantite), 0) as quantite_totale,
                COALESCE(SUM(vente_items.total_ligne), 0) as ca_total
            ')
            ->first();

        $caTotal        = (float) $statsRow->ca_total;
        $quantiteTotale = (float) $statsRow->quantite_totale;
        $nbRefs         = (int)   $statsRow->nb_refs;
        $prixMoyenArt   = $quantiteTotale > 0 ? round($caTotal / $quantiteTotale, 2) : 0;

        // 2. Tous les produits vendus avec leurs agrégats
        $allProducts = $applyFilters(VenteItem::query())
            ->groupBy('vente_items.produit_nom', 'categories.nom', 'categories.couleur')
            ->selectRaw("
                vente_items.produit_nom                            as nom,
                COALESCE(categories.nom, 'Sans catégorie')        as categorie,
                COALESCE(categories.couleur, '#888888')           as couleur,
                COALESCE(SUM(vente_items.quantite), 0)            as quantite,
                COALESCE(SUM(vente_items.total_ligne), 0)         as ca,
                COALESCE(AVG(vente_items.prix_unitaire), 0)       as prix_moyen
            ")
            ->get()
            ->map(fn($r) => (object) [
                'nom'        => $r->nom,
                'categorie'  => $r->categorie,
                'couleur'    => $r->couleur,
                'quantite'   => (float) $r->quantite,
                'ca'         => round((float) $r->ca, 2),
                'prix_moyen' => round((float) $r->prix_moyen, 2),
            ]);

        // Top 20 par quantité
        $topVolume = $allProducts->sortByDesc('quantite')->values()->take(20)
            ->map(fn($r) => [
                'nom'        => $r->nom,
                'categorie'  => $r->categorie,
                'couleur'    => $r->couleur,
                'quantite'   => $r->quantite,
                'ca'         => $r->ca,
                'prix_moyen' => $r->prix_moyen,
            ])->values();

        // Top 20 par CA
        $topCA = $allProducts->sortByDesc('ca')->values()->take(20)
            ->map(fn($r) => [
                'nom'        => $r->nom,
                'categorie'  => $r->categorie,
                'couleur'    => $r->couleur,
                'quantite'   => $r->quantite,
                'ca'         => $r->ca,
                'prix_moyen' => $r->prix_moyen,
            ])->values();

        // Flop 10 (vendus mais peu) — exclut les lignes à quantité nulle ou négative
        $flopVolume = $allProducts->filter(fn($r) => $r->quantite > 0)
            ->sortBy('quantite')->values()->take(10)
            ->map(fn($r) => [
                'nom'       => $r->nom,
                'categorie' => $r->categorie,
                'couleur'   => $r->couleur,
                'quantite'  => $r->quantite,
                'ca'        => $r->ca,
            ])->values();

        // Répartition par catégorie
        $parCategorie = $allProducts->groupBy('categorie')->map(function ($group, $catNom) use ($caTotal) {
            $catCA  = $group->sum('ca');
            $catQte = $group->sum('quantite');
            return [
                'categorie' => $catNom,
                'couleur'   => $group->first()->couleur,
                'nb_refs'   => $group->count(),
                'quantite'  => (float) $catQte,
                'ca'        => round((float) $catCA, 2),
                'pct_ca'    => $caTotal > 0 ? round($catCA / $caTotal * 100, 1) : 0,
            ];
        })->sortByDesc('ca')->values();

        // Top 5 produits par catégorie (pour la comparaison intra-catégorie)
        $parCategorieTop = $allProducts->groupBy('categorie')->map(function ($group, $catNom) {
            $sorted = $group->sortByDesc('ca')->values();
            return [
                'categorie' => $catNom,
                'couleur'   => $group->first()->couleur,
                'total_ca'  => round($group->sum('ca'), 2),
                'produits'  => $sorted->take(5)->map(fn($r) => [
                    'nom'      => $r->nom,
                    'quantite' => $r->quantite,
                    'ca'       => $r->ca,
                ])->values(),
            ];
        })->sortByDesc('total_ca')->values()->take(8);

        // 3. IDs des produits vendus (pour la liste des non-vendus)
        $vendusIds = $applyFilters(VenteItem::query())
            ->whereNotNull('vente_items.produit_id')
            ->distinct()
            ->pluck('vente_items.produit_id');

        // 4. Produits actifs non vendus sur la période
        $nonVendus = Produit::where('actif', true)
            ->whereNotIn('id', $vendusIds->isEmpty() ? ['__none__'] : $vendusIds)
            ->when($categorieId, fn($q) => $q->where('categorie_id', $categorieId))
            ->with('categorie:id,nom')
            ->orderBy('nom')
            ->get(['id', 'nom', 'reference', 'stock_actuel', 'suivi_stock', 'categorie_id'])
            ->map(fn($p) => [
                'nom'         => $p->nom,
                'reference'   => $p->reference,
                'categorie'   => $p->categorie?->nom ?? 'Sans catégorie',
                'stock'       => (float) $p->stock_actuel,
                'suivi_stock' => (bool) $p->suivi_stock,
            ]);

        // 5. Ventilation temporelle
        $ventilationData = [];
        if ($ventilation === 'jour') {
            $rows = $applyFilters(VenteItem::query())
                ->selectRaw('
                    DAYOFWEEK(ventes.created_at)          as day_num,
                    COALESCE(SUM(vente_items.quantite), 0) as quantite,
                    COALESCE(SUM(vente_items.total_ligne), 0) as ca
                ')
                ->groupByRaw('DAYOFWEEK(ventes.created_at)')
                ->orderBy('day_num')
                ->get();

            $dayNames = [1 => 'Dimanche', 2 => 'Lundi', 3 => 'Mardi', 4 => 'Mercredi', 5 => 'Jeudi', 6 => 'Vendredi', 7 => 'Samedi'];
            $ventilationData = $rows->map(fn($r) => [
                'label'    => $dayNames[$r->day_num] ?? "Jour {$r->day_num}",
                'day'      => (int) $r->day_num,
                'quantite' => (float) $r->quantite,
                'ca'       => round((float) $r->ca, 2),
            ])->values();

        } elseif ($ventilation === 'mois') {
            $rows = $applyFilters(VenteItem::query())
                ->selectRaw("
                    DATE_FORMAT(ventes.created_at, '%Y-%m')   as mois,
                    COALESCE(SUM(vente_items.quantite), 0)    as quantite,
                    COALESCE(SUM(vente_items.total_ligne), 0) as ca
                ")
                ->groupByRaw("DATE_FORMAT(ventes.created_at, '%Y-%m')")
                ->orderBy('mois')
                ->get();

            $ventilationData = $rows->map(function ($r) {
                $d = Carbon::parse($r->mois . '-01');
                return [
                    'label'    => ucfirst($d->locale('fr')->isoFormat('MMMM YYYY')),
                    'mois'     => $r->mois,
                    'quantite' => (float) $r->quantite,
                    'ca'       => round((float) $r->ca, 2),
                ];
            })->values();
        }

        return response()->json([
            'stats' => [
                'nb_refs_vendues'  => $nbRefs,
                'quantite_totale'  => $quantiteTotale,
                'ca_total'         => round($caTotal, 2),
                'prix_moyen_article' => $prixMoyenArt,
            ],
            'top_volume'        => $topVolume,
            'top_ca'            => $topCA,
            'flop_volume'       => $flopVolume,
            'par_categorie'     => $parCategorie,
            'par_categorie_top' => $parCategorieTop,
            'non_vendus'        => $nonVendus,
            'ventilation'       => $ventilationData,
        ]);
    }
}
