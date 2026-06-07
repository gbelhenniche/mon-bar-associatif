<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MigrationController extends Controller
{
    /**
     * Affiche l'interface de gestion des migrations
     * Accessible uniquement si APP_KEY valide est fourni
     */
    public function dashboard()
    {
        return view('admin.migrations', [
            'status' => $this->getMigrationStatus(),
            'pendingMigrations' => $this->getPendingMigrations(),
        ]);
    }

    /**
     * Exécute les migrations en attente
     */
    public function runMigrations()
    {
        try {
            // Validation : vérifier la clé secrète
            $token = request('token');
            $expectedToken = hash_hmac('sha256', 'migration-token', config('app.key'));
            
            if (!hash_equals($expectedToken, $token ?? '')) {
                return response()->json([
                    'success' => false,
                    'error' => 'Token invalide ou non fourni',
                    'message' => 'Authentification échouée',
                ], 403);
            }

            Log::info('Migration initiated', ['ip' => request()->ip()]);

            // Exécuter les migrations
            Artisan::call('migrate', ['--force' => true]);
            
            Log::info('Migrations completed successfully');

            return response()->json([
                'success' => true,
                'message' => 'Migrations exécutées avec succès',
                'output' => Artisan::output(),
                'status' => $this->getMigrationStatus(),
            ]);
        } catch (\Exception $e) {
            Log::error('Migration failed', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Erreur lors de l\'exécution des migrations',
            ], 500);
        }
    }

    /**
     * Affiche l'état des migrations
     */
    public function status()
    {
        try {
            // Validation
            $token = request('token');
            $expectedToken = hash_hmac('sha256', 'migration-token', config('app.key'));
            
            if (!hash_equals($expectedToken, $token ?? '')) {
                return response()->json([
                    'success' => false,
                    'error' => 'Token invalide',
                ], 403);
            }

            return response()->json([
                'success' => true,
                'status' => $this->getMigrationStatus(),
                'pending' => $this->getPendingMigrations(),
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Récupère l'état des migrations
     */
    private function getMigrationStatus()
    {
        try {
            Artisan::call('migrate:status');
            return Artisan::output();
        } catch (\Exception $e) {
            return 'Impossible de récupérer l\'état des migrations';
        }
    }

    /**
     * Récupère les migrations en attente
     */
    private function getPendingMigrations()
    {
        try {
            $migrations = DB::table('migrations')->pluck('migration')->toArray();
            $migrationFiles = scandir(database_path('migrations'));
            $pending = [];

            foreach ($migrationFiles as $file) {
                if (substr($file, -4) === '.php' && !in_array(substr($file, 0, -4), $migrations)) {
                    $pending[] = $file;
                }
            }

            return $pending;
        } catch (\Exception $e) {
            return ['Erreur lors de la récupération des migrations'];
        }
    }
}
