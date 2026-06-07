<?php
/**
 * Mon Bar Associatif — Installateur
 *
 * Ce fichier guide l'installation complète de l'application.
 * IMPORTANT : supprimez ce fichier dès que l'installation est terminée.
 *
 * Accès : https://votre-domaine.fr/install.php
 */

// ─── Sécurité : bloquer si déjà installé et fonctionnel ──────────────────────

$envPath     = __DIR__ . '/laravel/.env';
$vendorPath  = __DIR__ . '/laravel/vendor/autoload.php';
$alreadyInstalled = file_exists($envPath);

if ($alreadyInstalled && ($_GET['force'] ?? '') !== '1') {
    // L'application est déjà configurée — afficher un avertissement
}

// ─── AJAX : test de connexion BDD ────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'test_db') {
    header('Content-Type: application/json');
    $host = trim($_POST['db_host'] ?? 'localhost');
    $port = (int) ($_POST['db_port'] ?? 3306);
    $name = trim($_POST['db_database'] ?? '');
    $user = trim($_POST['db_username'] ?? '');
    $pass = $_POST['db_password'] ?? '';
    try {
        new PDO(
            "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
            $user, $pass,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
        );
        echo json_encode(['ok' => true]);
    } catch (Exception $e) {
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// ─── AJAX : suppression de ce fichier ────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'self_delete') {
    header('Content-Type: application/json');
    $deleted = @unlink(__FILE__);
    echo json_encode(['ok' => $deleted]);
    exit;
}

// ─── AJAX : installation principale ──────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'install') {
    header('Content-Type: application/json');

    // Validation
    $errors     = [];
    $appName    = trim($_POST['app_name']       ?? '');
    $appUrl     = rtrim(trim($_POST['app_url']  ?? ''), '/');
    $dbHost     = trim($_POST['db_host']        ?? 'localhost');
    $dbPort     = (int) ($_POST['db_port']      ?? 3306);
    $dbName     = trim($_POST['db_database']    ?? '');
    $dbUser     = trim($_POST['db_username']    ?? '');
    $dbPass     = $_POST['db_password']         ?? '';
    $adminName  = trim($_POST['admin_name']     ?? '');
    $adminEmail = trim($_POST['admin_email']    ?? '');
    $adminPass  = $_POST['admin_password']      ?? '';

    if (!$appName)  $errors[] = 'Le nom de l\'application est requis.';
    if (!$appUrl)   $errors[] = 'L\'URL de l\'application est requise.';
    if (!$dbName)   $errors[] = 'Le nom de la base de données est requis.';
    if (!$dbUser)   $errors[] = 'L\'identifiant BDD est requis.';
    if (!$adminName) $errors[] = 'Le nom de l\'administrateur est requis.';
    if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) $errors[] = 'L\'adresse e-mail est invalide.';
    if (strlen($adminPass) < 8) $errors[] = 'Le mot de passe doit contenir au moins 8 caractères.';

    if ($errors) {
        echo json_encode(['ok' => false, 'step' => 'validation', 'errors' => $errors]);
        exit;
    }

    // Vérifier que vendor/ est présent
    if (!file_exists($vendorPath)) {
        echo json_encode(['ok' => false, 'step' => 'vendor', 'errors' => ['Le dossier laravel/vendor/ est absent. Uploadez-le avant de lancer l\'installation.']]);
        exit;
    }

    // Générer APP_KEY
    $appKey = 'base64:' . base64_encode(random_bytes(32));

    // Écrire le fichier .env
    $appNameEscaped = addslashes($appName);
    $envContent = <<<ENV
APP_NAME="{$appNameEscaped}"
APP_ENV=production
APP_KEY={$appKey}
APP_DEBUG=false
APP_URL={$appUrl}

APP_LOCALE=fr
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST={$dbHost}
DB_PORT={$dbPort}
DB_DATABASE={$dbName}
DB_USERNAME={$dbUser}
DB_PASSWORD={$dbPass}

CACHE_STORE=file
SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
ENV;

    if (@file_put_contents($envPath, $envContent) === false) {
        echo json_encode(['ok' => false, 'step' => 'env', 'errors' => ['Impossible d\'écrire laravel/.env — vérifiez les permissions (chmod 755 sur laravel/).']]);
        exit;
    }

    // Démarrer Laravel
    try {
        if (!defined('LARAVEL_START')) define('LARAVEL_START', microtime(true));
        require $vendorPath;
        $app    = require_once __DIR__ . '/laravel/bootstrap/app.php';
        $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
        $kernel->bootstrap();
    } catch (\Throwable $e) {
        @unlink($envPath);
        echo json_encode(['ok' => false, 'step' => 'bootstrap', 'errors' => ['Erreur au démarrage de Laravel : ' . $e->getMessage()]]);
        exit;
    }

    // Jouer les migrations
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    } catch (\Throwable $e) {
        echo json_encode(['ok' => false, 'step' => 'migrate', 'errors' => ['Erreur lors des migrations : ' . $e->getMessage()]]);
        exit;
    }

    // Créer le compte administrateur
    try {
        $user = \App\Models\User::create([
            'name'     => $adminName,
            'email'    => $adminEmail,
            'password' => \Illuminate\Support\Facades\Hash::make($adminPass),
        ]);

        \Illuminate\Support\Facades\DB::table('user_roles')->insert([
            'id'         => (string) \Illuminate\Support\Str::ulid(),
            'user_id'    => $user->id,
            'role'       => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    } catch (\Throwable $e) {
        echo json_encode(['ok' => false, 'step' => 'admin', 'errors' => ['Erreur lors de la création du compte admin : ' . $e->getMessage()]]);
        exit;
    }

    // Initialiser le nom de l'application dans les paramètres
    try {
        foreach ([
            'nom_bar'    => $appName,
            'titre_page' => $appName,
        ] as $cle => $valeur) {
            \Illuminate\Support\Facades\DB::table('parametres')->updateOrInsert(
                ['cle' => $cle],
                ['valeur' => $valeur, 'updated_at' => now()]
            );
        }
    } catch (\Throwable) {
        // Non bloquant — modifiable via l'interface Personnalisation
    }

    echo json_encode(['ok' => true, 'url' => $appUrl]);
    exit;
}

// ─── Vérification des prérequis (côté serveur) ───────────────────────────────

$checks = [
    'PHP ≥ 8.1'            => ['ok' => version_compare(PHP_VERSION, '8.1.0', '>='), 'detail' => 'PHP ' . PHP_VERSION . ' détecté'],
    'Extension PDO'        => ['ok' => extension_loaded('pdo'),       'detail' => ''],
    'Extension pdo_mysql'  => ['ok' => extension_loaded('pdo_mysql'), 'detail' => ''],
    'Extension mbstring'   => ['ok' => extension_loaded('mbstring'),  'detail' => ''],
    'Extension openssl'    => ['ok' => extension_loaded('openssl'),   'detail' => ''],
    'Extension json'       => ['ok' => extension_loaded('json'),      'detail' => ''],
    'Dossier laravel/'     => ['ok' => is_dir(__DIR__ . '/laravel'),  'detail' => ''],
    'Dossier vendor/'      => ['ok' => file_exists($vendorPath),      'detail' => ''],
    'Dossier build/'       => ['ok' => is_dir(__DIR__ . '/build'),    'detail' => ''],
];

$allChecksPass = !in_array(false, array_column($checks, 'ok'), true);

?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Installation — Mon Bar Associatif</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .step { display: none; }
        .step.active { display: block; }
        .fade-in { animation: fadeIn .25s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body class="min-h-screen bg-slate-100 flex items-start justify-center py-10 px-4">
<div class="w-full max-w-lg">

    <!-- En-tête -->
    <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white text-2xl font-bold mb-4 shadow-lg">🍺</div>
        <h1 class="text-2xl font-bold text-slate-800">Mon Bar Associatif</h1>
        <p class="text-slate-500 text-sm mt-1">Assistant d'installation</p>
    </div>

    <?php if ($alreadyInstalled && ($_GET['force'] ?? '') !== '1'): ?>
    <!-- Avertissement : déjà installé -->
    <div class="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm text-center">
        <div class="text-4xl mb-3">⚠️</div>
        <h2 class="font-semibold text-amber-800 text-lg mb-2">Application déjà configurée</h2>
        <p class="text-amber-700 text-sm mb-4">
            Un fichier <code class="bg-amber-100 px-1 rounded">laravel/.env</code> existe déjà.<br>
            Lancer l'installateur écrasera votre configuration actuelle.
        </p>
        <a href="?force=1" class="inline-block bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            Continuer quand même
        </a>
        <a href="/" class="inline-block ml-3 text-sm text-amber-700 hover:underline">← Retour à l'application</a>
    </div>

    <?php else: ?>

    <!-- Indicateur d'étapes -->
    <div class="flex items-center justify-center mb-6 text-xs font-medium" id="progress-bar">
        <span class="step-label active" data-step="1">1. Prérequis</span>
        <span class="mx-2 text-slate-300">›</span>
        <span class="step-label" data-step="2">2. Base de données</span>
        <span class="mx-2 text-slate-300">›</span>
        <span class="step-label" data-step="3">3. Administrateur</span>
        <span class="mx-2 text-slate-300">›</span>
        <span class="step-label" data-step="4">4. Installation</span>
    </div>

    <style>
        .step-label { color: #94a3b8; }
        .step-label.active { color: #4f46e5; font-weight: 700; }
        .step-label.done { color: #10b981; }
    </style>

    <!-- Carte principale -->
    <div class="bg-white rounded-2xl shadow-md border border-slate-200 p-8">

        <!-- ── Étape 1 : Prérequis ──────────────────────────────────────── -->
        <div class="step active fade-in" id="step-1">
            <h2 class="text-lg font-semibold text-slate-800 mb-1">Vérification des prérequis</h2>
            <p class="text-sm text-slate-500 mb-5">L'installateur vérifie que votre serveur est compatible.</p>

            <div class="space-y-2">
                <?php foreach ($checks as $label => $check): ?>
                <div class="flex items-center justify-between py-2 px-3 rounded-lg <?= $check['ok'] ? 'bg-green-50' : 'bg-red-50' ?>">
                    <span class="text-sm <?= $check['ok'] ? 'text-green-800' : 'text-red-800' ?>">
                        <?= htmlspecialchars($label) ?>
                        <?php if ($check['detail']): ?>
                            <span class="text-xs opacity-60 ml-1">(<?= htmlspecialchars($check['detail']) ?>)</span>
                        <?php endif; ?>
                    </span>
                    <span class="text-base"><?= $check['ok'] ? '✅' : '❌' ?></span>
                </div>
                <?php endforeach; ?>
            </div>

            <?php if (!$allChecksPass): ?>
            <div class="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                Corrigez les problèmes ci-dessus avant de continuer.<br>
                Pour <strong>vendor/</strong> et <strong>build/</strong> : uploadez-les par FTP avant de lancer l'installation.
            </div>
            <?php endif; ?>

            <div class="mt-6 flex justify-end">
                <button onclick="goToStep(2)"
                    class="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors
                        <?= $allChecksPass ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed' ?>"
                    <?= $allChecksPass ? '' : 'disabled' ?>>
                    Continuer →
                </button>
            </div>
        </div>

        <!-- ── Étape 2 : Base de données + URL ──────────────────────────── -->
        <div class="step fade-in" id="step-2">
            <h2 class="text-lg font-semibold text-slate-800 mb-1">Base de données &amp; Application</h2>
            <p class="text-sm text-slate-500 mb-5">Ces informations sont fournies par votre hébergeur.</p>

            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Nom de l'application</label>
                    <input id="app_name" type="text" value="Mon Bar Associatif" placeholder="Mon Bar Associatif"
                        class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">URL de l'application</label>
                    <input id="app_url" type="url" value="<?= htmlspecialchars('https://' . ($_SERVER['HTTP_HOST'] ?? 'votre-domaine.fr')) ?>"
                        placeholder="https://votre-domaine.fr"
                        class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                </div>

                <hr class="border-slate-100">

                <div class="grid grid-cols-3 gap-3">
                    <div class="col-span-2">
                        <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Hôte MySQL</label>
                        <input id="db_host" type="text" value="localhost" placeholder="localhost"
                            class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Port</label>
                        <input id="db_port" type="number" value="3306"
                            class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Nom de la base de données</label>
                    <input id="db_database" type="text" placeholder="ma_base"
                        class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Identifiant</label>
                        <input id="db_username" type="text" placeholder="utilisateur"
                            class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Mot de passe</label>
                        <input id="db_password" type="password" placeholder="••••••••"
                            class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    </div>
                </div>

                <!-- Bouton test connexion -->
                <div class="flex items-center gap-3">
                    <button onclick="testDb()" id="btn-test"
                        class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">
                        Tester la connexion
                    </button>
                    <span id="db-result" class="text-sm"></span>
                </div>
            </div>

            <div class="mt-6 flex justify-between">
                <button onclick="goToStep(1)" class="text-sm text-slate-500 hover:text-slate-700">← Retour</button>
                <button onclick="goToStep(3)" id="btn-next-2"
                    class="px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                    Continuer →
                </button>
            </div>
        </div>

        <!-- ── Étape 3 : Compte administrateur ──────────────────────────── -->
        <div class="step fade-in" id="step-3">
            <h2 class="text-lg font-semibold text-slate-800 mb-1">Compte administrateur</h2>
            <p class="text-sm text-slate-500 mb-5">Ce compte aura accès à toutes les fonctions d'administration.</p>

            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Nom complet</label>
                    <input id="admin_name" type="text" placeholder="Prénom Nom"
                        class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Adresse e-mail</label>
                    <input id="admin_email" type="email" placeholder="admin@votre-association.fr"
                        class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Mot de passe <span class="text-slate-400 normal-case font-normal">(8 caractères minimum)</span></label>
                    <input id="admin_password" type="password" placeholder="••••••••"
                        class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Confirmer le mot de passe</label>
                    <input id="admin_password_confirm" type="password" placeholder="••••••••"
                        class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                </div>
            </div>

            <div id="step3-errors" class="hidden mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-1"></div>

            <div class="mt-6 flex justify-between">
                <button onclick="goToStep(2)" class="text-sm text-slate-500 hover:text-slate-700">← Retour</button>
                <button onclick="startInstall()"
                    class="px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                    Installer l'application →
                </button>
            </div>
        </div>

        <!-- ── Étape 4 : Installation en cours / terminée ────────────────── -->
        <div class="step fade-in" id="step-4">
            <!-- En cours -->
            <div id="installing" class="text-center py-8">
                <svg class="spinner w-12 h-12 text-indigo-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <p class="text-slate-600 font-medium" id="install-status">Création de la base de données…</p>
                <p class="text-slate-400 text-sm mt-1">Cela peut prendre quelques secondes.</p>
            </div>

            <!-- Succès -->
            <div id="install-success" class="hidden text-center py-6">
                <div class="text-5xl mb-4">🎉</div>
                <h2 class="text-xl font-bold text-slate-800 mb-2">Installation réussie !</h2>
                <p class="text-slate-500 text-sm mb-6">
                    L'application est prête. Connectez-vous avec votre compte administrateur.
                </p>
                <a id="app-link" href="#" class="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm mb-4">
                    Accéder à l'application →
                </a>

                <div class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left">
                    <p class="text-sm font-semibold text-amber-800 mb-1">⚠️ Action requise</p>
                    <p class="text-sm text-amber-700 mb-3">
                        Supprimez ce fichier d'installation pour sécuriser votre site.
                    </p>
                    <button onclick="selfDelete()" id="btn-delete"
                        class="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors">
                        Supprimer install.php
                    </button>
                    <p class="text-xs text-amber-600 mt-2 text-center">
                        Ou supprimez-le manuellement par FTP.
                    </p>
                </div>
            </div>

            <!-- Erreur -->
            <div id="install-error" class="hidden py-4">
                <div class="text-4xl text-center mb-4">❌</div>
                <h2 class="text-lg font-semibold text-slate-800 text-center mb-3">Une erreur s'est produite</h2>
                <div id="install-error-detail" class="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 space-y-1 mb-5"></div>
                <div class="flex justify-center">
                    <button onclick="goToStep(2)" class="text-sm text-indigo-600 hover:underline">← Modifier la configuration</button>
                </div>
            </div>
        </div>

    </div><!-- /card -->
    <?php endif; ?>

</div><!-- /container -->

<script>
let currentStep = 1;

function goToStep(n) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById('step-' + n).classList.add('active');

    document.querySelectorAll('.step-label').forEach(el => {
        const s = parseInt(el.dataset.step);
        el.classList.remove('active', 'done');
        if (s === n) el.classList.add('active');
        else if (s < n) el.classList.add('done');
    });

    currentStep = n;
}

async function testDb() {
    const btn = document.getElementById('btn-test');
    const result = document.getElementById('db-result');
    btn.disabled = true;
    btn.textContent = 'Test en cours…';
    result.textContent = '';
    result.className = 'text-sm';

    try {
        const fd = new FormData();
        fd.append('action', 'test_db');
        fd.append('db_host', document.getElementById('db_host').value);
        fd.append('db_port', document.getElementById('db_port').value);
        fd.append('db_database', document.getElementById('db_database').value);
        fd.append('db_username', document.getElementById('db_username').value);
        fd.append('db_password', document.getElementById('db_password').value);

        const res = await fetch('', { method: 'POST', body: fd });
        const data = await res.json();

        if (data.ok) {
            result.textContent = '✅ Connexion réussie';
            result.className = 'text-sm text-green-600 font-medium';
        } else {
            result.textContent = '❌ ' + (data.error || 'Échec de connexion');
            result.className = 'text-sm text-red-600';
        }
    } catch(e) {
        result.textContent = '❌ Erreur réseau';
        result.className = 'text-sm text-red-600';
    }

    btn.disabled = false;
    btn.textContent = 'Tester la connexion';
}

function validateStep3() {
    const errors = [];
    const name  = document.getElementById('admin_name').value.trim();
    const email = document.getElementById('admin_email').value.trim();
    const pass  = document.getElementById('admin_password').value;
    const pass2 = document.getElementById('admin_password_confirm').value;

    if (!name)  errors.push('Le nom est requis.');
    if (!email || !email.includes('@')) errors.push('L\'e-mail est invalide.');
    if (pass.length < 8) errors.push('Le mot de passe doit faire au moins 8 caractères.');
    if (pass !== pass2)  errors.push('Les mots de passe ne correspondent pas.');

    const errBox = document.getElementById('step3-errors');
    if (errors.length) {
        errBox.innerHTML = errors.map(e => '<p>' + e + '</p>').join('');
        errBox.classList.remove('hidden');
        return false;
    }
    errBox.classList.add('hidden');
    return true;
}

async function startInstall() {
    if (!validateStep3()) return;

    goToStep(4);
    document.getElementById('install-status').textContent = 'Création de la base de données…';
    document.getElementById('installing').classList.remove('hidden');
    document.getElementById('install-success').classList.add('hidden');
    document.getElementById('install-error').classList.add('hidden');

    const fd = new FormData();
    fd.append('action', 'install');
    fd.append('app_name',       document.getElementById('app_name').value);
    fd.append('app_url',        document.getElementById('app_url').value);
    fd.append('db_host',        document.getElementById('db_host').value);
    fd.append('db_port',        document.getElementById('db_port').value);
    fd.append('db_database',    document.getElementById('db_database').value);
    fd.append('db_username',    document.getElementById('db_username').value);
    fd.append('db_password',    document.getElementById('db_password').value);
    fd.append('admin_name',     document.getElementById('admin_name').value);
    fd.append('admin_email',    document.getElementById('admin_email').value);
    fd.append('admin_password', document.getElementById('admin_password').value);

    // Messages de progression simulés (l'install est synchrone côté PHP)
    const steps = ['Écriture de la configuration…', 'Création des tables…', 'Création du compte administrateur…', 'Finalisation…'];
    let si = 0;
    const timer = setInterval(() => {
        if (si < steps.length) document.getElementById('install-status').textContent = steps[si++];
    }, 1800);

    try {
        const res  = await fetch('', { method: 'POST', body: fd });
        const data = await res.json();
        clearInterval(timer);
        document.getElementById('installing').classList.add('hidden');

        if (data.ok) {
            document.getElementById('app-link').href = data.url + '/login';
            document.getElementById('install-success').classList.remove('hidden');
        } else {
            const detail = document.getElementById('install-error-detail');
            const msgs = data.errors || ['Erreur inconnue.'];
            detail.innerHTML = msgs.map(e => '<p>' + e + '</p>').join('');
            document.getElementById('install-error').classList.remove('hidden');
        }
    } catch(e) {
        clearInterval(timer);
        document.getElementById('installing').classList.add('hidden');
        document.getElementById('install-error-detail').innerHTML = '<p>Erreur réseau — vérifiez que l\'application est accessible.</p>';
        document.getElementById('install-error').classList.remove('hidden');
    }
}

async function selfDelete() {
    const btn = document.getElementById('btn-delete');
    btn.disabled = true;
    btn.textContent = 'Suppression…';

    const fd = new FormData();
    fd.append('action', 'self_delete');
    try {
        const res = await fetch('', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.ok) {
            btn.textContent = '✅ Fichier supprimé';
            btn.className = btn.className.replace('bg-amber-600 hover:bg-amber-700', 'bg-green-600');
        } else {
            btn.textContent = '❌ Échec — supprimez le fichier manuellement par FTP';
            btn.disabled = false;
        }
    } catch(e) {
        btn.textContent = '❌ Erreur réseau';
        btn.disabled = false;
    }
}
</script>

</body>
</html>
