// Flat config (eslint 9). TypeScript everywhere: src/ is React TSX with
// jsx-a11y, e2e/ is Playwright TS with its own plugin rules.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
    {
        ignores: [
            'dist',
            'node_modules',
            'playwright-report*/**',
            'test-results*/**',
            'dogfood-output',
            'e2e/__screenshots__',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,

    // Application source — React + hooks + accessibility.
    {
        files: ['src/**/*.{ts,tsx}'],
        extends: [
            react.configs.flat.recommended,
            react.configs.flat['jsx-runtime'],
            reactHooks.configs.flat['recommended-latest'],
            jsxA11y.flatConfigs.recommended,
        ],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser },
        },
        settings: { react: { version: 'detect' } },
        plugins: { 'react-refresh': reactRefresh },
        rules: {
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            'react/prop-types': 'off',
            // react-hooks v7 ships compiler-adjacent advisory rules that flag
            // long-standing effect patterns. Kept at warn through the cutover —
            // refactoring effects belongs in its own change (re-evaluate after).
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/preserve-manual-memoization': 'warn',
        },
    },

    // shadcn primitives are polymorphic wrappers: label association and
    // anchor content are supplied by callers, so these two checks are false
    // positives at the primitive layer (callers are still fully linted).
    {
        files: ['src/components/ui/**/*.tsx'],
        rules: {
            'jsx-a11y/label-has-associated-control': 'off',
            'jsx-a11y/anchor-has-content': 'off',
        },
    },

    // Node-side config files.
    {
        files: ['*.config.{js,ts}', 'playwright*.config.ts', 'vite.config.ts'],
        languageOptions: {
            globals: { ...globals.node },
        },
    },

    // E2E — linted (it was fully ignored before the cutover).
    {
        files: ['e2e/**/*.ts'],
        extends: [playwright.configs['flat/recommended']],
        languageOptions: {
            globals: { ...globals.node, ...globals.browser },
        },
        rules: {
            // Fixture bodies legitimately use empty-object destructuring.
            'no-empty-pattern': 'off',
            // The e2e layer may import ONLY types and pure seed constants from
            // the app — never runtime handlers (AGENTS.md mock-drift policy).
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            regex: '^@/(?!api/types/|api/mock/seed-constants$)',
                            message:
                                'e2e may only import DTO types and pure seed constants from src (AGENTS.md).',
                        },
                    ],
                },
            ],
        },
    },

    // Gateway smoke must never fulfill/mock responses — observation only.
    {
        files: ['e2e/gateway/**/*.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: "CallExpression[callee.property.name='fulfill']",
                    message:
                        'Gateway smoke is a no-mock integration gate: route.fulfill is banned here (AGENTS.md).',
                },
                {
                    selector: "CallExpression[callee.property.name='route']",
                    message:
                        'Gateway smoke must not register route handlers — use page.on() observers only.',
                },
            ],
        },
    },

    // Common TS hygiene.
    {
        files: ['**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/consistent-type-imports': [
                'warn',
                { fixStyle: 'inline-type-imports' },
            ],
        },
    },
);
