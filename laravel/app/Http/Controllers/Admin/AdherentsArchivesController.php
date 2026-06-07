<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Adherent;
use Inertia\Inertia;

class AdherentsArchivesController extends Controller
{
    public function index()
    {
        $archives = Adherent::whereNotNull('archived_at')
            ->with('archivedByUser')
            ->orderByDesc('archived_at')
            ->get();

        $motifLabels = [
            'doublon' => 'Doublon',
            'demande' => "Demande de l'adhérent",
            'erreur'  => 'Erreur de saisie',
            'autre'   => 'Autre',
        ];

        return Inertia::render('Admin/AdherentsArchives', [
            'archives' => $archives->map(fn($a) => [
                'id'                  => $a->id,
                'numero'              => $a->numero,
                'prenom'              => $a->prenom,
                'nom'                 => $a->nom,
                'type_adhesion'       => $a->type_adhesion,
                'archived_at'         => $a->archived_at,
                'archived_by_name'    => $a->archivedByUser?->name,
                'archive_motif'       => $a->archive_motif,
                'archive_motif_label' => $motifLabels[$a->archive_motif] ?? $a->archive_motif,
                'archive_motif_detail'=> $a->archive_motif_detail,
            ])->values(),
        ]);
    }

    public function restore(Adherent $adherent)
    {
        $adherent->update([
            'archived_at'          => null,
            'archived_by'          => null,
            'archive_motif'        => null,
            'archive_motif_detail' => null,
            'actif'                => true,
        ]);
        return back();
    }

    public function destroy(Adherent $adherent)
    {
        $adherent->delete();
        return back();
    }
}
