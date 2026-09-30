import js from '@eslint/js';
import {defineConfig, globalIgnores} from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default defineConfig([
    globalIgnores(['**/dist/**', '**/.wrangler/**', '.idea/**']),
    {
        files: ['**/*.{js,ts,tsx}'],
        extends: [js.configs.recommended, tseslint.configs.recommended],
    },
    {
        files: ['eslint.config.js', 'apps/web/vite.config.ts'],
        languageOptions: {globals: globals.node},
    },
    {
        files: ['apps/web/src/**/*.{ts,tsx}'],
        languageOptions: {globals: globals.browser},
    },
    {
        files: ['apps/web/src/**/*.tsx'],
        extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    },
]);
