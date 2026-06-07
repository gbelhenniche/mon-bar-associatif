<?php

namespace App\Http\Controllers;

use App\Models\{Produit, Categorie, Adherent, Fournisseur, ImportsLog, TypeAdherent};
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportExportController extends Controller
{
    // ─── Produits ────────────────────────────────────────────────

    public function exportProduits()
    {
        $produits = Produit::with('categorie')->orderBy('nom')->get();
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Produits');

        $headers = ['id','reference','nom','categorie','format','fournisseur','stock_actuel','stock_minimum','prix_achat','prix_vente','suivi_stock'];
        $sheet->fromArray($headers, null, 'A1');

        foreach ($produits as $i => $p) {
            $sheet->fromArray([
                $p->id, $p->reference, $p->nom,
                $p->categorie?->nom ?? '',
                $p->format, $p->fournisseur,
                $p->stock_actuel, $p->stock_minimum,
                $p->prix_achat, $p->prix_vente,
                $p->suivi_stock ? 'oui' : 'non',
            ], null, 'A' . ($i + 2));
        }

        $this->logExport('produits', $produits->count());

        return $this->streamXlsx($spreadsheet, 'produits_' . now()->format('Y-m-d') . '.xlsx');
    }

    public function importProduits(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:xlsx,xls']);
        $cats = Categorie::pluck('id', 'nom')->mapWithKeys(fn($id, $nom) => [strtolower($nom) => $id]);
        $rows = $this->readXlsx($request->file('file'));

        $ok = 0; $err = 0;
        foreach ($rows as $r) {
            $nom = trim($r['nom'] ?? '');
            if (!$nom) { $err++; continue; }
            $catKey = strtolower(trim($r['categorie'] ?? ''));
            $payload = [
                'reference'    => $r['reference'] ?? null ?: null,
                'nom'          => $nom,
                'categorie_id' => $cats[$catKey] ?? null,
                'format'       => $r['format'] ?? null ?: null,
                'fournisseur'  => $r['fournisseur'] ?? null ?: null,
                'stock_actuel' => (float)($r['stock_actuel'] ?? 0),
                'stock_minimum'=> (float)($r['stock_minimum'] ?? 0),
                'prix_achat'   => (float)($r['prix_achat'] ?? 0),
                'prix_vente'   => (float)($r['prix_vente'] ?? 0),
                'suivi_stock'  => strtolower($r['suivi_stock'] ?? 'oui') !== 'non',
            ];
            $id = $r['id'] ?? null;
            $res = $id
                ? Produit::where('id', $id)->update($payload)
                : Produit::create($payload);
            $res ? $ok++ : $err++;
        }

        ImportsLog::create(['user_id' => auth()->id(), 'direction' => 'import', 'type' => 'produits', 'filename' => $request->file('file')->getClientOriginalName(), 'lignes_ok' => $ok, 'lignes_erreur' => $err]);

        return back()->with('success', "Import produits : {$ok} ok, {$err} erreur(s)");
    }

    // ─── Adhérents ───────────────────────────────────────────────

    public function exportAdherents()
    {
        $adherents = Adherent::orderBy('nom')->get();
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Adhérents');

        $headers = ['numero','nom','prenom','email','telephone','type_adhesion','date_premiere_adhesion','notes'];
        $sheet->fromArray($headers, null, 'A1');

        foreach ($adherents as $i => $a) {
            $sheet->fromArray([
                $a->numero, $a->nom, $a->prenom, $a->email, $a->telephone,
                $a->type_adhesion,
                $a->date_premiere_adhesion ? $a->date_premiere_adhesion->format('Y-m-d') : '',
                $a->notes,
            ], null, 'A' . ($i + 2));
        }

        $this->logExport('adherents', $adherents->count());

        return $this->streamXlsx($spreadsheet, 'adherents_' . now()->format('Y-m-d') . '.xlsx');
    }

    public function importAdherents(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:xlsx,xls']);
        $rows = $this->readXlsx($request->file('file'));

        // Slugs valides depuis la base ; fallback sur le premier par ordre
        $validSlugs  = TypeAdherent::orderBy('ordre')->pluck('slug')->toArray();
        $defaultSlug = $validSlugs[0] ?? 'individuel';

        // Aliases hérités + tous les slugs actuels acceptés tels quels
        $typeMap = ['simple' => 'individuel', 'individuelle' => 'individuel'];
        foreach ($validSlugs as $s) { $typeMap[$s] = $s; }

        $ok = 0; $err = 0;
        foreach ($rows as $r) {
            $nom = trim($r['nom'] ?? '');
            if (!$nom) { $err++; continue; }

            $typeRaw      = strtolower(trim($r['type_adhesion'] ?? ''));
            $typeAdhesion = $typeMap[$typeRaw] ?? $defaultSlug;

            $payload = [
                'nom'                    => $nom,
                'prenom'                 => trim($r['prenom'] ?? ''),
                'email'                  => $r['email'] ?? null ?: null,
                'telephone'              => $r['telephone'] ?? null ?: null,
                'type_adhesion'          => $typeAdhesion,
                'date_premiere_adhesion' => $this->parseDate($r['date_premiere_adhesion'] ?? null),
                'notes'                  => $r['notes'] ?? null ?: null,
            ];

            $numero = isset($r['numero']) && $r['numero'] !== '' ? (int) $r['numero'] : null;
            if ($numero) {
                $payload['numero'] = $numero;
            }
            try {
                $existing = $numero ? Adherent::where('numero', $numero)->first() : null;
                $existing ? $existing->update($payload) : Adherent::create($payload);
                $ok++;
            } catch (\Exception) { $err++; }
        }

        ImportsLog::create(['user_id' => auth()->id(), 'direction' => 'import', 'type' => 'adherents', 'filename' => $request->file('file')->getClientOriginalName(), 'lignes_ok' => $ok, 'lignes_erreur' => $err]);

        return back()->with('success', "Import adhérents : {$ok} ok, {$err} erreur(s)");
    }

    // ─── Fournisseurs ────────────────────────────────────────────

    public function exportFournisseurs()
    {
        $fournisseurs = Fournisseur::orderBy('nom')->get();
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Fournisseurs');

        $sheet->fromArray(['id', 'nom', 'adresse', 'email', 'telephone', 'visible'], null, 'A1');
        foreach ($fournisseurs as $i => $f) {
            $sheet->fromArray([
                $f->id, $f->nom, $f->adresse ?? '',
                $f->email ?? '', $f->telephone ?? '',
                $f->visible ? 'oui' : 'non',
            ], null, 'A' . ($i + 2));
        }

        $this->logExport('fournisseurs', $fournisseurs->count());
        return $this->streamXlsx($spreadsheet, 'fournisseurs_' . now()->format('Y-m-d') . '.xlsx');
    }

    public function importFournisseurs(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:xlsx,xls']);
        $rows = $this->readXlsx($request->file('file'));

        $ok = 0; $err = 0;
        foreach ($rows as $r) {
            $nom = trim($r['nom'] ?? '');
            if (!$nom) { $err++; continue; }
            $payload = [
                'nom'       => $nom,
                'adresse'   => $r['adresse'] ?? null ?: null,
                'email'     => $r['email'] ?? null ?: null,
                'telephone' => $r['telephone'] ?? null ?: null,
                'visible'   => strtolower($r['visible'] ?? 'oui') !== 'non',
            ];
            $id = $r['id'] ?? null;
            try {
                $id ? Fournisseur::where('id', $id)->update($payload) : Fournisseur::create($payload);
                $ok++;
            } catch (\Exception) { $err++; }
        }

        ImportsLog::create(['user_id' => auth()->id(), 'direction' => 'import', 'type' => 'fournisseurs', 'filename' => $request->file('file')->getClientOriginalName(), 'lignes_ok' => $ok, 'lignes_erreur' => $err]);

        return back()->with('success', "Import fournisseurs : {$ok} ok, {$err} erreur(s)");
    }

    // ─── Helpers ─────────────────────────────────────────────────

    private function parseDate(mixed $value): ?string
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }
        if (is_numeric($value)) {
            try {
                $dt = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float) $value);
                return $dt->format('Y-m-d');
            } catch (\Exception) {
                return null;
            }
        }
        $str = trim((string) $value);
        foreach (['d/m/Y', 'd/m/y', 'Y-m-d'] as $fmt) {
            $dt = \DateTime::createFromFormat($fmt, $str);
            if ($dt) {
                $year = (int) $dt->format('Y');
                return ($year >= 2000 && $year <= 2100) ? $dt->format('Y-m-d') : null;
            }
        }
        if (preg_match('/^\d{4}$/', $str)) {
            return $str . '-01-01';
        }
        return null;
    }

    private function readXlsx($file): array
    {
        $spreadsheet = IOFactory::load($file->getPathname());
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, false);
        if (empty($rows)) return [];
        $headers = array_map('strtolower', array_map('trim', $rows[0]));
        $result = [];
        foreach (array_slice($rows, 1) as $row) {
            if (array_filter($row)) {
                $result[] = array_combine($headers, $row);
            }
        }
        return $result;
    }

    private function streamXlsx(Spreadsheet $spreadsheet, string $filename)
    {
        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new XlsxWriter($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function logExport(string $type, int $lignes): void
    {
        ImportsLog::create(['user_id' => auth()->id(), 'direction' => 'export', 'type' => $type, 'filename' => null, 'lignes_ok' => $lignes, 'lignes_erreur' => 0]);
    }
}
