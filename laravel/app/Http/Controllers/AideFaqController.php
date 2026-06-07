<?php
namespace App\Http\Controllers;

use App\Models\FaqQuestion;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AideFaqController extends Controller
{
    public function index(Request $request)
    {
        $isAdmin = $request->user()?->hasRole('admin') ?? false;

        $questions = FaqQuestion::query()
            ->where(function ($q) use ($isAdmin) {
                $q->where('visibilite', 'tous');
                if ($isAdmin) {
                    $q->orWhere('visibilite', 'admins');
                }
            })
            ->orderByDesc('created_at')
            ->get(['id', 'titre', 'contenu', 'tags', 'visibilite']);

        return Inertia::render('AideFaq', ['questions' => $questions]);
    }
}
