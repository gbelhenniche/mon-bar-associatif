<?php

namespace App\Http\Controllers;

use App\Models\Fournisseur;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FournisseurController extends Controller
{
    public function index()
    {
        $fournisseurs = Fournisseur::whereNull('archived_at')->orderBy('nom')->get();
        return Inertia::render('Fournisseurs', compact('fournisseurs'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nom'       => 'required|string|max:255',
            'adresse'   => 'nullable|string',
            'email'     => 'nullable|email|max:255',
            'telephone' => 'nullable|string|max:50',
            'visible'   => 'boolean',
        ]);
        Fournisseur::create($data);
        return back();
    }

    public function update(Request $request, Fournisseur $fournisseur)
    {
        $data = $request->validate([
            'nom'       => 'required|string|max:255',
            'adresse'   => 'nullable|string',
            'email'     => 'nullable|email|max:255',
            'telephone' => 'nullable|string|max:50',
            'visible'   => 'boolean',
        ]);
        $fournisseur->update($data);
        return back();
    }

    public function archiver(Request $request, Fournisseur $fournisseur)
    {
        $data = $request->validate([
            'motif'        => 'required|in:doublon,demande,erreur,autre',
            'motif_detail' => 'nullable|string|max:500',
        ]);

        $fournisseur->update([
            'archived_at'          => now(),
            'archived_by'          => auth()->id(),
            'archive_motif'        => $data['motif'],
            'archive_motif_detail' => $data['motif_detail'] ?? null,
        ]);

        return back();
    }
}
