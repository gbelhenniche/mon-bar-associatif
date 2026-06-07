<?php
namespace App\Http\Controllers;

use App\Models\{Adherent, SessionCaisse, Vente, VenteItem};
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HistoriqueController extends Controller
{
    public function index()
    {
        return Inertia::render('Historique');
    }

    public function periodes(Request $request)
    {
        $type      = $request->type ?? 'jour';
        $dateDebut = $request->date_debut;
        $dateFin   = $request->date_fin;

        $q = Vente::query();
        if ($dateDebut) $q->whereDate('ventes.created_at', '>=', $dateDebut);
        if ($dateFin)   $q->whereDate('ventes.created_at', '<=', $dateFin);

        if ($type === 'session') {
            $rows = $q
                ->join('sessions_caisse as sc', 'sc.id', '=', 'ventes.session_id')
                ->groupBy('ventes.session_id', 'sc.nom', 'sc.opened_at', 'sc.closed_at')
                ->selectRaw('ventes.session_id as session_id, sc.nom, sc.opened_at, sc.closed_at, COUNT(*) as nb_ventes, COALESCE(SUM(ventes.total), 0) as total')
                ->orderByDesc('sc.opened_at')
                ->get();
            return response()->json($rows->map(function ($r) {
                $opened  = Carbon::parse($r->opened_at);
                $closed  = $r->closed_at ? Carbon::parse($r->closed_at) : null;
                $dateStr = ucfirst($opened->locale('fr')->isoFormat('ddd D MMM YYYY'));
                $timeRange = $opened->format('H:i') . ($closed ? ' – ' . $closed->format('H:i') : ' (en cours)');
                return [
                    'key'        => $r->session_id,
                    'label'      => $r->nom ?: ('Session · ' . $dateStr),
                    'sous_label' => $r->nom ? ($dateStr . ' · ' . $timeRange) : $timeRange,
                    'total'      => (float) $r->total,
                    'nb_ventes'  => (int) $r->nb_ventes,
                ];
            })->values());
        }

        if ($type === 'jour') {
            $rows = $q
                ->selectRaw("DATE(created_at) as date_cle, COALESCE(SUM(total), 0) as total, COUNT(*) as nb_ventes")
                ->groupByRaw("DATE(created_at)")
                ->orderByDesc('date_cle')
                ->get();
            return response()->json($rows->map(function ($r) {
                $d = Carbon::parse($r->date_cle);
                return [
                    'key'        => $r->date_cle,
                    'label'      => ucfirst($d->locale('fr')->isoFormat('dddd D MMMM YYYY')),
                    'sous_label' => null,
                    'total'      => (float) $r->total,
                    'nb_ventes'  => (int) $r->nb_ventes,
                ];
            })->values());
        }

        if ($type === 'semaine') {
            $rows = $q
                ->selectRaw("YEARWEEK(created_at, 1) as yw_cle, MIN(DATE(created_at)) as d_debut, MAX(DATE(created_at)) as d_fin, COALESCE(SUM(total), 0) as total, COUNT(*) as nb_ventes")
                ->groupByRaw("YEARWEEK(created_at, 1)")
                ->orderByDesc('yw_cle')
                ->get();
            return response()->json($rows->map(function ($r) {
                $debut = Carbon::parse($r->d_debut);
                $fin   = Carbon::parse($r->d_fin);
                return [
                    'key'        => (string) $r->yw_cle,
                    'label'      => $debut->locale('fr')->isoFormat('[Semaine] W · YYYY'),
                    'sous_label' => $debut->locale('fr')->isoFormat('D MMM') . ' – ' . $fin->locale('fr')->isoFormat('D MMM YYYY'),
                    'total'      => (float) $r->total,
                    'nb_ventes'  => (int) $r->nb_ventes,
                ];
            })->values());
        }

        if ($type === 'mois') {
            $rows = $q
                ->selectRaw("DATE_FORMAT(created_at, '%Y-%m') as mois_cle, COALESCE(SUM(total), 0) as total, COUNT(*) as nb_ventes")
                ->groupByRaw("DATE_FORMAT(created_at, '%Y-%m')")
                ->orderByDesc('mois_cle')
                ->get();
            return response()->json($rows->map(function ($r) {
                $d = Carbon::parse($r->mois_cle . '-01');
                return [
                    'key'        => $r->mois_cle,
                    'label'      => ucfirst($d->locale('fr')->isoFormat('MMMM YYYY')),
                    'sous_label' => null,
                    'total'      => (float) $r->total,
                    'nb_ventes'  => (int) $r->nb_ventes,
                ];
            })->values());
        }

        if ($type === 'annee') {
            $rows = $q
                ->selectRaw("YEAR(created_at) as annee_cle, COALESCE(SUM(total), 0) as total, COUNT(*) as nb_ventes")
                ->groupByRaw("YEAR(created_at)")
                ->orderByDesc('annee_cle')
                ->get();
            return response()->json($rows->map(fn($r) => [
                'key'        => (string) $r->annee_cle,
                'label'      => (string) $r->annee_cle,
                'sous_label' => null,
                'total'      => (float) $r->total,
                'nb_ventes'  => (int) $r->nb_ventes,
            ])->values());
        }

        return response()->json([]);
    }

    public function detail(Request $request)
    {
        $type = $request->type;
        $key  = $request->key;

        $q = Vente::query()->orderByDesc('created_at');

        if ($type === 'session')     $q->where('session_id', $key);
        elseif ($type === 'jour')    $q->whereDate('created_at', $key);
        elseif ($type === 'semaine') $q->whereRaw("YEARWEEK(created_at, 1) = ?", [$key]);
        elseif ($type === 'mois')    $q->whereRaw("DATE_FORMAT(created_at, '%Y-%m') = ?", [$key]);
        elseif ($type === 'annee')   $q->whereYear('created_at', (int) $key);

        $ventes    = $q->get(['id', 'created_at', 'total', 'paiement', 'adherent_id']);
        $venteIds  = $ventes->pluck('id');

        $items = VenteItem::whereIn('vente_id', $venteIds)
            ->leftJoin('produits', 'produits.id', '=', 'vente_items.produit_id')
            ->leftJoin('categories', 'categories.id', '=', 'produits.categorie_id')
            ->select(
                'vente_items.vente_id',
                'vente_items.produit_nom',
                'vente_items.quantite',
                'vente_items.prix_unitaire',
                'vente_items.total_ligne',
                'categories.nom as categorie_nom'
            )
            ->get()
            ->groupBy('vente_id');

        $adherentIds = $ventes->pluck('adherent_id')->filter()->unique();
        $adherents   = Adherent::whereIn('id', $adherentIds)->get(['id', 'prenom', 'nom'])->keyBy('id');

        $nbProduits   = $items->flatten()->sum('quantite');
        $nbAdherents  = $ventes->pluck('adherent_id')->filter()->unique()->count();
        $totalEspeces = $ventes->where('paiement', 'especes')->sum('total');
        $totalCb      = $ventes->where('paiement', 'cb')->sum('total');

        $ventesData = $ventes->map(function ($v) use ($items, $adherents) {
            $adh = $v->adherent_id ? $adherents->get($v->adherent_id) : null;
            return [
                'id'           => $v->id,
                'created_at'   => $v->created_at,
                'total'        => (float) $v->total,
                'paiement'     => $v->paiement,
                'adherent_nom' => $adh ? ($adh->prenom . ' ' . $adh->nom) : null,
                'items'        => ($items->get($v->id) ?? collect())->map(fn($i) => [
                    'produit_nom'   => $i->produit_nom,
                    'categorie_nom' => $i->categorie_nom,
                    'quantite'      => (int) $i->quantite,
                    'prix_unitaire' => (float) $i->prix_unitaire,
                    'total_ligne'   => (float) $i->total_ligne,
                ])->values(),
            ];
        });

        $sessionMeta = null;
        if ($type === 'session') {
            $sc = SessionCaisse::find($key, ['nom','opened_at','closed_at','fond_ouverture','fond_fermeture','especes_comptees','ecart','notes']);
            if ($sc) {
                $sessionMeta = [
                    'nom'             => $sc->nom,
                    'opened_at'       => $sc->opened_at,
                    'closed_at'       => $sc->closed_at,
                    'fond_ouverture'  => (float) $sc->fond_ouverture,
                    'fond_fermeture'  => $sc->fond_fermeture !== null ? (float) $sc->fond_fermeture : null,
                    'especes_comptees'=> $sc->especes_comptees !== null ? (float) $sc->especes_comptees : null,
                    'ecart'           => $sc->ecart !== null ? (float) $sc->ecart : null,
                    'notes'           => $sc->notes,
                ];
            }
        }

        return response()->json([
            'stats' => [
                'total'        => (float) $ventes->sum('total'),
                'nb_ventes'    => $ventes->count(),
                'nb_produits'  => (int) $nbProduits,
                'nb_adherents' => $nbAdherents,
                'especes'      => (float) $totalEspeces,
                'cb'           => (float) $totalCb,
            ],
            'ventes'       => $ventesData->values(),
            'session_meta' => $sessionMeta,
        ]);
    }
}
