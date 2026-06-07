<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\{AccordPonctuel, Adherent, TypeAdherent};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class TypeAdherentController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/TypesAdherent', [
            'types'   => TypeAdherent::orderBy('ordre')->get(),
            'accords' => AccordPonctuel::orderByDesc('date_debut')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nom'          => 'required|string|max:100',
            'icone'        => 'nullable|string|max:100',
            'couleur'      => 'nullable|string|max:20',
            'autorisation' => 'nullable|in:toujours,ponctuel,jamais',
        ]);

        $slug = Str::slug($data['nom']);
        if (TypeAdherent::where('slug', $slug)->exists()) {
            return back()->withErrors(['nom' => 'Ce nom génère un identifiant déjà utilisé ("' . $slug . '"). Choisissez un nom différent.']);
        }

        TypeAdherent::create([
            ...$data,
            'slug'         => $slug,
            'autorisation' => $data['autorisation'] ?? 'toujours',
            'ordre'        => (TypeAdherent::max('ordre') ?? 0) + 1,
        ]);

        return back();
    }

    public function update(Request $request, TypeAdherent $typeAdherent)
    {
        $data = $request->validate([
            'nom'          => 'required|string|max:100',
            'icone'        => 'nullable|string|max:100',
            'couleur'      => 'nullable|string|max:20',
            'ordre'        => 'nullable|integer|min:0',
            'autorisation' => 'nullable|in:toujours,ponctuel,jamais',
        ]);

        $typeAdherent->update($data);
        return back();
    }

    public function destroy(Request $request, TypeAdherent $typeAdherent)
    {
        if (TypeAdherent::count() <= 1) {
            return back()->withErrors(['delete' => 'Impossible de supprimer le seul type restant.']);
        }

        $data = $request->validate([
            'remplacer_par' => [
                'required', 'string',
                Rule::exists('types_adherent', 'slug')->whereNot('slug', $typeAdherent->slug),
            ],
        ]);

        DB::transaction(function () use ($typeAdherent, $data) {
            Adherent::where('type_adhesion', $typeAdherent->slug)
                ->update(['type_adhesion' => $data['remplacer_par']]);
            $typeAdherent->delete();
        });

        return back();
    }
}
