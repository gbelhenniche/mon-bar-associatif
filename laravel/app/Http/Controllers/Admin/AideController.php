<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AideRubrique;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AideController extends Controller
{
    const RUBRIQUES = [
        'dashboard'    => 'Tableau de bord',
        'caisse'       => 'Caisse',
        'historique'   => 'Historique',
        'produits'     => 'Produits',
        'materiels'    => 'Stocks matériel',
        'fournisseurs' => 'Fournisseurs',
        'adherents'    => 'Adhérents',
    ];

    public function index()
    {
        $textes = AideRubrique::pluck('texte', 'rubrique');

        $rubriques = collect(self::RUBRIQUES)->map(function ($label, $key) use ($textes) {
            return [
                'key'   => $key,
                'label' => $label,
                'texte' => $textes->get($key, ''),
            ];
        })->values();

        return Inertia::render('Admin/Aide', ['rubriques' => $rubriques]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'rubriques'   => 'required|array',
            'rubriques.*' => 'nullable|string',
        ]);

        foreach ($data['rubriques'] as $key => $texte) {
            if (!array_key_exists($key, self::RUBRIQUES)) {
                continue;
            }
            AideRubrique::updateOrInsert(
                ['rubrique' => $key],
                ['texte' => $texte ?: null, 'updated_at' => now()]
            );
        }

        return back();
    }
}
