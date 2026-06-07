<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BackupController extends Controller
{
    public function index()
    {
        $params = DB::table('parametres')->pluck('valeur', 'cle');

        $userName  = $params->get('backup_last_user_name');
        $userEmail = $params->get('backup_last_user_email');
        $lastBackupUser = ($userName || $userEmail)
            ? ['name' => $userName, 'email' => $userEmail]
            : null;

        return Inertia::render('Admin/Sauvegarde', [
            'lastBackupDate' => $params->get('backup_last_date'),
            'alertDays'      => (int) $params->get('backup_alert_days', 30),
            'lastBackupUser' => $lastBackupUser,
        ]);
    }

    public function export()
    {
        $sql  = $this->generateSqlDump();
        $user = auth()->user();

        DB::table('parametres')->updateOrInsert(
            ['cle' => 'backup_last_date'],
            ['valeur' => now()->toIso8601String(), 'updated_at' => now()]
        );
        DB::table('parametres')->updateOrInsert(
            ['cle' => 'backup_last_user_name'],
            ['valeur' => $user?->name, 'updated_at' => now()]
        );
        DB::table('parametres')->updateOrInsert(
            ['cle' => 'backup_last_user_email'],
            ['valeur' => $user?->email, 'updated_at' => now()]
        );

        $filename = 'backup_' . now()->format('Y-m-d_His') . '.sql';

        return response($sql, 200, [
            'Content-Type'        => 'application/octet-stream',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public function import(Request $request)
    {
        $request->validate([
            'fichier'      => 'required|file|max:51200',
            'confirmation' => ['required', 'in:CONFIRMER'],
        ], [
            'confirmation.in' => 'Tapez exactement CONFIRMER pour valider.',
        ]);

        $sql = file_get_contents($request->file('fichier')->getRealPath());
        $statements = $this->splitSql($sql);

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        try {
            foreach ($statements as $stmt) {
                DB::statement($stmt);
            }
        } catch (\Exception $e) {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
            return back()->withErrors(['fichier' => 'Erreur lors de l\'import : ' . $e->getMessage()]);
        }
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        return back()->with('success', 'Base de données restaurée avec succès.');
    }

    public function saveSettings(Request $request)
    {
        $request->validate([
            'alert_days' => 'required|integer|min:1|max:365',
        ]);

        DB::table('parametres')->updateOrInsert(
            ['cle' => 'backup_alert_days'],
            ['valeur' => $request->alert_days, 'updated_at' => now()]
        );

        return back()->with('success', 'Paramètres de sauvegarde enregistrés.');
    }

    private function generateSqlDump(): string
    {
        $pdo = DB::connection()->getPdo();
        $output = [];
        $output[] = '-- Mon Bar Associatif — Sauvegarde du ' . now()->format('d/m/Y H:i:s');
        $output[] = '-- Généré automatiquement — à importer via /admin/sauvegarde';
        $output[] = '';
        $output[] = 'SET FOREIGN_KEY_CHECKS=0;';
        $output[] = 'SET NAMES utf8mb4;';
        $output[] = '';

        $dbName = config('database.connections.mysql.database');
        $tables = DB::select('SHOW TABLES');
        $tableKey = 'Tables_in_' . $dbName;

        foreach ($tables as $tableObj) {
            $table = $tableObj->$tableKey;

            $createResult = DB::select("SHOW CREATE TABLE `{$table}`");
            $createSql = $createResult[0]->{'Create Table'};

            $output[] = "-- --------------------------------------------------------";
            $output[] = "-- Table : `{$table}`";
            $output[] = "-- --------------------------------------------------------";
            $output[] = '';
            $output[] = "DROP TABLE IF EXISTS `{$table}`;";
            $output[] = $createSql . ';';
            $output[] = '';

            $rows = DB::table($table)->get();
            if ($rows->isNotEmpty()) {
                $columns = array_keys((array) $rows->first());
                $colList = '`' . implode('`, `', $columns) . '`';

                foreach ($rows->chunk(200) as $chunk) {
                    $valueLines = $chunk->map(function ($row) use ($pdo) {
                        $vals = array_map(
                            fn($v) => $v === null ? 'NULL' : $pdo->quote((string) $v),
                            (array) $row
                        );
                        return '(' . implode(', ', $vals) . ')';
                    })->implode(",\n  ");

                    $output[] = "INSERT INTO `{$table}` ({$colList}) VALUES";
                    $output[] = "  {$valueLines};";
                    $output[] = '';
                }
            }
        }

        $output[] = 'SET FOREIGN_KEY_CHECKS=1;';

        return implode("\n", $output);
    }

    private function splitSql(string $sql): array
    {
        $statements = [];
        $current = '';
        $inString = false;
        $stringChar = '';
        $len = strlen($sql);
        $i = 0;

        while ($i < $len) {
            $char = $sql[$i];

            // Line comment
            if (!$inString && $char === '-' && $i + 1 < $len && $sql[$i + 1] === '-') {
                while ($i < $len && $sql[$i] !== "\n") {
                    $i++;
                }
                continue;
            }

            // Block comment
            if (!$inString && $char === '/' && $i + 1 < $len && $sql[$i + 1] === '*') {
                $i += 2;
                while ($i < $len - 1 && !($sql[$i] === '*' && $sql[$i + 1] === '/')) {
                    $i++;
                }
                $i += 2;
                continue;
            }

            if ($inString) {
                if ($char === '\\' && $i + 1 < $len) {
                    $current .= $char . $sql[$i + 1];
                    $i += 2;
                    continue;
                }
                if ($char === $stringChar) {
                    $inString = false;
                }
                $current .= $char;
            } else {
                if ($char === "'" || $char === '"' || $char === '`') {
                    $inString = true;
                    $stringChar = $char;
                    $current .= $char;
                } elseif ($char === ';') {
                    $trimmed = trim($current);
                    if ($trimmed !== '') {
                        $statements[] = $trimmed;
                    }
                    $current = '';
                } else {
                    $current .= $char;
                }
            }
            $i++;
        }

        $trimmed = trim($current);
        if ($trimmed !== '') {
            $statements[] = $trimmed;
        }

        return $statements;
    }
}
