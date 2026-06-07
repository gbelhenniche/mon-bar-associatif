<?php
namespace App\Http\Controllers\Admin;
use App\Http\Controllers\Controller;
use App\Models\Message;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SavistuController extends Controller
{
    public function index()
    {
        $messages = Message::where('type', 'savistu')
            ->orderByDesc('created_at')
            ->get(['id', 'contenu', 'frequence', 'actif', 'created_at']);

        return Inertia::render('Admin/Savistu', ['messages' => $messages]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'contenu'   => 'required|string|max:500',
            'frequence' => 'required|in:normal,peu_frequent,tres_frequent',
            'actif'     => 'boolean',
        ]);

        Message::create([...$data, 'type' => 'savistu']);

        return back();
    }

    public function update(Request $request, Message $message)
    {
        $data = $request->validate([
            'contenu'   => 'required|string|max:500',
            'frequence' => 'required|in:normal,peu_frequent,tres_frequent',
            'actif'     => 'boolean',
        ]);

        $message->update($data);

        return back();
    }

    public function destroy(Message $message)
    {
        $message->delete();
        return back();
    }
}
