<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ConfidentialiteController extends Controller
{
    private const VALID_VALUES = ['jamais', 'fin_session', '1_mois', '3_mois', '6_mois', '1_an', '3_ans'];

    // Plus le rang est bas, plus la durée est courte (plus restrictif)
    private const RANK = [
        'fin_session' => 0,
        '1_mois'      => 1,
        '3_mois'      => 2,
        '6_mois'      => 3,
        '1_an'        => 4,
        '3_ans'       => 5,
        'jamais'      => 6,
    ];

    public function index()
    {
        $parametres = DB::table('parametres')->pluck('valeur', 'cle');
        return Inertia::render('Admin/Confidentialite', [
            'dcdic'          => $parametres->get('dcdic', 'jamais'),
            'reinitQuestion' => $parametres->get('reinit_question', ''),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'dcdic'        => 'required|in:' . implode(',', self::VALID_VALUES),
            'confirmation' => 'nullable|string',
        ]);

        $current = DB::table('parametres')->where('cle', 'dcdic')->value('valeur') ?? 'jamais';

        if ($this->isReduction($current, $data['dcdic'])) {
            $this->checkConfirmation($request);
        }

        DB::table('parametres')->updateOrInsert(
            ['cle' => 'dcdic'],
            ['valeur' => $data['dcdic'], 'updated_at' => now()]
        );

        $count = self::appliquerAnonymisation($data['dcdic']);

        $msg = $count > 0
            ? "Paramètre enregistré. {$count} vente(s) anonymisée(s) immédiatement."
            : 'Paramètre enregistré.';

        return back()->with('success', $msg);
    }

    public function appliquer(Request $request)
    {
        $this->checkConfirmation($request);

        $dcdic = DB::table('parametres')->where('cle', 'dcdic')->value('valeur') ?? 'jamais';
        $count = self::appliquerAnonymisation($dcdic);

        return back()->with('success', "{$count} vente(s) anonymisée(s).");
    }

    /**
     * Anonymise les ventes selon le mode DCDIC donné.
     * Retourne le nombre de ventes anonymisées.
     */
    public static function appliquerAnonymisation(string $dcdic): int
    {
        if ($dcdic === 'jamais') return 0;

        if ($dcdic === 'fin_session') {
            // Anonymise les ventes de toutes les sessions déjà fermées
            return DB::table('ventes')
                ->whereNotNull('adherent_id')
                ->whereExists(function ($q) {
                    $q->select(DB::raw(1))
                      ->from('sessions_caisse')
                      ->whereColumn('sessions_caisse.id', 'ventes.session_id')
                      ->whereNotNull('sessions_caisse.closed_at');
                })
                ->update(['adherent_id' => null]);
        }

        $cutoff = match($dcdic) {
            '1_mois' => now()->subMonth(),
            '3_mois' => now()->subMonths(3),
            '6_mois' => now()->subMonths(6),
            '1_an'   => now()->subYear(),
            '3_ans'  => now()->subYears(3),
            default  => null,
        };

        if (!$cutoff) return 0;

        return DB::table('ventes')
            ->whereNotNull('adherent_id')
            ->where('created_at', '<', $cutoff)
            ->update(['adherent_id' => null]);
    }

    private function isReduction(string $old, string $new): bool
    {
        return (self::RANK[$new] ?? 6) < (self::RANK[$old] ?? 6);
    }

    private function checkConfirmation(Request $request): void
    {
        $expected = mb_strtolower(
            DB::table('parametres')->where('cle', 'reinit_reponse')->value('valeur') ?? ''
        );

        $request->validate([
            'confirmation' => ['required', function ($attr, $value, $fail) use ($expected) {
                $given = mb_strtolower(
                    str_replace(
                        ['à','â','è','é','ê','ë','î','ï','ô','ù','û','ü','ÿ','œ','æ'],
                        ['a','a','e','e','e','e','i','i','o','u','u','u','y','oe','ae'],
                        (string) $value
                    )
                );
                if ($given !== $expected) {
                    $fail('Réponse incorrecte.');
                }
            }],
        ]);
    }
}
