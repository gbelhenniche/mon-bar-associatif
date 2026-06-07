<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Fournisseur;
use Inertia\Inertia;

class FournisseursArchivesController extends Controller
{
    public function index()
    {
        $archives = Fournisseur::whereNotNull('archived_at')
            ->with('archivedByUser')
            ->orderByDesc('archived_at')
            ->get();

        $motifLabels = [
            'doublon' => 'Doublon',
            'demande' => 'Demande de suppression',
            'erreur'  => 'Erreur de saisie',
            'autre'   => 'Autre',
        ];

        return Inertia::render('Admin/FournisseursArchives', [
            'archives' => $archives->map(fn($f) => [
                'id'                   => $f->id,
                'nom'                  => $f->nom,
                'email'                => $f->email,
                'telephone'            => $f->telephone,
                'archived_at'          => $f->archived_at,
                'archived_by_name'     => $f->archivedByUser?->name,
                'archive_motif'        => $f->archive_motif,
                'archive_motif_label'  => $motifLabels[$f->archive_motif] ?? $f->archive_motif,
                'archive_motif_detail' => $f->archive_motif_detail,
            ])->values(),
        ]);
    }

    public function restore(Fournisseur $fournisseur)
    {
        $fournisseur->update([
            'archived_at'          => null,
            'archived_by'          => null,
            'archive_motif'        => null,
            'archive_motif_detail' => null,
        ]);
        return back();
    }

    public function destroy(Fournisseur $fournisseur)
    {
        $fournisseur->delete();
        return back();
    }
}
