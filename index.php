<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Sur le serveur : Laravel est dans www/laravel/ (sous-dossier de la racine web)
// En local : Laravel est un niveau au-dessus de public/
$laravelRoot = is_dir(__DIR__ . '/laravel')
    ? __DIR__ . '/laravel'
    : __DIR__ . '/..';

if (file_exists($maintenance = $laravelRoot . '/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $laravelRoot . '/vendor/autoload.php';

/** @var Application $app */
$app = require_once $laravelRoot . '/bootstrap/app.php';

$app->handleRequest(Request::capture());
