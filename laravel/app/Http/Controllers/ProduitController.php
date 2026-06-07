<?php
namespace App\Http\Controllers;

use App\Models\{Produit, Categorie, Fournisseur, MouvementStock};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProduitController extends Controller
{
    public function index()
    {
        $produits = Produit::with('categorie')->orderBy('nom')->get();
        $categories = Categorie::orderBy('ordre')->get(['id', 'nom', 'icone', 'couleur']);
        $fournisseurs = Fournisseur::where('visible', true)->orderBy('nom')->get(['id', 'nom']);
        return Inertia::render('Produits', compact('produits', 'categories', 'fournisseurs'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nom'                => 'required|string|max:255',
            'reference'          => 'nullable|string',
            'categorie_id'       => 'nullable|exists:categories,id',
            'format'             => 'nullable|string',
            'fournisseur'        => 'nullable|string',
            'prix_achat'         => 'numeric|min:0',
            'prix_vente'         => 'numeric|min:0',
            'stock_actuel'       => 'numeric',
            'stock_minimum'      => 'numeric|min:0',
            'suivi_stock'        => 'boolean',
            'visibilite'         => 'in:visible,masque,visible_jusqu_au',
            'visibilite_jusqu_au'=> 'nullable|date|required_if:visibilite,visible_jusqu_au',
        ]);
        if (($data['visibilite'] ?? 'visible') !== 'visible_jusqu_au') {
            $data['visibilite_jusqu_au'] = null;
        }
        Produit::create($data);
        return back();
    }

    public function update(Request $request, Produit $produit)
    {
        $data = $request->validate([
            'nom'                => 'required|string|max:255',
            'reference'          => 'nullable|string',
            'categorie_id'       => 'nullable|exists:categories,id',
            'format'             => 'nullable|string',
            'fournisseur'        => 'nullable|string',
            'prix_achat'         => 'numeric|min:0',
            'prix_vente'         => 'numeric|min:0',
            'stock_actuel'       => 'numeric',
            'stock_minimum'      => 'numeric|min:0',
            'suivi_stock'        => 'boolean',
            'visibilite'         => 'in:visible,masque,visible_jusqu_au',
            'visibilite_jusqu_au'=> 'nullable|date|required_if:visibilite,visible_jusqu_au',
        ]);
        if (($data['visibilite'] ?? 'visible') !== 'visible_jusqu_au') {
            $data['visibilite_jusqu_au'] = null;
        }
        $produit->update($data);
        return back();
    }

    public function destroy(Produit $produit)
    {
        $produit->delete();
        return back();
    }

    public function incrementer(Request $request, Produit $produit)
    {
        $data = $request->validate(['quantite' => 'required|numeric|min:0.01']);
        $produit->increment('stock_actuel', $data['quantite']);
        MouvementStock::create([
            'produit_id' => $produit->id,
            'user_id'    => auth()->id(),
            'type'       => 'entree',
            'quantite'   => $data['quantite'],
            'note'       => $request->input('note'),
        ]);
        return back();
    }

    public function decrementer(Request $request, Produit $produit)
    {
        $data = $request->validate(['quantite' => 'required|numeric|min:0.01']);
        $produit->decrement('stock_actuel', $data['quantite']);
        MouvementStock::create([
            'produit_id' => $produit->id,
            'user_id'    => auth()->id(),
            'type'       => 'sortie',
            'quantite'   => $data['quantite'],
            'note'       => $request->input('note'),
        ]);
        return back();
    }

    public function historique(Produit $produit)
    {
        $mouvements = DB::table('mouvements_stock')
            ->leftJoin('users', 'users.id', '=', 'mouvements_stock.user_id')
            ->where('mouvements_stock.produit_id', $produit->id)
            ->orderByDesc('mouvements_stock.created_at')
            ->limit(100)
            ->select(
                'mouvements_stock.id',
                'mouvements_stock.type',
                'mouvements_stock.quantite',
                'mouvements_stock.note',
                'mouvements_stock.created_at',
                'users.name as user_name',
            )
            ->get();
        return response()->json($mouvements);
    }
}
