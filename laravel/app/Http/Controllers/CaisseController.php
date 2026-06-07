<?php
namespace App\Http\Controllers;
use App\Http\Controllers\Admin\ConfidentialiteController;
use App\Models\{Adherent, AccordPonctuel, Categorie, Localite, Produit, SessionCaisse, TypeAdherent, Vente, VenteItem, MouvementCaisse};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{DB, Log, Mail};
use Inertia\Inertia;

class CaisseController extends Controller
{
    public function index()
    {
        $categories = Categorie::orderBy('ordre')->get(['id','nom','couleur','icone']);
        $today = now()->toDateString();
        $produits = Produit::where('actif', true)
            ->where(function ($q) use ($today) {
                $q->where('visibilite', 'visible')
                  ->orWhere(function ($q2) use ($today) {
                      $q2->where('visibilite', 'visible_jusqu_au')
                         ->where('visibilite_jusqu_au', '>=', $today);
                  });
            })
            ->orderBy('nom')
            ->get(['id','nom','prix_vente','categorie_id','stock_actuel','suivi_stock']);

        // Caisse partagée : session globale, indépendante de l'utilisateur connecté
        $session = SessionCaisse::whereNull('closed_at')
            ->orderByDesc('opened_at')
            ->first(['id','nom','opened_at','fond_ouverture']);

        // Anonymisation lazy : applique la DCDIC temporelle à chaque ouverture de la page
        $dcdic = DB::table('parametres')->where('cle', 'dcdic')->value('valeur') ?? 'jamais';
        if (!in_array($dcdic, ['jamais', 'fin_session'])) {
            ConfidentialiteController::appliquerAnonymisation($dcdic);
        }

        $currentYear = (int) now()->year;
        $validIds = VenteItem::join('ventes', 'ventes.id', '=', 'vente_items.vente_id')
            ->where('vente_items.produit_nom', 'like', 'Adhésion%')
            ->where('vente_items.produit_nom', 'like', '%' . $currentYear . '%')
            ->whereNotNull('ventes.adherent_id')
            ->pluck('ventes.adherent_id')
            ->unique()
            ->flip()
            ->toArray();

        $adherents = Adherent::where('actif', true)
            ->orderBy('nom')->orderBy('prenom')
            ->get(['id','prenom','nom','numero','type_adhesion','email','telephone','ville'])
            ->map(fn($a) => [
                'id'              => $a->id,
                'prenom'          => $a->prenom,
                'nom'             => $a->nom,
                'numero'          => $a->numero,
                'type_adhesion'   => $a->type_adhesion,
                'adhesion_valide' => array_key_exists($a->id, $validIds),
                'email'           => $a->email,
                'telephone'       => $a->telephone,
                'ville'           => $a->ville,
            ])
            ->values();

        $localites = Localite::orderBy('ordre')->orderBy('nom')->pluck('nom');

        $adherentsTodayIds = Vente::whereDate('created_at', $today)
            ->whereNotNull('adherent_id')
            ->distinct()
            ->pluck('adherent_id')
            ->values();

        $adherentsTopIds = Vente::whereNotNull('adherent_id')
            ->groupBy('adherent_id')
            ->selectRaw('adherent_id, COUNT(*) as cnt')
            ->orderByDesc('cnt')
            ->limit(5)
            ->pluck('adherent_id')
            ->values();

        // Dernière note de fermeture : globale (toute session, tout utilisateur)
        $derniereSession = SessionCaisse::whereNotNull('closed_at')
            ->whereNotNull('notes')
            ->where('notes', '!=', '')
            ->orderByDesc('closed_at')
            ->first(['notes', 'closed_at']);
        $derniereNoteSession = $derniereSession
            ? ['notes' => $derniereSession->notes, 'closed_at' => $derniereSession->closed_at]
            : null;

        // Dernier décompte d'espèces : global
        $derniereFermee = SessionCaisse::whereNotNull('closed_at')
            ->whereNotNull('denominations_fermeture')
            ->orderByDesc('closed_at')
            ->first(['denominations_fermeture', 'closed_at']);
        $dernieresDenominations = $derniereFermee?->denominations_fermeture ?? null;
        $dernierDecompteAt = $derniereFermee?->closed_at;

        $accordPonctuelActif = AccordPonctuel::whereDate('date_debut', '<=', $today)
            ->whereDate('date_fin', '>=', $today)
            ->exists();

        return Inertia::render('Caisse', compact(
            'categories', 'produits', 'session',
            'adherents', 'adherentsTodayIds', 'adherentsTopIds',
            'derniereNoteSession', 'dernieresDenominations', 'dernierDecompteAt', 'accordPonctuelActif',
            'localites'
        ));
    }

    public function ouvrirSession(Request $request)
    {
        $request->validate([
            'fond_ouverture' => 'required|numeric|min:0',
            'nom'            => 'nullable|string|max:100',
        ]);

        // Empêcher l'ouverture si une session est déjà ouverte
        if (SessionCaisse::whereNull('closed_at')->exists()) {
            return back()->withErrors(['_message' => 'La caisse est déjà ouverte.']);
        }

        $session = SessionCaisse::create([
            'user_id'       => auth()->id(),
            'nom'           => $request->nom ?: null,
            'fond_ouverture'=> $request->fond_ouverture,
            'opened_at'     => now(),
        ]);
        return back()->with(['session' => $session]);
    }

    public function fermerSession(Request $request)
    {
        $request->validate([
            'session_id'     => 'required',
            'fond_fermeture' => 'required|numeric',
            'notes'          => 'nullable|string',
            'detail_especes' => 'nullable|string',
            'denominations'  => 'nullable|array',
        ]);

        // N'importe quel utilisateur peut fermer la session partagée
        $session = SessionCaisse::where('id', $request->session_id)
            ->whereNull('closed_at')
            ->firstOrFail();

        $especes = $session->ventes()->where('paiement','especes')->sum('total');
        $depots = $session->mouvements()->where('type','depot')->sum('montant');
        $retraits = $session->mouvements()->where('type','retrait')->sum('montant');
        $theorique = $session->fond_ouverture + $especes + $depots - $retraits;

        $emailContact = DB::table('parametres')->where('cle', 'email_contact')->value('valeur') ?? '';

        $noteUtilisateur = trim($request->notes ?? '');
        $detailEspeces   = trim($request->detail_especes ?? '');
        $notesDB = implode("\n\n", array_filter([$noteUtilisateur, $detailEspeces])) ?: null;

        $ecart = $request->fond_fermeture - $theorique;

        $session->update([
            'closed_at'              => now(),
            'fond_fermeture'         => $request->fond_fermeture,
            'especes_comptees'       => $request->fond_fermeture,
            'ecart'                  => $ecart,
            'notes'                  => $notesDB,
            'denominations_fermeture'=> $request->denominations ?: null,
        ]);

        // Anonymisation en mode "fin de session"
        $dcdic = DB::table('parametres')->where('cle', 'dcdic')->value('valeur') ?? 'jamais';
        if ($dcdic === 'fin_session') {
            DB::table('ventes')
                ->where('session_id', $session->id)
                ->whereNotNull('adherent_id')
                ->update(['adherent_id' => null]);
        }

        if ($noteUtilisateur !== '') {
            try {
                Mail::raw($noteUtilisateur, function ($message) use ($emailContact) {
                    $message->to($emailContact)
                            ->subject('Message de fermeture de la caisse');
                });
            } catch (\Exception $e) {
                Log::warning('Email fermeture caisse : ' . $e->getMessage());
            }
        }

        if (abs($ecart) >= 0.01) {
            $sign       = $ecart > 0 ? '+' : '';
            $fmt        = fn(float $v) => number_format($v, 2, ',', ' ') . ' €';
            $nomSession = $session->nom ?? now()->format('d/m/Y H:i');

            $corps  = "Ecart de caisse detecte a la fermeture de session.\n\n";
            $corps .= "Session  : {$nomSession}\n";
            $corps .= "Date     : " . now()->format('d/m/Y a H:i') . "\n\n";
            $corps .= "Fond d'ouverture    : " . $fmt($session->fond_ouverture) . "\n";
            $corps .= "Ventes especes      : " . $fmt($especes) . "\n";
            if ($depots  > 0) $corps .= "Depots              : +" . $fmt($depots) . "\n";
            if ($retraits > 0) $corps .= "Retraits            : -" . $fmt($retraits) . "\n";
            $corps .= "\nEspeces theoriques  : " . $fmt($theorique) . "\n";
            $corps .= "Especes comptees    : " . $fmt($request->fond_fermeture) . "\n";
            $corps .= "Ecart               : {$sign}" . $fmt($ecart) . "\n";
            if ($noteUtilisateur !== '') {
                $corps .= "\nNote de fermeture : {$noteUtilisateur}\n";
            }

            try {
                Mail::raw($corps, function ($message) use ($emailContact, $sign, $ecart) {
                    $ecartStr = $sign . number_format($ecart, 2, ',', ' ') . ' EUR';
                    $message->to($emailContact)
                            ->subject("[Caisse] Ecart de fermeture : {$ecartStr}");
                });
            } catch (\Exception $e) {
                Log::warning('Email ecart caisse : ' . $e->getMessage());
            }
        }

        return back();
    }

    public function enregistrerVente(Request $request)
    {
        $request->validate([
            'session_id'         => 'required|exists:sessions_caisse,id',
            'paiement'           => 'required|in:cb,especes,prepayee,gratuite',
            'items'              => 'required|array|min:1',
            'items.*.produit_id' => 'nullable',
            'items.*.nom'        => 'required|string',
            'items.*.prix'       => 'required|numeric',
            'items.*.qte'        => 'required|integer|min:1',
            'items.*.note'       => 'nullable|string',
            'adherent_id'        => 'required|exists:adherents,id',
        ]);

        // Vérification autorisation via le type d'adhérent
        $adherent = Adherent::findOrFail($request->adherent_id);
        $type = TypeAdherent::where('slug', $adherent->type_adhesion)->first();
        $autorisation = $type?->autorisation ?? 'toujours';

        if ($autorisation === 'jamais') {
            return back()->withErrors(['_message' => 'Cet adhérent n\'est pas autorisé à utiliser le bar (type "' . ($type->nom ?? $adherent->type_adhesion) . '").']);
        }

        if ($autorisation === 'ponctuel') {
            $today = now()->toDateString();
            $accordActif = AccordPonctuel::whereDate('date_debut', '<=', $today)
                ->whereDate('date_fin', '>=', $today)
                ->exists();
            if (!$accordActif) {
                return back()->withErrors(['_message' => 'Cet adhérent (type "' . ($type->nom ?? $adherent->type_adhesion) . '") n\'est autorisé qu\'en cas d\'accord ponctuel actif.']);
            }
        }

        DB::transaction(function () use ($request) {
            $total = collect($request->items)->sum(fn($i) => $i['prix'] * $i['qte']);
            $vente = Vente::create([
                'user_id'    => auth()->id(),
                'session_id' => $request->session_id,
                'adherent_id'=> $request->adherent_id,
                'total'      => $total,
                'paiement'   => $request->paiement,
            ]);
            foreach ($request->items as $item) {
                VenteItem::create([
                    'vente_id'      => $vente->id,
                    'produit_id'    => $item['produit_id'] ?? null,
                    'produit_nom'   => $item['nom'],
                    'quantite'      => $item['qte'],
                    'prix_unitaire' => $item['prix'],
                    'total_ligne'   => $item['prix'] * $item['qte'],
                    'note_prix_libre'=> $item['note'] ?? null,
                ]);
                $produit = Produit::find($item['produit_id']);
                if ($produit?->suivi_stock) {
                    $produit->decrement('stock_actuel', $item['qte']);
                }
            }
        });

        return back();
    }

    public function enregistrerRetrait(Request $request)
    {
        $request->validate(['session_id'=>'required','montant'=>'required|numeric|min:0.01','motif'=>'nullable|string']);
        MouvementCaisse::create([
            'session_id' => $request->session_id,
            'user_id'    => auth()->id(),
            'type'       => 'retrait',
            'montant'    => $request->montant,
            'motif'      => $request->motif,
        ]);
        return back();
    }

    public function sessionTotals(Request $request)
    {
        // Session partagée : pas de filtre user_id
        $session = SessionCaisse::where('id', $request->session_id)->firstOrFail();
        $ventes = $session->ventes()->get(['total','paiement']);
        $mvts = $session->mouvements()->get(['type','montant']);
        return response()->json([
            'especes'  => $ventes->where('paiement','especes')->sum('total'),
            'cb'       => $ventes->where('paiement','cb')->sum('total'),
            'nbVentes' => $ventes->count(),
            'retraits' => $mvts->where('type','retrait')->sum('montant'),
            'depots'   => $mvts->where('type','depot')->sum('montant'),
        ]);
    }

    public function recentesVentes(Request $request)
    {
        // Session partagée : pas de filtre user_id
        $session = SessionCaisse::whereNull('closed_at')
            ->orderByDesc('opened_at')
            ->first();

        if (!$session) {
            return response()->json([]);
        }

        $ventes = Vente::with('items')
            ->where('session_id', $session->id)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        return response()->json($ventes->map(fn($v) => [
            'id'         => $v->id,
            'total'      => $v->total,
            'paiement'   => $v->paiement,
            'created_at' => $v->created_at,
            'items'      => $v->items->map(fn($i) => [
                'produit_id' => $i->produit_id,
                'nom'        => $i->produit_nom,
                'prix'       => (float) $i->prix_unitaire,
                'qte'        => (int) $i->quantite,
                'note'       => $i->note_prix_libre,
            ]),
        ]));
    }

    public function corrigerPaiement(Request $request, $venteId)
    {
        $vente = Vente::findOrFail($venteId);
        // Vérifier que la session est bien ouverte (sans filtre user_id)
        SessionCaisse::where('id', $vente->session_id)
            ->whereNull('closed_at')
            ->firstOrFail();

        $data = $request->validate(['paiement' => 'required|in:cb,especes,prepayee,gratuite']);
        $vente->update(['paiement' => $data['paiement']]);

        return response()->json(['success' => true]);
    }

    public function annulerVente($venteId)
    {
        $vente = Vente::with('items')->findOrFail($venteId);
        // Vérifier que la session est bien ouverte (sans filtre user_id)
        SessionCaisse::where('id', $vente->session_id)
            ->whereNull('closed_at')
            ->firstOrFail();

        $items = $vente->items->map(fn($i) => [
            'produit_id' => $i->produit_id,
            'nom'        => $i->produit_nom,
            'prix'       => (float) $i->prix_unitaire,
            'qte'        => (int) $i->quantite,
            'note'       => $i->note_prix_libre,
        ]);

        DB::transaction(function () use ($vente) {
            foreach ($vente->items as $item) {
                $produit = $item->produit_id ? Produit::find($item->produit_id) : null;
                if ($produit?->suivi_stock) {
                    $produit->increment('stock_actuel', $item->quantite);
                }
            }
            $vente->items()->delete();
            $vente->delete();
        });

        return response()->json(['success' => true, 'items' => $items]);
    }
}
