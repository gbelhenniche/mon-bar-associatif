<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Gestion des Migrations - Mon Bar Associatif</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body class="bg-slate-50">
    <div class="min-h-screen flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl p-8">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-slate-900">🗄️ Gestion des Migrations</h1>
                <p class="text-slate-600 mt-2">Exécute les migrations de base de données</p>
            </div>

            <!-- Formulaire d'authentification -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <label class="block text-sm font-medium text-slate-900 mb-2">
                    🔐 Token d'authentification
                </label>
                <input 
                    type="password" 
                    id="token" 
                    class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Saisis le token de sécurité"
                />
                <p class="text-xs text-slate-600 mt-2">
                    Le token est visible dans la console serveur lors du déploiement
                </p>
            </div>

            <!-- Informations de statut -->
            <div id="statusContainer" class="bg-slate-100 rounded-lg p-4 mb-8 max-h-48 overflow-y-auto font-mono text-xs text-slate-700">
                <div class="text-center text-slate-500">Cliquez sur "Vérifier l'état" pour voir le statut actuel</div>
            </div>

            <!-- Boutons d'action -->
            <div class="flex gap-3 flex-wrap">
                <button 
                    onclick="checkStatus()" 
                    class="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                >
                    ✓ Vérifier l'état
                </button>
                <button 
                    onclick="runMigrations()" 
                    id="runBtn"
                    class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    🚀 Exécuter les migrations
                </button>
            </div>

            <!-- Résultats -->
            <div id="output" class="hidden mt-8">
                <h3 class="text-lg font-bold text-slate-900 mb-2">📋 Résultats :</h3>
                <div class="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto" id="outputContent">
                </div>
            </div>

            <!-- Zone d'alerte -->
            <div id="alert" class="hidden mt-6 p-4 rounded-lg font-medium"></div>
        </div>
    </div>

    <script>
        async function checkStatus() {
            const token = document.getElementById('token').value;
            if (!token) {
                showAlert('❌ Token requis', 'error');
                return;
            }

            try {
                document.getElementById('statusContainer').innerHTML = '⏳ Vérification en cours...';
                
                const response = await fetch(`/admin/migrations/status?token=${encodeURIComponent(token)}`);
                const data = await response.json();

                if (data.success) {
                    document.getElementById('statusContainer').innerHTML = 
                        `<strong>✅ État actuel :</strong>\n\n${data.status || 'Aucune info'}`;
                    showAlert('✅ Statut récupéré', 'success');
                } else {
                    document.getElementById('statusContainer').innerHTML = data.error || 'Erreur inconnue';
                    showAlert('❌ ' + (data.error || 'Erreur'), 'error');
                }
            } catch (err) {
                document.getElementById('statusContainer').innerHTML = `Erreur : ${err.message}`;
                showAlert('❌ Erreur réseau', 'error');
            }
        }

        async function runMigrations() {
            const token = document.getElementById('token').value;
            if (!token) {
                showAlert('❌ Token requis', 'error');
                return;
            }

            if (!confirm('⚠️ Êtes-vous sûr ? Cette action exécutera TOUTES les migrations en attente.')) {
                return;
            }

            const btn = document.getElementById('runBtn');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner">⚙️</span> Exécution...';

            try {
                const response = await fetch('/admin/migrations/run', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
                    },
                    body: JSON.stringify({ token })
                });

                const data = await response.json();

                document.getElementById('output').classList.remove('hidden');
                document.getElementById('outputContent').innerHTML = 
                    (data.output || data.error || 'Pas de sortie').replace(/</g, '&lt;').replace(/>/g, '&gt;');

                if (data.success) {
                    showAlert('✅ Migrations exécutées avec succès !', 'success');
                } else {
                    showAlert('❌ ' + (data.error || 'Erreur inconnue'), 'error');
                }
            } catch (err) {
                showAlert('❌ Erreur : ' + err.message, 'error');
                document.getElementById('outputContent').innerHTML = `Erreur : ${err.message}`;
                document.getElementById('output').classList.remove('hidden');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '🚀 Exécuter les migrations';
            }
        }

        function showAlert(message, type) {
            const alert = document.getElementById('alert');
            const colors = {
                success: 'bg-green-100 border border-green-300 text-green-900',
                error: 'bg-red-100 border border-red-300 text-red-900'
            };
            alert.className = `block ${colors[type] || colors.error}`;
            alert.textContent = message;
            
            setTimeout(() => alert.classList.add('hidden'), 5000);
        }
    </script>
</body>
</html>
