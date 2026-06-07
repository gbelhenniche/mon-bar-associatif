<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PersonnalisationController extends Controller
{
    public function index()
    {
        $parametres = DB::table('parametres')->pluck('valeur', 'cle');
        return Inertia::render('Admin/Personnalisation', ['parametres' => $parametres]);
    }

    public function update(Request $request)
    {
        $validThemes = [
            'rusty-nail','ocean','forest','burgundy','plum',
            'teal','copper','sage','indigo','terracotta',
            'pine','mauve','navy','rose','slate',
            'olive','jade','dusk','sienna','cobalt',
        ];

        $data = $request->validate([
            'nom_bar'            => 'required|string|max:100',
            'titre_page'         => 'nullable|string|max:100',
            'email_contact'      => 'nullable|email|max:150',
            'marge_seuil_rouge'  => 'nullable|numeric|min:0|max:100',
            'marge_seuil_orange' => 'nullable|numeric|min:0|max:100',
            'marge_seuil_vert'   => 'nullable|numeric|min:0|max:100',
            'reinit_question'    => 'nullable|string|max:200',
            'reinit_reponse'     => 'nullable|string|max:100',
            'couleur_theme'      => 'nullable|string|in:' . implode(',', $validThemes),
        ]);

        // Normalise la réponse de sécurité (minuscules, sans accents)
        if (isset($data['reinit_reponse'])) {
            $data['reinit_reponse'] = mb_strtolower(
                str_replace(['à','â','è','é','ê','ë','î','ï','ô','ù','û','ü','ÿ','œ','æ'],
                            ['a','a','e','e','e','e','i','i','o','u','u','u','y','oe','ae'],
                            $data['reinit_reponse'])
            );
        }

        foreach (array_filter($data, fn($v) => $v !== null && $v !== '') as $cle => $valeur) {
            DB::table('parametres')->updateOrInsert(
                ['cle' => $cle],
                ['valeur' => $valeur, 'updated_at' => now()]
            );
        }

        return back()->with('success', 'Paramètres enregistrés.');
    }
}
