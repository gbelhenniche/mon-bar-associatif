<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{Adherent, Categorie, SessionCaisse, TypeAdherent, Vente, VenteItem};
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AnalyseAdherentsController extends Controller
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

        return Inertia::render('Admin/AnalyseAdherents', compact('categories', 'sessions'));
    }

    public function data(Request $request)
    {
        $dateDebut   = $request->date_debut;
        $dateFin     = $request->date_fin;
        $sessionId   = $request->session_id;
        $ventilation = $request->ventilation ?? 'none';
        $categorieId = $request->categorie_id;

        $venteQuery = Vente::whereNotNull('adherent_id');

        if ($sessionId) {
            $venteQuery->where('session_id', $sessionId);
        } else {
            if ($dateDebut) $venteQuery->whereDate('created_at', '>=', $dateDebut);
            if ($dateFin)   $venteQuery->whereDate('created_at', '<=', $dateFin);
        }

        if ($categorieId) {
            $venteQuery->whereExists(function ($q) use ($categorieId) {
                $q->select(DB::raw(1))
                  ->from('vente_items')
                  ->join('produits', 'produits.id', '=', 'vente_items.produit_id')
                  ->whereColumn('vente_items.vente_id', 'ventes.id')
                  ->where('produits.categorie_id', $categorieId);
            });
        }

        $ventes   = $venteQuery->get(['id', 'adherent_id', 'total', 'created_at']);
        $venteIds = $ventes->pluck('id');

        $adherentIds  = $ventes->pluck('adherent_id')->filter()->unique()->values();
        $adherentsMap = Adherent::whereIn('id', $adherentIds)
            ->get(['id', 'prenom', 'nom', 'numero', 'type_adhesion'])
            ->keyBy('id');

        $typesMap = TypeAdherent::all(['slug', 'nom'])->keyBy('slug');

        // Stats globales
        $nbVentes    = $ventes->count();
        $caTotalAdh  = $ventes->sum('total');
        $panierMoyen = $nbVentes > 0 ? round($caTotalAdh / $nbVentes, 2) : 0;
        $nbAdherents = $adherentIds->count();

        // Panier moyen par type d'adhérent
        $panierParType = $ventes->groupBy(function ($v) use ($adherentsMap) {
            $adh = $adherentsMap->get($v->adherent_id);
            return $adh ? ($adh->type_adhesion ?: '__sans__') : '__sans__';
        })->map(function ($group, $typeSlug) use ($typesMap) {
            $type = $typesMap->get($typeSlug);
            $nb   = $group->count();
            return [
                'type'         => $type ? $type->nom : 'Sans type',
                'nb_ventes'    => $nb,
                'total'        => round($group->sum('total'), 2),
                'panier_moyen' => $nb > 0 ? round($group->sum('total') / $nb, 2) : 0,
            ];
        })->sortByDesc('total')->values();

        // Top 10 par montant
        $topMontant = $ventes->groupBy('adherent_id')->map(function ($group, $adhId) use ($adherentsMap) {
            $adh = $adherentsMap->get($adhId);
            return [
                'nom'       => $adh ? ($adh->prenom . ' ' . $adh->nom) : 'Inconnu',
                'numero'    => $adh ? (int) $adh->numero : null,
                'total'     => round($group->sum('total'), 2),
                'nb_ventes' => $group->count(),
            ];
        })->sortByDesc('total')->values()->take(10);

        // Top 10 par fréquence (nb de jours distincts)
        $topFrequence = $ventes->groupBy('adherent_id')->map(function ($group, $adhId) use ($adherentsMap) {
            $adh     = $adherentsMap->get($adhId);
            $nbJours = $group->pluck('created_at')
                ->map(fn($d) => Carbon::parse($d)->toDateString())
                ->unique()->count();
            return [
                'nom'      => $adh ? ($adh->prenom . ' ' . $adh->nom) : 'Inconnu',
                'numero'   => $adh ? (int) $adh->numero : null,
                'nb_jours' => $nbJours,
                'total'    => round($group->sum('total'), 2),
            ];
        })->sortByDesc('nb_jours')->values()->take(10);

        // Top 10 par volume (quantité d'articles)
        $itemsQ = VenteItem::whereIn('vente_id', $venteIds->isEmpty() ? ['__none__'] : $venteIds);
        if ($categorieId) {
            $itemsQ->join('produits as p_vol', 'p_vol.id', '=', 'vente_items.produit_id')
                   ->where('p_vol.categorie_id', $categorieId)
                   ->select('vente_items.vente_id', 'vente_items.quantite');
        } else {
            $itemsQ->select('vente_items.vente_id', 'vente_items.quantite');
        }
        $items = $itemsQ->get();

        $venteToAdh  = $ventes->pluck('adherent_id', 'id');
        $volumeByAdh = [];
        foreach ($items as $item) {
            $adhId = $venteToAdh->get($item->vente_id);
            if (!$adhId) continue;
            $volumeByAdh[$adhId] = ($volumeByAdh[$adhId] ?? 0) + $item->quantite;
        }
        arsort($volumeByAdh);
        $topVolume = collect($volumeByAdh)->take(10)->map(function ($vol, $adhId) use ($adherentsMap) {
            $adh = $adherentsMap->get($adhId);
            return [
                'nom'    => $adh ? ($adh->prenom . ' ' . $adh->nom) : 'Inconnu',
                'numero' => $adh ? (int) $adh->numero : null,
                'volume' => (float) $vol,
            ];
        })->values();

        // Adhérents absents
        $absentsQuery = Adherent::whereNull('archived_at');
        if ($adherentIds->isNotEmpty()) {
            $absentsQuery->whereNotIn('id', $adherentIds);
        }
        $absents = $absentsQuery->orderBy('nom')->get(['id', 'prenom', 'nom', 'numero', 'type_adhesion'])
            ->map(function ($adh) use ($typesMap) {
                $type = $typesMap->get($adh->type_adhesion);
                return [
                    'nom'    => $adh->prenom . ' ' . $adh->nom,
                    'numero' => (int) $adh->numero,
                    'type'   => $type ? $type->nom : null,
                ];
            });

        // Ventilation temporelle
        $ventilationData = [];
        if ($ventilation === 'jour') {
            $dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
            $ventilationData = $ventes
                ->groupBy(fn($v) => Carbon::parse($v->created_at)->dayOfWeek)
                ->map(function ($group, $dayNum) use ($dayNames) {
                    $nb = $group->count();
                    return [
                        'label'        => $dayNames[$dayNum] ?? "Jour $dayNum",
                        'day'          => (int) $dayNum,
                        'nb_ventes'    => $nb,
                        'total'        => round($group->sum('total'), 2),
                        'nb_adherents' => $group->pluck('adherent_id')->unique()->count(),
                        'panier_moyen' => $nb > 0 ? round($group->sum('total') / $nb, 2) : 0,
                    ];
                })
                ->sortBy('day')
                ->values();
        } elseif ($ventilation === 'mois') {
            $ventilationData = $ventes
                ->groupBy(fn($v) => Carbon::parse($v->created_at)->format('Y-m'))
                ->map(function ($group, $mois) {
                    $nb = $group->count();
                    $d  = Carbon::parse($mois . '-01');
                    return [
                        'label'        => ucfirst($d->locale('fr')->isoFormat('MMMM YYYY')),
                        'mois'         => $mois,
                        'nb_ventes'    => $nb,
                        'total'        => round($group->sum('total'), 2),
                        'nb_adherents' => $group->pluck('adherent_id')->unique()->count(),
                        'panier_moyen' => $nb > 0 ? round($group->sum('total') / $nb, 2) : 0,
                    ];
                })
                ->sortBy('mois')
                ->values();
        }

        return response()->json([
            'stats' => [
                'nb_adherents' => $nbAdherents,
                'nb_ventes'    => $nbVentes,
                'ca_total'     => round($caTotalAdh, 2),
                'panier_moyen' => $panierMoyen,
            ],
            'panier_par_type' => $panierParType,
            'top_montant'     => $topMontant,
            'top_volume'      => $topVolume,
            'top_frequence'   => $topFrequence,
            'absents'         => $absents,
            'ventilation'     => $ventilationData,
        ]);
    }
}
