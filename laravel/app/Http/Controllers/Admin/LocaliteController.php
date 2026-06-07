<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Localite;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class LocaliteController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Localites', [
            'localites' => Localite::orderBy('ordre')->orderBy('nom')->get(['id', 'nom', 'ordre']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nom'   => 'required|string|max:100|unique:localites,nom',
            'ordre' => 'nullable|integer|min:0',
        ]);
        Localite::create($data);
        return back();
    }

    public function update(Request $request, Localite $localite)
    {
        $data = $request->validate([
            'nom'   => ['required', 'string', 'max:100', Rule::unique('localites', 'nom')->ignore($localite->id)],
            'ordre' => 'nullable|integer|min:0',
        ]);
        $localite->update($data);
        return back();
    }

    public function destroy(Localite $localite)
    {
        $localite->delete();
        return back();
    }
}
