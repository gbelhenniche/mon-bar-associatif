<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): mixed
    {
        if (!$request->user()?->hasRole(...$roles)) {
            abort(403, 'Accès refusé.');
        }
        return $next($request);
    }
}
