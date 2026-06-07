<?php

namespace App\Http\Controllers;

use App\Models\{Materiel, MaterielVariation, MaterielType, Fournisseur};
use Illuminate\Http\Request;
use Inertia\Inertia;

class MaterielController extends Controller
{
    public function index()
    {
        $materiels = Materiel::orderBy('nom')->get();
        $types = MaterielType::orderBy('ordre')->get(['id', 'nom']);
        $fournisseurs = Fournisseur::where('visible', true)->orderBy('nom')->get(['id', 'nom']);
        return Inertia::render('Stocks', compact('materiels', 'types', 'fournisseurs'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nom'          => 'required|string|max:255',
            'type'         => 'nullable|string|max:100',
            'fournisseur'  => 'nullable|string|max:100',
            'seuil_alerte' => 'integer|min:0',
            'note'         => 'nullable|string',
            'visible'      => 'boolean',
        ]);
        $data['quantite'] = 0;
        Materiel::create($data);
        return back();
    }

    public function update(Request $request, Materiel $materiel)
    {
        $data = $request->validate([
            'nom'          => 'required|string|max:255',
            'type'         => 'nullable|string|max:100',
            'fournisseur'  => 'nullable|string|max:100',
            'seuil_alerte' => 'integer|min:0',
            'note'         => 'nullable|string',
            'visible'      => 'boolean',
        ]);
        $materiel->update($data);
        return back();
    }

    public function destroy(Materiel $materiel)
    {
        $materiel->delete();
        return back();
    }

    public function incrementer(Materiel $materiel)
    {
        $materiel->increment('quantite');
        MaterielVariation::create(['materiel_id' => $materiel->id, 'variation' => 1]);
        return back();
    }

    public function decrementer(Materiel $materiel)
    {
        $materiel->decrement('quantite');
        MaterielVariation::create(['materiel_id' => $materiel->id, 'variation' => -1]);
        return back();
    }

    public function historique(Materiel $materiel)
    {
        $variations = MaterielVariation::where('materiel_id', $materiel->id)
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($variations);
    }
}
