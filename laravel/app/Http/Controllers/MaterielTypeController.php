<?php

namespace App\Http\Controllers;

use App\Models\MaterielType;
use Illuminate\Http\Request;

class MaterielTypeController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'nom'     => 'required|string|max:255',
            'couleur' => 'nullable|string',
            'icone'   => 'nullable|string',
            'ordre'   => 'integer',
        ]);
        MaterielType::create($data);
        return back();
    }

    public function update(Request $request, MaterielType $materielType)
    {
        $data = $request->validate([
            'nom'     => 'required|string|max:255',
            'couleur' => 'nullable|string',
            'icone'   => 'nullable|string',
            'ordre'   => 'integer',
        ]);
        $materielType->update($data);
        return back();
    }

    public function destroy(MaterielType $materielType)
    {
        $materielType->delete();
        return back();
    }
}
