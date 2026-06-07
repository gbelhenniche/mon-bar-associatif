<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UtilisateurController extends Controller
{
    public function index()
    {
        $users = User::with('roles')->orderBy('name')->get();
        return Inertia::render('Admin/Utilisateurs', compact('users'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'email'   => 'required|string|lowercase|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'roles'   => 'array',
            'roles.*' => 'in:admin,benevole,tresorier',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        foreach (($data['roles'] ?? []) as $role) {
            $user->roles()->create(['role' => $role]);
        }

        return back();
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'email'   => 'required|string|lowercase|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8',
            'roles'   => 'array',
            'roles.*' => 'in:admin,benevole,tresorier',
        ]);

        $update = ['name' => $data['name'], 'email' => $data['email']];
        if (!empty($data['password'])) {
            $update['password'] = Hash::make($data['password']);
        }
        $user->update($update);

        $user->roles()->delete();
        foreach (($data['roles'] ?? []) as $role) {
            $user->roles()->create(['role' => $role]);
        }

        return back();
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            abort(403, 'Impossible de supprimer votre propre compte.');
        }
        $user->delete();
        return back();
    }
}
