<?php
namespace App\Http\Controllers;
use App\Models\{Produit, Vente, VenteItem, Adherent, ImportsLog, Materiel, Message};
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $today = now()->startOfDay();
        $monthStart = now()->startOfMonth();
        $days30 = now()->subDays(29)->startOfDay();

        $caDay = Vente::where('created_at', '>=', $today)->sum('total');
        $caMonth = Vente::where('created_at', '>=', $monthStart)->sum('total');

        $marge = VenteItem::join('ventes', 'ventes.id', '=', 'vente_items.vente_id')
            ->join('produits', 'produits.id', '=', 'vente_items.produit_id')
            ->where('ventes.created_at', '>=', $days30)
            ->selectRaw('SUM((vente_items.prix_unitaire - produits.prix_achat) * vente_items.quantite) as marge')
            ->value('marge') ?? 0;

        $nbProduits = Produit::where('actif', true)->count();

        $year = now()->year;
        $adhValides = Adherent::whereNull('archived_at')->whereHas('ventes', function ($q) use ($year) {
            $q->whereHas('items', function ($q2) use ($year) {
                $q2->where('produit_nom', 'like', 'Adhésion%')
                   ->where('produit_nom', 'like', '%' . $year . '%');
            });
        })->count();
        $adhExpires = Adherent::whereNull('archived_at')->count() - $adhValides;

        // Stocks épuisés (quantité = 0, non masqués)
        $zeroStock = Produit::where('actif', true)
            ->where('suivi_stock', true)
            ->where('stock_actuel', 0)
            ->orderBy('nom')
            ->get(['id', 'nom', 'stock_actuel', 'stock_minimum']);

        $zeroMateriels = Materiel::where('visible', true)
            ->where('seuil_alerte', '>', 0)
            ->where('quantite', 0)
            ->orderBy('nom')
            ->get(['id', 'nom', 'quantite', 'seuil_alerte']);

        // Stocks faibles (0 < quantité ≤ seuil, non masqués)
        $lowStock = Produit::where('actif', true)
            ->where('suivi_stock', true)
            ->where('stock_actuel', '>', 0)
            ->whereColumn('stock_actuel', '<=', 'stock_minimum')
            ->orderBy('stock_actuel')
            ->get(['id', 'nom', 'stock_actuel', 'stock_minimum']);

        $lowMateriels = Materiel::where('visible', true)
            ->where('seuil_alerte', '>', 0)
            ->where('quantite', '>', 0)
            ->whereColumn('quantite', '<=', 'seuil_alerte')
            ->orderBy('quantite')
            ->get(['id', 'nom', 'quantite', 'seuil_alerte']);

        $topVentes = VenteItem::join('ventes', 'ventes.id', '=', 'vente_items.vente_id')
            ->where('ventes.created_at', '>=', $days30)
            ->groupBy('produit_nom')
            ->selectRaw('produit_nom as nom, SUM(quantite) as qte, SUM(total_ligne) as total')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        $parJour = collect();
        for ($i = 29; $i >= 0; $i--) {
            $day = now()->subDays($i)->toDateString();
            $total = Vente::whereDate('created_at', $day)->sum('total');
            $parJour->push(['day' => \Carbon\Carbon::parse($day)->format('d/m'), 'date' => $day, 'total' => (float)$total]);
        }

        $parCat = VenteItem::join('ventes', 'ventes.id', '=', 'vente_items.vente_id')
            ->join('produits', 'produits.id', '=', 'vente_items.produit_id')
            ->leftJoin('categories', 'categories.id', '=', 'produits.categorie_id')
            ->where('ventes.created_at', '>=', $days30)
            ->groupBy('categories.nom')
            ->selectRaw('COALESCE(categories.nom, "Autre") as name, SUM(vente_items.total_ligne) as value')
            ->orderByDesc('value')
            ->get();

        $parCat = $parCat->map(fn($c) => [
            'name'  => $c->name,
            'value' => (float) $c->value,
        ]);

        $recent = Vente::with('items')->orderByDesc('created_at')->limit(8)->get()
            ->map(fn($v) => ['id'=>$v->id,'total'=>$v->total,'paiement'=>$v->paiement,'created_at'=>$v->created_at,'nb'=>$v->items->count()]);

        $imports = ImportsLog::orderByDesc('created_at')->limit(8)->get();

        // Infos sauvegarde (pour alerte admin)
        $params = DB::table('parametres')->pluck('valeur', 'cle');
        $backupLastDate = $params->get('backup_last_date');
        $backupAlertDays = (int) $params->get('backup_alert_days', 30);
        $backupIsOverdue = $backupLastDate === null
            || now()->diffInDays(\Carbon\Carbon::parse($backupLastDate)) >= $backupAlertDays;

        // Message important actif (non expiré)
        $today = now()->toDateString();
        $messageImportant = Message::where('type', 'important')
            ->where('actif', true)
            ->where(function ($q) use ($today) {
                $q->whereNull('date_fin')->orWhere('date_fin', '>=', $today);
            })
            ->value('contenu');

        // Pool de messages savistu pondéré par fréquence
        $savistuRaw = Message::where('type', 'savistu')->where('actif', true)->get(['contenu', 'frequence']);
        $messagesSavistu = [];
        foreach ($savistuRaw as $msg) {
            $weight = match ($msg->frequence) {
                'tres_frequent' => 4,
                'peu_frequent'  => 1,
                default         => 2,
            };
            for ($w = 0; $w < $weight; $w++) {
                $messagesSavistu[] = $msg->contenu;
            }
        }

        return Inertia::render('Dashboard', compact(
            'caDay','caMonth','marge','nbProduits','adhValides','adhExpires',
            'zeroStock','zeroMateriels','lowStock','lowMateriels',
            'topVentes','parJour','parCat','recent','imports',
            'messageImportant','messagesSavistu',
            'backupLastDate','backupAlertDays','backupIsOverdue'
        ));
    }
}
