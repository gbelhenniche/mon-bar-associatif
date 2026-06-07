<?php
namespace App\Http\Controllers;
use App\Models\{Categorie, MaterielType};
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategorieController extends Controller
{
    public function index()
    {
        $categories = Categorie::orderBy('ordre')->get();
        $types = MaterielType::orderBy('ordre')->get();
        return Inertia::render('Admin/Categories', compact('categories', 'types'));
    }

    public function store(Request $request)
    {
        $data = $request->validate(['nom'=>'required|string','couleur'=>'nullable|string','icone'=>'nullable|string','ordre'=>'integer']);
        Categorie::create($data);
        return back();
    }

    public function update(Request $request, Categorie $categorie)
    {
        $data = $request->validate(['nom'=>'required|string','couleur'=>'nullable|string','icone'=>'nullable|string','ordre'=>'integer']);
        $categorie->update($data);
        return back();
    }

    public function destroy(Categorie $categorie)
    {
        $categorie->delete();
        return back();
    }
}
