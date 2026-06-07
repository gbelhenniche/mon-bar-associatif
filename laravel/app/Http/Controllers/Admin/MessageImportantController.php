<?php
namespace App\Http\Controllers\Admin;
use App\Http\Controllers\Controller;
use App\Models\Message;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MessageImportantController extends Controller
{
    public function index()
    {
        $today = now()->toDateString();

        $actifs = Message::where('type', 'important')
            ->where('actif', true)
            ->where(function ($q) use ($today) {
                $q->whereNull('date_fin')->orWhere('date_fin', '>=', $today);
            })
            ->orderByDesc('created_at')
            ->get(['id', 'contenu', 'actif', 'date_fin', 'created_at']);

        $archives = Message::where('type', 'important')
            ->where(function ($q) use ($today) {
                $q->where('actif', false)
                  ->orWhere(function ($q2) use ($today) {
                      $q2->whereNotNull('date_fin')->where('date_fin', '<', $today);
                  });
            })
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'contenu', 'actif', 'date_fin', 'created_at']);

        return Inertia::render('Admin/MessageImportant', compact('actifs', 'archives'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'contenu'  => 'required|string|max:1000',
            'date_fin' => 'nullable|date|after_or_equal:today',
        ]);

        Message::create([...$data, 'type' => 'important', 'actif' => true]);

        return back();
    }

    public function update(Request $request, Message $message)
    {
        $data = $request->validate([
            'contenu'  => 'required|string|max:1000',
            'date_fin' => 'nullable|date',
        ]);

        $message->update($data);

        return back();
    }

    public function destroy(Message $message)
    {
        $message->delete();
        return back();
    }

    public function reactiver(Request $request, Message $message)
    {
        $data = $request->validate([
            'date_fin' => 'required|date|after_or_equal:today',
        ]);

        $message->update(['actif' => true, 'date_fin' => $data['date_fin']]);

        return back();
    }
}
