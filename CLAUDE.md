# PlanB Bar — Notes pour Claude

## Structure du projet

```
planb-bar/          ← racine du projet = httpdocs/ sur le serveur (document root)
  index.php         ← point d'entrée web
  build/            ← assets compilés par Vite (accessible en /build/…)
    assets/
    manifest.json
  laravel/          ← application Laravel
    app/
    resources/js/   ← sources React/TypeScript (à compiler)
    public/         ← présent en local uniquement, absent sur le serveur
    ...
```

## Environnement serveur

- Hébergeur mutualisé **Ouvaton** (serveur `httpdocs/`)
- **Pas d'accès SSH** : tous les déploiements se font par upload FTP
- PHP 8.5 + MySQL
- **Impossible de lancer `npm`, `composer` ou `artisan` côté serveur**

## Dossier `build/` — règle importante

Le dossier `build/` est à la **racine du projet** (`planb-bar/build/`), **pas dans `public/`**.

Cette configuration est intentionnelle pour l'hébergeur mutualisé :
- Sur le serveur, `laravel/public/` n'existe pas → `bootstrap/app.php` détecte cela et configure `public_path()` sur `httpdocs/` (la racine web)
- Laravel cherche donc le manifest à `httpdocs/build/manifest.json` ✓
- Les assets sont servis à l'URL `/build/assets/…` ✓

La config `vite.config.js` reflète cela avec `publicDirectory: '..'`.

## Workflow de modification frontend

Après toute modification d'un fichier `.tsx`, `.ts` ou `.css` dans `laravel/resources/` :

```bash
cd laravel
npm run build
```

→ Les fichiers compilés apparaissent dans `../build/` (= `planb-bar/build/`).

**Uploader sur le serveur** : le dossier `build/` entier (remplacer l'existant).

## Workflow de modification backend (PHP)

Uploader uniquement les fichiers PHP modifiés dans leurs chemins respectifs sous `laravel/`.

Si une **migration** est ajoutée : déclencher la migration via l'interface `/admin/migrations`.

## Stack technique

- **Backend** : Laravel 11, PHP 8.5
- **Frontend** : React 19 + TypeScript, Inertia.js, Tailwind CSS v4, shadcn/ui
- **Build** : Vite 6 + `laravel-vite-plugin`

## Commandes utiles (en local)

```bash
cd laravel
npm install       # première fois ou après ajout de dépendances
npm run build     # compiler le frontend → planb-bar/build/
```
