import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            publicDirectory: '..', // build/ à la racine du projet, pas dans public/
            buildDirectory: 'build',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    build: {
        emptyOutDir: true, // nécessaire car outDir est hors du root Vite
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'resources/js'),
        },
    },
});
