<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\{DB, Schema, Str};

/*
 * Migration unique qui crée l'intégralité du schéma de Mon Bar Associatif.
 * Utilise des vérifications hasTable() pour être idempotente :
 * elle peut être jouée sur une installation vierge comme sur une existante.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Catégories de produits ────────────────────────────────────────────
        if (!Schema::hasTable('categories')) {
            Schema::create('categories', function (Blueprint $table) {
                $table->ulid('id')->primary();
                $table->string('nom');
                $table->string('couleur', 7)->nullable();
                $table->string('icone')->nullable();
                $table->integer('ordre')->default(0);
                $table->timestamps();
            });
        }

        // ── Produits ──────────────────────────────────────────────────────────
        if (!Schema::hasTable('produits')) {
            Schema::create('produits', function (Blueprint $table) {
                $table->ulid('id')->primary();
                $table->foreignUlid('categorie_id')->nullable()->constrained('categories')->nullOnDelete();
                $table->string('reference')->nullable();
                $table->string('nom');
                $table->string('format')->nullable();
                $table->string('fournisseur')->nullable();
                $table->decimal('prix_achat', 10, 2)->default(0);
                $table->decimal('prix_achat_ht', 10, 2)->default(0);
                $table->decimal('prix_vente', 10, 2)->default(0);
                $table->decimal('prix_vente_zero_taxe', 10, 2)->default(0);
                $table->decimal('stock_actuel', 10, 2)->default(0);
                $table->decimal('stock_minimum', 10, 2)->default(0);
                $table->boolean('suivi_stock')->default(true);
                $table->boolean('actif')->default(true);
                $table->enum('visibilite', ['visible', 'masque', 'visible_jusqu_au'])->default('visible');
                $table->date('visibilite_jusqu_au')->nullable();
                $table->timestamps();
            });
        }

        // ── Types d'adhérent ──────────────────────────────────────────────────
        if (!Schema::hasTable('types_adherent')) {
            Schema::create('types_adherent', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->string('slug')->unique();
                $table->string('nom');
                $table->string('icone')->nullable();
                $table->string('couleur', 20)->nullable();
                $table->enum('autorisation', ['toujours', 'ponctuel', 'jamais'])->default('toujours');
                $table->unsignedSmallInteger('ordre')->default(0);
                $table->timestamps();
            });
        }

        // ── Adhérents ─────────────────────────────────────────────────────────
        if (!Schema::hasTable('adherents')) {
            Schema::create('adherents', function (Blueprint $table) {
                $table->ulid('id')->primary();
                $table->unsignedInteger('numero')->nullable()->unique();
                $table->string('prenom');
                $table->string('nom');
                $table->string('email')->nullable();
                $table->string('telephone')->nullable();
                $table->string('ville')->nullable();
                $table->string('type_adhesion', 50)->default('individuel');
                $table->date('date_premiere_adhesion')->nullable();
                $table->text('notes')->nullable();
                $table->boolean('actif')->default(true);
                $table->timestamp('archived_at')->nullable();
                $table->foreignId('archived_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('archive_motif', 30)->nullable();
                $table->text('archive_motif_detail')->nullable();
                $table->timestamps();
            });
        }

        // ── Localités ─────────────────────────────────────────────────────────
        if (!Schema::hasTable('localites')) {
            Schema::create('localites', function (Blueprint $table) {
                $table->id();
                $table->string('nom', 100);
                $table->unsignedSmallInteger('ordre')->default(0);
                $table->timestamps();
            });
        }

        // ── Accords ponctuels ─────────────────────────────────────────────────
        if (!Schema::hasTable('accords_ponctuels')) {
            Schema::create('accords_ponctuels', function (Blueprint $table) {
                $table->ulid('id')->primary();
                $table->date('date_debut');
                $table->date('date_fin');
                $table->string('notes', 255)->nullable();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        // ── Sessions de caisse ────────────────────────────────────────────────
        if (!Schema::hasTable('sessions_caisse')) {
            Schema::create('sessions_caisse', function (Blueprint $table) {
                $table->ulid('id')->primary();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('nom', 100)->nullable();
                $table->decimal('fond_ouverture', 10, 2)->default(0);
                $table->decimal('fond_fermeture', 10, 2)->nullable();
                $table->decimal('especes_comptees', 10, 2)->nullable();
                $table->decimal('ecart', 10, 2)->nullable();
                $table->json('denominations_fermeture')->nullable();
                $table->timestamp('opened_at')->useCurrent();
                $table->timestamp('closed_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        // ── Ventes ───────────────────────────────────────────────────────────
        if (!Schema::hasTable('ventes')) {
            Schema::create('ventes', function (Blueprint $table) {
                $table->ulid('id')->primary();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignUlid('session_id')->nullable()->constrained('sessions_caisse')->nullOnDelete();
                $table->foreignUlid('adherent_id')->nullable()->constrained('adherents')->nullOnDelete();
                $table->decimal('total', 10, 2)->default(0);
                $table->enum('paiement', ['cb', 'especes', 'prepayee', 'gratuite']);
                $table->text('note')->nullable();
                $table->timestamps();
            });
        }

        // ── Articles de vente ─────────────────────────────────────────────────
        if (!Schema::hasTable('vente_items')) {
            Schema::create('vente_items', function (Blueprint $table) {
                $table->ulid('id')->primary();
                $table->foreignUlid('vente_id')->constrained('ventes')->cascadeOnDelete();
                $table->foreignUlid('produit_id')->nullable()->constrained('produits')->nullOnDelete();
                $table->string('produit_nom');
                $table->decimal('quantite', 10, 2);
                $table->decimal('prix_unitaire', 10, 2);
                $table->decimal('total_ligne', 10, 2);
                $table->string('note_prix_libre')->nullable();
            });
        }

        // ── Mouvements de caisse ──────────────────────────────────────────────
        if (!Schema::hasTable('mouvements_caisse')) {
            Schema::create('mouvements_caisse', function (Blueprint $table) {
                $table->ulid('id')->primary();
                $table->foreignUlid('session_id')->constrained('sessions_caisse')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->enum('type', ['retrait', 'depot']);
                $table->decimal('montant', 10, 2);
                $table->string('motif')->nullable();
                $table->timestamps();
            });
        }

        // ── Mouvements de stock ───────────────────────────────────────────────
        if (!Schema::hasTable('mouvements_stock')) {
            Schema::create('mouvements_stock', function (Blueprint $table) {
                $table->ulid('id')->primary();
                $table->foreignUlid('produit_id')->constrained('produits')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->enum('type', ['entree', 'sortie', 'inventaire', 'vente']);
                $table->decimal('quantite', 10, 2);
                $table->string('note')->nullable();
                $table->timestamps();
            });
        }

        // ── Rôles utilisateurs ────────────────────────────────────────────────
        if (!Schema::hasTable('user_roles')) {
            Schema::create('user_roles', function (Blueprint $table) {
                $table->ulid('id')->primary();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->enum('role', ['admin', 'benevole', 'tresorier']);
                $table->timestamps();
            });
        }

        // ── Journal des imports/exports ───────────────────────────────────────
        if (!Schema::hasTable('imports_log')) {
            Schema::create('imports_log', function (Blueprint $table) {
                $table->ulid('id')->primary();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->enum('direction', ['import', 'export']);
                $table->string('type');
                $table->string('filename')->nullable();
                $table->integer('lignes_ok')->default(0);
                $table->integer('lignes_erreur')->default(0);
                $table->timestamps();
            });
        }

        // ── Fournisseurs ──────────────────────────────────────────────────────
        if (!Schema::hasTable('fournisseurs')) {
            Schema::create('fournisseurs', function (Blueprint $table) {
                $table->id();
                $table->string('nom');
                $table->text('adresse')->nullable();
                $table->string('email')->nullable();
                $table->string('telephone')->nullable();
                $table->boolean('visible')->default(true);
                $table->timestamp('archived_at')->nullable();
                $table->foreignId('archived_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('archive_motif', 30)->nullable();
                $table->text('archive_motif_detail')->nullable();
                $table->timestamps();
            });
        }

        // ── Matériels ─────────────────────────────────────────────────────────
        if (!Schema::hasTable('materiels')) {
            Schema::create('materiels', function (Blueprint $table) {
                $table->id();
                $table->string('nom');
                $table->string('type')->nullable();
                $table->string('fournisseur')->nullable();
                $table->integer('seuil_alerte')->default(0);
                $table->text('note')->nullable();
                $table->boolean('visible')->default(true);
                $table->integer('quantite')->default(0);
                $table->timestamps();
            });
        }

        // ── Variations de matériel ────────────────────────────────────────────
        if (!Schema::hasTable('materiel_variations')) {
            Schema::create('materiel_variations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('materiel_id')->constrained('materiels')->cascadeOnDelete();
                $table->integer('variation');
                $table->timestamps();
            });
        }

        // ── Types de matériel ─────────────────────────────────────────────────
        if (!Schema::hasTable('materiel_types')) {
            Schema::create('materiel_types', function (Blueprint $table) {
                $table->id();
                $table->string('nom');
                $table->string('couleur')->nullable();
                $table->string('icone')->nullable();
                $table->integer('ordre')->default(0);
                $table->timestamps();
            });
        }

        // ── Messages / annonces ───────────────────────────────────────────────
        if (!Schema::hasTable('messages')) {
            Schema::create('messages', function (Blueprint $table) {
                $table->id();
                $table->enum('type', ['important', 'savistu']);
                $table->text('contenu');
                $table->enum('frequence', ['normal', 'peu_frequent', 'tres_frequent'])->default('normal');
                $table->boolean('actif')->default(true);
                $table->date('date_fin')->nullable();
                $table->timestamps();
            });
        }

        // ── Paramètres applicatifs ────────────────────────────────────────────
        if (!Schema::hasTable('parametres')) {
            Schema::create('parametres', function (Blueprint $table) {
                $table->string('cle', 100)->primary();
                $table->text('valeur')->nullable();
                $table->timestamp('updated_at')->nullable();
            });
        }

        // ── Rubriques d'aide ──────────────────────────────────────────────────
        if (!Schema::hasTable('aide_rubriques')) {
            Schema::create('aide_rubriques', function (Blueprint $table) {
                $table->id();
                $table->string('rubrique')->unique();
                $table->text('texte')->nullable();
                $table->timestamps();
            });
        }

        // ── FAQ ───────────────────────────────────────────────────────────────
        if (!Schema::hasTable('faq_questions')) {
            Schema::create('faq_questions', function (Blueprint $table) {
                $table->id();
                $table->string('titre');
                $table->text('contenu');
                $table->string('tags')->nullable();
                $table->string('visibilite')->default('tous');
                $table->timestamps();
            });
        }

        // ── Données initiales ─────────────────────────────────────────────────
        $now = now();

        // Catégorie "Adhésions" (utilisée par la caisse pour les ventes d'adhésions)
        if (!DB::table('categories')->where('nom', 'Adhésions')->exists()) {
            DB::table('categories')->insert([
                'id'         => (string) Str::ulid(),
                'nom'        => 'Adhésions',
                'couleur'    => null,
                'icone'      => null,
                'ordre'      => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // Types d'adhérent par défaut
        DB::table('types_adherent')->insertOrIgnore([
            ['id' => (string) Str::ulid(), 'slug' => 'individuel', 'nom' => 'Individuel', 'icone' => 'user-round',  'couleur' => '#006C65', 'autorisation' => 'toujours', 'ordre' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['id' => (string) Str::ulid(), 'slug' => 'famille',   'nom' => 'Famille',    'icone' => 'users-round', 'couleur' => '#734F96', 'autorisation' => 'toujours', 'ordre' => 2, 'created_at' => $now, 'updated_at' => $now],
        ]);

        // Paramètres par défaut
        $parametresDefaut = [
            ['cle' => 'nom_bar',            'valeur' => 'Mon Bar Associatif'],
            ['cle' => 'titre_page',         'valeur' => 'Mon Bar Associatif'],
            ['cle' => 'marge_seuil_rouge',  'valeur' => '15'],
            ['cle' => 'marge_seuil_orange', 'valeur' => '30'],
            ['cle' => 'marge_seuil_vert',   'valeur' => '50'],
            ['cle' => 'reinit_question',    'valeur' => ''],
            ['cle' => 'reinit_reponse',     'valeur' => ''],
        ];
        foreach ($parametresDefaut as $p) {
            DB::table('parametres')->insertOrIgnore(['cle' => $p['cle'], 'valeur' => $p['valeur'], 'updated_at' => $now]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('faq_questions');
        Schema::dropIfExists('aide_rubriques');
        Schema::dropIfExists('materiel_types');
        Schema::dropIfExists('materiel_variations');
        Schema::dropIfExists('materiels');
        Schema::dropIfExists('imports_log');
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('mouvements_stock');
        Schema::dropIfExists('mouvements_caisse');
        Schema::dropIfExists('vente_items');
        Schema::dropIfExists('ventes');
        Schema::dropIfExists('sessions_caisse');
        Schema::dropIfExists('accords_ponctuels');
        Schema::dropIfExists('localites');
        Schema::dropIfExists('adherents');
        Schema::dropIfExists('types_adherent');
        Schema::dropIfExists('fournisseurs');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('parametres');
        Schema::dropIfExists('produits');
        Schema::dropIfExists('categories');
    }
};
