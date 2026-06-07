<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

$basePath = dirname(__DIR__);
// En local : public/ est dans le dossier Laravel. Sur le serveur Ouvaton : httpdocs/ est le public root.
$publicPath = is_dir($basePath . "/public")
    ? $basePath . "/public"
    : dirname($basePath);

$app = Application::configure(basePath: $basePath)
    ->withRouting(
        web: __DIR__ . "/../routes/web.php",
        commands: __DIR__ . "/../routes/console.php",
        health: "/up",
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(
            append: [
                \App\Http\Middleware\HandleInertiaRequests::class,
                \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            ],
        );
        $middleware->validateCsrfTokens(except: [
            'admin/migrations/run',
        ]);
        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->create();

// Configurer le chemin public après la création de l'app
$app->usePublicPath($publicPath);

return $app;
