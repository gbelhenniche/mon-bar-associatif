<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{Categorie, Produit, SessionCaisse};
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AnalyseStocksController extends Controller
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
                'debut' => Carbon::parse($s->opened_at)->toDateString(),
                'fin'   => Carbon::parse($s->closed_at)->toDateString(),
            ]);

        return Inertia::render('Admin/AnalyseStocks', compact('categories', 'sessions'));
    }

    public function data(Request $request)
    {
        $dateDebut   = $request->date_debut;
        $dateFin     = $request->date_fin;
        $sessionId   = $request->session_id;
        $ventilation = $request->ventilation ?? 'none';
        $categorieId = $request->categorie_id;

        // Session → dérive la plage de dates depuis les timestamps de session
        if ($sessionId) {
            $session = SessionCaisse::find($sessionId);
            if ($session) {
                $dateDebut = Carbon::parse($session->opened_at)->toDateString();
                $dateFin   = Carbon::parse($session->closed_at)->toDateString();
            }
        }

        $nbDays = $this->calcNbDays($dateDebut, $dateFin);

        // Fabrique de requête filtrée sur mouvements_stock
        $base = fn() => DB::table('mouvements_stock')
            ->join('produits', 'produits.id', '=', 'mouvements_stock.produit_id')
            ->leftJoin('categories', 'categories.id', '=', 'produits.categorie_id')
            ->where('produits.suivi_stock', true)
            ->when($dateDebut,   fn($q) => $q->whereDate('mouvements_stock.created_at', '>=', $dateDebut))
            ->when($dateFin,     fn($q) => $q->whereDate('mouvements_stock.created_at', '<=', $dateFin))
            ->when($categorieId, fn($q) => $q->where('produits.categorie_id', $categorieId));

        // ── KPIs (état courant du stock, indépendant de la période) ──────────
        $produits = Produit::where('suivi_stock', true)->where('actif', true)
            ->when($categorieId, fn($q) => $q->where('categorie_id', $categorieId))
            ->get(['id', 'nom', 'stock_actuel', 'stock_minimum', 'categorie_id']);

        $nbRupture  = $produits->where('stock_actuel', '<=', 0)->count();
        $nbSousMin  = $produits->filter(fn($p) => $p->stock_actuel > 0 && $p->stock_actuel <= $p->stock_minimum)->count();
        $nbReappros = $base()->where('mouvements_stock.type', 'entree')->count();

        // ── Consommation par produit (vente + sortie) ─────────────────────────
        $consommations = $base()
            ->whereIn('mouvements_stock.type', ['vente', 'sortie'])
            ->selectRaw("
                produits.id                                                  as produit_id,
                produits.nom                                                 as nom,
                COALESCE(categories.nom, 'Sans catégorie')                  as categorie,
                COALESCE(categories.couleur, '#888888')                      as couleur,
                COALESCE(SUM(mouvements_stock.quantite), 0)                 as total_sorti
            ")
            ->groupBy('produits.id', 'produits.nom', 'categories.nom', 'categories.couleur')
            ->get()
            ->map(fn($r) => [
                'produit_id'      => $r->produit_id,
                'nom'             => $r->nom,
                'categorie'       => $r->categorie,
                'couleur'         => $r->couleur,
                'total_sorti'     => round((float) $r->total_sorti, 2),
                'taux_journalier' => round((float) $r->total_sorti / $nbDays, 3),
            ])
            ->keyBy('produit_id');

        // ── Réapprovisionnements par produit (entree) ─────────────────────────
        $reappros = $base()
            ->where('mouvements_stock.type', 'entree')
            ->selectRaw("
                produits.id                                                  as produit_id,
                produits.nom                                                 as nom,
                COALESCE(categories.nom, 'Sans catégorie')                  as categorie,
                COALESCE(categories.couleur, '#888888')                      as couleur,
                COALESCE(SUM(mouvements_stock.quantite), 0)                 as total_entre,
                COUNT(*)                                                     as nb_reappros
            ")
            ->groupBy('produits.id', 'produits.nom', 'categories.nom', 'categories.couleur')
            ->get()
            ->map(fn($r) => [
                'produit_id'       => $r->produit_id,
                'nom'              => $r->nom,
                'categorie'        => $r->categorie,
                'couleur'          => $r->couleur,
                'total_entre'      => round((float) $r->total_entre, 2),
                'nb_reappros'      => (int) $r->nb_reappros,
                // intervalle_moyen : pertinent seulement si on a ≥ 2 événements
                'intervalle_moyen' => (int)$r->nb_reappros > 1
                    ? round($nbDays / (int)$r->nb_reappros, 1)
                    : null,
            ])
            ->keyBy('produit_id');

        // ── Produits à risque ─────────────────────────────────────────────────
        $stockMap = $produits->keyBy('id');
        $risques = $consommations
            ->filter(fn($c) => $c['taux_journalier'] > 0)
            ->map(function ($c) use ($stockMap) {
                $p = $stockMap->get($c['produit_id']);
                if (!$p) return null;
                $jours = $p->stock_actuel > 0
                    ? (int) floor($p->stock_actuel / $c['taux_journalier'])
                    : 0;
                return [
                    'nom'                 => $c['nom'],
                    'categorie'           => $c['categorie'],
                    'couleur'             => $c['couleur'],
                    'stock_actuel'        => (float) $p->stock_actuel,
                    'stock_minimum'       => (float) $p->stock_minimum,
                    'taux_journalier'     => $c['taux_journalier'],
                    'jours_avant_rupture' => $jours,
                ];
            })
            ->filter()
            ->sortBy('jours_avant_rupture')
            ->values()
            ->take(20);

        // ── Scatter : consommation quotidienne × fréquence de réappro ─────────
        $scatter = $consommations
            ->filter(fn($c) =>
                $c['taux_journalier'] > 0
                && $reappros->has($c['produit_id'])
                && $reappros->get($c['produit_id'])['intervalle_moyen'] !== null
            )
            ->map(fn($c) => [
                'nom'      => $c['nom'],
                'categorie'=> $c['categorie'],
                'couleur'  => $c['couleur'],
                'x'        => $c['taux_journalier'],
                'y'        => $reappros->get($c['produit_id'])['intervalle_moyen'],
            ])
            ->values();

        // ── Ventilation temporelle ─────────────────────────────────────────────
        $ventilationData = $this->buildVentilation($base, $ventilation);

        return response()->json([
            'kpis' => [
                'nb_produits_suivis'  => $produits->count(),
                'nb_en_rupture'       => $nbRupture,
                'nb_sous_minimum'     => $nbSousMin,
                'nb_reappros_periode' => $nbReappros,
                'nb_jours'            => $nbDays,
            ],
            'top_reappros' => $reappros->sortByDesc('nb_reappros')->values()->take(15),
            'top_conso'    => $consommations->sortByDesc('taux_journalier')->values()->take(15),
            'risques'      => $risques,
            'scatter'      => $scatter,
            'ventilation'  => $ventilationData,
        ]);
    }

    private function calcNbDays(?string $debut, ?string $fin): int
    {
        if ($debut && $fin) {
            return max(1, Carbon::parse($debut)->diffInDays(Carbon::parse($fin)) + 1);
        }
        if ($debut) {
            return max(1, Carbon::parse($debut)->diffInDays(now()) + 1);
        }
        $earliest = DB::table('mouvements_stock')->min('created_at');
        $start = $earliest ? Carbon::parse($earliest) : now()->subYear();
        $end   = $fin ? Carbon::parse($fin) : now();
        return max(1, (int) $start->diffInDays($end) + 1);
    }

    private function buildVentilation(callable $base, string $ventilation): array
    {
        if ($ventilation === 'jour') {
            $entrees = $base()->where('mouvements_stock.type', 'entree')
                ->selectRaw('DAYOFWEEK(mouvements_stock.created_at) as grp, COALESCE(SUM(mouvements_stock.quantite), 0) as qte')
                ->groupBy('grp')->pluck('qte', 'grp');

            $sorties = $base()->whereIn('mouvements_stock.type', ['vente', 'sortie'])
                ->selectRaw('DAYOFWEEK(mouvements_stock.created_at) as grp, COALESCE(SUM(mouvements_stock.quantite), 0) as qte')
                ->groupBy('grp')->pluck('qte', 'grp');

            $dayNames = [1 => 'Dimanche', 2 => 'Lundi', 3 => 'Mardi', 4 => 'Mercredi', 5 => 'Jeudi', 6 => 'Vendredi', 7 => 'Samedi'];
            $keys = array_unique(array_merge($entrees->keys()->toArray(), $sorties->keys()->toArray()));
            sort($keys);
            return array_map(fn($d) => [
                'label'   => $dayNames[$d] ?? "Jour $d",
                'entrees' => round((float) ($entrees[$d] ?? 0), 2),
                'sorties' => round((float) ($sorties[$d] ?? 0), 2),
            ], $keys);
        }

        if ($ventilation === 'mois') {
            $entrees = $base()->where('mouvements_stock.type', 'entree')
                ->selectRaw("DATE_FORMAT(mouvements_stock.created_at, '%Y-%m') as grp, COALESCE(SUM(mouvements_stock.quantite), 0) as qte")
                ->groupBy('grp')->pluck('qte', 'grp');

            $sorties = $base()->whereIn('mouvements_stock.type', ['vente', 'sortie'])
                ->selectRaw("DATE_FORMAT(mouvements_stock.created_at, '%Y-%m') as grp, COALESCE(SUM(mouvements_stock.quantite), 0) as qte")
                ->groupBy('grp')->pluck('qte', 'grp');

            $keys = array_unique(array_merge($entrees->keys()->toArray(), $sorties->keys()->toArray()));
            sort($keys);
            return array_map(fn($m) => [
                'label'   => ucfirst(Carbon::parse($m . '-01')->locale('fr')->isoFormat('MMMM YYYY')),
                'entrees' => round((float) ($entrees[$m] ?? 0), 2),
                'sorties' => round((float) ($sorties[$m] ?? 0), 2),
            ], $keys);
        }

        return [];
    }
}
