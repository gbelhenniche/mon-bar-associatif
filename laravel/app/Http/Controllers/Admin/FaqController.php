<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FaqQuestion;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FaqController extends Controller
{
    public function index()
    {
        $questions = FaqQuestion::orderByDesc('created_at')
            ->get(['id', 'titre', 'contenu', 'tags', 'visibilite', 'created_at']);

        return Inertia::render('Admin/Faq', ['questions' => $questions]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'titre'      => 'required|string|max:255',
            'contenu'    => 'required|string',
            'tags'       => 'nullable|string|max:500',
            'visibilite' => 'required|in:tous,admins,invisible',
        ]);

        FaqQuestion::create($data);
        return back();
    }

    public function update(Request $request, FaqQuestion $question)
    {
        $data = $request->validate([
            'titre'      => 'required|string|max:255',
            'contenu'    => 'required|string',
            'tags'       => 'nullable|string|max:500',
            'visibilite' => 'required|in:tous,admins,invisible',
        ]);

        $question->update($data);
        return back();
    }

    public function destroy(FaqQuestion $question)
    {
        $question->delete();
        return back();
    }
}
