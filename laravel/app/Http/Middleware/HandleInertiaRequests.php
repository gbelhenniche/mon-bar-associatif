<?php

namespace App\Http\Middleware;

use App\Models\AideRubrique;
use App\Models\TypeAdherent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        try {
            $params = DB::table('parametres')->pluck('valeur', 'cle');
        } catch (\Exception) {
            $params = collect();
        }

        try {
            $typesAdherent = TypeAdherent::orderBy('ordre')->get(['id', 'slug', 'nom', 'icone', 'couleur', 'autorisation']);
        } catch (\Throwable) {
            $typesAdherent = collect();
        }

        $changelogPath = base_path('../CHANGELOG.md');
        $changelog = file_exists($changelogPath) ? file_get_contents($changelogPath) : '';

        return [
            ...parent::share($request),
            'appVersion' => config('app.version', '1.0.0'),
            'changelog'  => $changelog,
            'auth' => [
                'user'    => $request->user(),
                'roles'   => $request->user()?->roles()->pluck('role')->toArray() ?? [],
                'isAdmin' => $request->user()?->hasRole('admin') ?? false,
            ],
            'nomBar'        => $params->get('nom_bar', 'Mon Bar Associatif'),
            'titreApp'      => $params->get('titre_page', $params->get('nom_bar', 'Mon Bar Associatif')),
            'couleurTheme'  => $params->get('couleur_theme', 'rusty-nail'),
            'reinitQuestion'=> $params->get('reinit_question', ''),
            'margesSeuils'  => [
                'rouge'  => (float) ($params->get('marge_seuil_rouge',  '15')),
                'orange' => (float) ($params->get('marge_seuil_orange', '30')),
                'vert'   => (float) ($params->get('marge_seuil_vert',   '50')),
            ],
            'typesAdherent' => $typesAdherent,
            'flash'  => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
            'aideRubriques' => function () {
                try {
                    return AideRubrique::whereNotNull('texte')
                        ->where('texte', '!=', '')
                        ->pluck('texte', 'rubrique');
                } catch (\Throwable) {
                    return collect();
                }
            },
            'maintenanceAlerts' => function () use ($request, $params) {
                if (!($request->user()?->hasRole('admin') ?? false)) {
                    return ['adherentsArchives' => 0, 'fournisseursArchives' => 0, 'sauvegardeRequise' => false, 'total' => 0];
                }

                try {
                    $adherentsArchives = \App\Models\Adherent::whereNotNull('archived_at')->count();
                } catch (\Throwable) {
                    $adherentsArchives = 0;
                }

                try {
                    $fournisseursArchives = \App\Models\Fournisseur::whereNotNull('archived_at')->count();
                } catch (\Throwable) {
                    $fournisseursArchives = 0;
                }

                $lastBackupDate = $params->get('backup_last_date');
                $alertDays      = (int) $params->get('backup_alert_days', 30);
                $daysSince      = $lastBackupDate
                    ? (int) floor((time() - strtotime($lastBackupDate)) / 86400)
                    : null;
                $sauvegardeRequise = $daysSince === null || $daysSince >= $alertDays;

                $total = ($adherentsArchives > 0 ? 1 : 0)
                       + ($fournisseursArchives > 0 ? 1 : 0)
                       + ($sauvegardeRequise ? 1 : 0);

                return compact('adherentsArchives', 'fournisseursArchives', 'sauvegardeRequise', 'total');
            },
        ];
    }
}
