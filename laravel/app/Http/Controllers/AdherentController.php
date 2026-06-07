<?php
namespace App\Http\Controllers;

use App\Models\{Adherent, Localite, TypeAdherent, VenteItem};
use App\Services\AdhesionService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AdherentController extends Controller
{
    public function index()
    {
        $currentYear = AdhesionService::getCurrentAdhesionYear();

        $adhesionProduits = AdhesionService::adhesionProduitsByAdherent();

        $adherents = Adherent::whereNull('archived_at')
            ->orderBy('nom')->orderBy('prenom')->get()
            ->map(fn($a) => array_merge($a->toArray(), [
                'adhesion_produits' => $adhesionProduits->get($a->id, collect())->values(),
            ]));

        return Inertia::render('Adherents', [
            'adherents'      => $adherents,
            'currentYear'    => $currentYear,
            'availableYears' => range(2026, $currentYear + 1),
            'localites'      => Localite::orderBy('ordre')->orderBy('nom')->pluck('nom'),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'prenom'                 => 'nullable|string',
            'nom'                    => 'required|string',
            'numero'                 => ['nullable', 'integer', 'min:1', Rule::unique('adherents', 'numero')],
            'email'                  => 'nullable|email',
            'telephone'              => 'nullable|string',
            'ville'                  => 'nullable|string|max:100',
            'type_adhesion'          => 'required|exists:types_adherent,slug',
            'date_premiere_adhesion' => 'nullable|date',
            'notes'                  => 'nullable|string',
        ]);

        Adherent::create($data);
        return back();
    }

    public function update(Request $request, Adherent $adherent)
    {
        $data = $request->validate([
            'prenom'                 => 'nullable|string',
            'nom'                    => 'required|string',
            'numero'                 => ['nullable', 'integer', 'min:1', Rule::unique('adherents', 'numero')->ignore($adherent->id)],
            'email'                  => 'nullable|email',
            'telephone'              => 'nullable|string',
            'ville'                  => 'nullable|string|max:100',
            'type_adhesion'          => 'required|exists:types_adherent,slug',
            'date_premiere_adhesion' => 'nullable|date',
            'notes'                  => 'nullable|string',
            'actif'                  => 'boolean',
        ]);

        $adherent->update($data);
        return back();
    }

    public function archiver(Request $request, Adherent $adherent)
    {
        $data = $request->validate([
            'motif'        => 'required|in:doublon,demande,erreur,autre',
            'motif_detail' => 'nullable|string|max:500',
        ]);

        $adherent->update([
            'archived_at'          => now(),
            'archived_by'          => auth()->id(),
            'archive_motif'        => $data['motif'],
            'archive_motif_detail' => $data['motif_detail'] ?? null,
            'actif'                => false,
        ]);

        return back();
    }

    public function coordonnees(Request $request, Adherent $adherent)
    {
        $data = $request->validate([
            'email'     => 'nullable|email|max:255',
            'telephone' => 'nullable|string|max:30',
            'ville'     => 'nullable|string|max:100',
        ]);
        $adherent->update($data);
        return response()->json(['success' => true]);
    }

    public function destroy(Adherent $adherent)
    {
        $adherent->delete();
        return back();
    }

    public function ventes(Adherent $adherent)
    {
        $ventes = $adherent->ventes()->orderByDesc('created_at')->limit(50)->get(['id','total','paiement','created_at']);
        return response()->json($ventes);
    }

    public function adhesionsByYear(Adherent $adherent)
    {
        $achats = VenteItem::join('ventes', 'ventes.id', '=', 'vente_items.vente_id')
            ->where('ventes.adherent_id', $adherent->id)
            ->where('vente_items.produit_nom', 'like', 'Adhésion%')
            ->orderByDesc('ventes.created_at')
            ->select(
                'vente_items.produit_nom',
                'vente_items.total_ligne as montant',
                'ventes.paiement',
                'ventes.created_at'
            )
            ->get();

        return response()->json($achats);
    }

    public function adhesionStatsByYear(Request $request)
    {
        $year    = (int) $request->query('year', AdhesionService::getCurrentAdhesionYear());
        $valides = AdhesionService::countValidForYear($year);
        $total   = Adherent::whereNull('archived_at')->count();

        return response()->json([
            'year'    => $year,
            'valides' => $valides,
            'expires' => $total - $valides,
            'total'   => $total,
        ]);
    }
}
