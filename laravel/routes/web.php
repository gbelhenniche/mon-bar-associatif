<?php
use App\Http\Controllers\{
    DashboardController,
    CaisseController,
    ProduitController,
    AdherentController,
    CategorieController,
    ImportExportController,
    HistoriqueController,
    MaterielController,
    MaterielTypeController,
    UtilisateurController,
    FournisseurController,
    AideFaqController,
};
use App\Http\Controllers\Admin\{
    AccordPonctuelController,
    AdherentsArchivesController,
    AdminController,
    AnalyseAdherentsController,
    AnalyseProduitsController,
    AnalyseStocksController,
    BackupController,
    ConfidentialiteController,
    FournisseursArchivesController,
    LocaliteController,
    SavistuController,
    MessageImportantController,
    PersonnalisationController,
    ReinitialisationController,
    TypeAdherentController,
    AideController,
    FaqController,
};
use Illuminate\Support\Facades\Route;

Route::middleware("auth")->group(function () {
    Route::get("/", [DashboardController::class, "index"])->name("dashboard");
    Route::get("/dashboard", [DashboardController::class, "index"]);

    Route::get("/aide-faq", [AideFaqController::class, "index"])->name("aide-faq");

    Route::get("/caisse", [CaisseController::class, "index"])->name("caisse");
    Route::get("/caisse/recentes", [CaisseController::class, "recentesVentes"]);
    Route::patch("/caisse/vente/{id}/paiement", [CaisseController::class, "corrigerPaiement"]);
    Route::delete("/caisse/vente/{id}", [CaisseController::class, "annulerVente"]);
    Route::post("/caisse/session/ouvrir", [
        CaisseController::class,
        "ouvrirSession",
    ]);
    Route::post("/caisse/session/fermer", [
        CaisseController::class,
        "fermerSession",
    ]);
    Route::get("/caisse/session/totaux", [
        CaisseController::class,
        "sessionTotals",
    ]);
    Route::post("/caisse/vente", [CaisseController::class, "enregistrerVente"]);
    Route::post("/caisse/retrait", [
        CaisseController::class,
        "enregistrerRetrait",
    ]);

    Route::redirect(
        "/stock",
        "/produits",
    ); /* ajout lié à l'ancien nom de cette route */
    Route::get("/produits", [ProduitController::class, "index"])->name(
        "produits",
    );
    Route::post("/produits", [ProduitController::class, "store"]);
    Route::put("/produits/{produit}", [ProduitController::class, "update"]);
    Route::delete("/produits/{produit}", [ProduitController::class, "destroy"]);
    Route::post("/produits/{produit}/incrementer", [ProduitController::class, "incrementer"]);
    Route::post("/produits/{produit}/decrementer", [ProduitController::class, "decrementer"]);
    Route::get("/produits/{produit}/historique", [ProduitController::class, "historique"]);
    Route::get("/produits/export", [
        ImportExportController::class,
        "exportProduits",
    ]);
    Route::post("/produits/import", [
        ImportExportController::class,
        "importProduits",
    ]);

    Route::get("/adherents", [AdherentController::class, "index"])->name(
        "adherents",
    );
    Route::post("/adherents", [AdherentController::class, "store"]);
    Route::patch("/adherents/{adherent}/coordonnees", [AdherentController::class, "coordonnees"]);
    Route::get("/adherents/adhesion-stats", [
        AdherentController::class,
        "adhesionStatsByYear",
    ]);
    Route::get("/adherents/export", [
        ImportExportController::class,
        "exportAdherents",
    ]);
    Route::post("/adherents/import", [
        ImportExportController::class,
        "importAdherents",
    ]);
    Route::put("/adherents/{adherent}", [AdherentController::class, "update"]);
    Route::post("/adherents/{adherent}/archiver", [AdherentController::class, "archiver"]);
    Route::delete("/adherents/{adherent}", [AdherentController::class, "destroy"]);
    Route::get("/adherents/{adherent}/ventes", [
        AdherentController::class,
        "ventes",
    ]);
    Route::get("/adherents/{adherent}/adhesions-by-year", [
        AdherentController::class,
        "adhesionsByYear",
    ]);


    Route::get("/historique", [HistoriqueController::class, "index"])->name(
        "historique",
    );
    Route::get("/historique/periodes", [
        HistoriqueController::class,
        "periodes",
    ]);
    Route::get("/historique/detail", [HistoriqueController::class, "detail"]);

    Route::get("/materiels", [MaterielController::class, "index"])->name(
        "materiels",
    );
    Route::post("/materiels", [MaterielController::class, "store"]);
    Route::put("/materiels/{materiel}", [MaterielController::class, "update"]);
    Route::delete("/materiels/{materiel}", [
        MaterielController::class,
        "destroy",
    ]);
    Route::post("/materiels/{materiel}/incrementer", [
        MaterielController::class,
        "incrementer",
    ]);
    Route::post("/materiels/{materiel}/decrementer", [
        MaterielController::class,
        "decrementer",
    ]);
    Route::get("/materiels/{materiel}/historique", [
        MaterielController::class,
        "historique",
    ]);

    Route::get("/fournisseurs", [FournisseurController::class, "index"])->name("fournisseurs");
    Route::post("/fournisseurs", [FournisseurController::class, "store"]);
    Route::put("/fournisseurs/{fournisseur}", [FournisseurController::class, "update"]);
    Route::post("/fournisseurs/{fournisseur}/archiver", [FournisseurController::class, "archiver"]);
    Route::get("/fournisseurs/export", [ImportExportController::class, "exportFournisseurs"]);
    Route::post("/fournisseurs/import", [ImportExportController::class, "importFournisseurs"]);

    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/', [AdminController::class, 'index'])->name('admin');

        Route::get('/utilisateurs', [UtilisateurController::class, 'index'])->name('admin.utilisateurs');
        Route::post('/utilisateurs', [UtilisateurController::class, 'store']);
        Route::put('/utilisateurs/{user}', [UtilisateurController::class, 'update']);
        Route::delete('/utilisateurs/{user}', [UtilisateurController::class, 'destroy']);

        Route::get('/personnalisation', [PersonnalisationController::class, 'index'])->name('admin.personnalisation');
        Route::put('/personnalisation', [PersonnalisationController::class, 'update']);

        Route::get('/confidentialite', [ConfidentialiteController::class, 'index'])->name('admin.confidentialite');
        Route::put('/confidentialite', [ConfidentialiteController::class, 'update']);
        Route::post('/confidentialite/appliquer', [ConfidentialiteController::class, 'appliquer']);

        Route::get('/savistu', [SavistuController::class, 'index'])->name('admin.savistu');
        Route::post('/savistu', [SavistuController::class, 'store']);
        Route::put('/savistu/{message}', [SavistuController::class, 'update']);
        Route::delete('/savistu/{message}', [SavistuController::class, 'destroy']);

        Route::get('/messages-importants', [MessageImportantController::class, 'index'])->name('admin.messages-importants');
        Route::post('/messages-importants', [MessageImportantController::class, 'store']);
        Route::put('/messages-importants/{message}', [MessageImportantController::class, 'update']);
        Route::delete('/messages-importants/{message}', [MessageImportantController::class, 'destroy']);
        Route::post('/messages-importants/{message}/reactiver', [MessageImportantController::class, 'reactiver']);

        Route::get('/types-adherent', [TypeAdherentController::class, 'index'])->name('admin.types-adherent');
        Route::post('/types-adherent', [TypeAdherentController::class, 'store']);
        Route::put('/types-adherent/{typeAdherent}', [TypeAdherentController::class, 'update']);
        Route::delete('/types-adherent/{typeAdherent}', [TypeAdherentController::class, 'destroy']);

        Route::post('/accords-ponctuels', [AccordPonctuelController::class, 'store'])->name('admin.accords.store');
        Route::delete('/accords-ponctuels/{accord}', [AccordPonctuelController::class, 'destroy'])->name('admin.accords.destroy');

        Route::get('/adherents-archives', [AdherentsArchivesController::class, 'index'])->name('admin.adherents-archives');
        Route::post('/adherents-archives/{adherent}/restore', [AdherentsArchivesController::class, 'restore'])->name('admin.adherents-archives.restore');
        Route::delete('/adherents-archives/{adherent}', [AdherentsArchivesController::class, 'destroy'])->name('admin.adherents-archives.destroy');

        Route::get('/reinitialisation', [ReinitialisationController::class, 'index'])->name('admin.reinitialisation');
        Route::post('/reinitialisation/produits', [ReinitialisationController::class, 'clearProduits']);
        Route::post('/reinitialisation/stocks', [ReinitialisationController::class, 'clearStocks']);
        Route::post('/reinitialisation/adherents', [ReinitialisationController::class, 'clearAdherents']);
        Route::post('/reinitialisation/caisse', [ReinitialisationController::class, 'clearCaisse']);

        Route::get('/analyse/adherents', [AnalyseAdherentsController::class, 'index'])->name('admin.analyse.adherents');
        Route::get('/analyse/adherents/data', [AnalyseAdherentsController::class, 'data'])->name('admin.analyse.adherents.data');

        Route::get('/analyse/produits', [AnalyseProduitsController::class, 'index'])->name('admin.analyse.produits');
        Route::get('/analyse/produits/data', [AnalyseProduitsController::class, 'data'])->name('admin.analyse.produits.data');

        Route::get('/analyse/stocks', [AnalyseStocksController::class, 'index'])->name('admin.analyse.stocks');
        Route::get('/analyse/stocks/data', [AnalyseStocksController::class, 'data'])->name('admin.analyse.stocks.data');

        Route::get('/localites', [LocaliteController::class, 'index'])->name('admin.localites');
        Route::post('/localites', [LocaliteController::class, 'store']);
        Route::put('/localites/{localite}', [LocaliteController::class, 'update']);
        Route::delete('/localites/{localite}', [LocaliteController::class, 'destroy']);

        Route::get('/sauvegarde', [BackupController::class, 'index'])->name('admin.sauvegarde');
        Route::get('/sauvegarde/export', [BackupController::class, 'export'])->name('admin.sauvegarde.export');
        Route::post('/sauvegarde/import', [BackupController::class, 'import'])->name('admin.sauvegarde.import');
        Route::put('/sauvegarde/settings', [BackupController::class, 'saveSettings'])->name('admin.sauvegarde.settings');

        Route::get('/fournisseurs-archives', [FournisseursArchivesController::class, 'index'])->name('admin.fournisseurs-archives');
        Route::post('/fournisseurs-archives/{fournisseur}/restore', [FournisseursArchivesController::class, 'restore'])->name('admin.fournisseurs-archives.restore');
        Route::delete('/fournisseurs-archives/{fournisseur}', [FournisseursArchivesController::class, 'destroy'])->name('admin.fournisseurs-archives.destroy');

        Route::get('/categories', [CategorieController::class, 'index'])->name('admin.categories');
        Route::post('/categories', [CategorieController::class, 'store']);
        Route::put('/categories/{categorie}', [CategorieController::class, 'update']);
        Route::delete('/categories/{categorie}', [CategorieController::class, 'destroy']);

        Route::post('/types-materiel', [MaterielTypeController::class, 'store']);
        Route::put('/types-materiel/{materielType}', [MaterielTypeController::class, 'update']);
        Route::delete('/types-materiel/{materielType}', [MaterielTypeController::class, 'destroy']);

        Route::get('/aide', [AideController::class, 'index'])->name('admin.aide');
        Route::put('/aide', [AideController::class, 'update']);

        Route::get('/faq', [FaqController::class, 'index'])->name('admin.faq');
        Route::post('/faq', [FaqController::class, 'store']);
        Route::put('/faq/{question}', [FaqController::class, 'update']);
        Route::delete('/faq/{question}', [FaqController::class, 'destroy']);
    });
});

require __DIR__ . "/auth.php";

// Routes d'administration - Migration
Route::prefix("admin/migrations")
    ->name("admin.migrations.")
    ->group(function () {
        Route::get("/", [
            App\Http\Controllers\Admin\MigrationController::class,
            "dashboard",
        ])->name("dashboard");
        Route::post("/run", [
            App\Http\Controllers\Admin\MigrationController::class,
            "runMigrations",
        ])->name("run");
        Route::get("/status", [
            App\Http\Controllers\Admin\MigrationController::class,
            "status",
        ])->name("status");
    });
