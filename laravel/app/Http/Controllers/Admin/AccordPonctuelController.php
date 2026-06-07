<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AccordPonctuel;
use Illuminate\Http\Request;

class AccordPonctuelController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'date_debut' => 'required|date',
            'date_fin'   => 'required|date|after_or_equal:date_debut',
            'notes'      => 'nullable|string|max:255',
        ]);

        AccordPonctuel::create([...$data, 'user_id' => auth()->id()]);
        return back()->with('success', 'Accord ponctuel créé.');
    }

    public function destroy(AccordPonctuel $accord)
    {
        $accord->delete();
        return back()->with('success', 'Accord supprimé.');
    }
}
