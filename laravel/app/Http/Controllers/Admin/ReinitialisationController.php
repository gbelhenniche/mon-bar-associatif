<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReinitialisationController extends Controller
{
    public function index()
    {
        $question = DB::table('parametres')->where('cle', 'reinit_question')->value('valeur')
            ?? '';

        return Inertia::render('Admin/Reinitialisation', ['reinitQuestion' => $question]);
    }

    public function clearProduits(Request $request)
    {
        $this->checkConfirmation($request);
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('mouvements_stock')->truncate();
        DB::table('produits')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
        return back()->with('success', 'Tous les produits et mouvements de stock ont été supprimés.');
    }

    public function clearStocks(Request $request)
    {
        $this->checkConfirmation($request);
        DB::table('mouvements_stock')->truncate();
        DB::table('produits')->update(['stock_actuel' => 0]);
        return back()->with('success', 'Les niveaux de stock ont été remis à zéro et l\'historique effacé.');
    }

    public function clearAdherents(Request $request)
    {
        $this->checkConfirmation($request);
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('adherents')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
        return back()->with('success', 'Tous les adhérents ont été supprimés.');
    }

    public function clearCaisse(Request $request)
    {
        $this->checkConfirmation($request);
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('vente_items')->truncate();
        DB::table('ventes')->truncate();
        DB::table('sessions_caisse')->truncate();
        DB::table('mouvements_caisse')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
        return back()->with('success', 'Toutes les données de caisse ont été supprimées.');
    }

    private function checkConfirmation(Request $request): void
    {
        $expected = mb_strtolower(
            DB::table('parametres')->where('cle', 'reinit_reponse')->value('valeur') ?? ''
        );

        $request->validate([
            'confirmation' => ['required', function ($attr, $value, $fail) use ($expected) {
                $given = mb_strtolower(
                    str_replace(['à','â','è','é','ê','ë','î','ï','ô','ù','û','ü','ÿ','œ','æ'],
                                ['a','a','e','e','e','e','i','i','o','u','u','u','y','oe','ae'],
                                (string) $value)
                );
                if ($given !== $expected) {
                    $fail('Réponse incorrecte.');
                }
            }],
        ]);
    }
}
