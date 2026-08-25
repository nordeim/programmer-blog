// @devlog/config/eslint/base.mjs
// Shared ESLint flat config base for non-Next packages (packages/db, packages/auth,
// packages/email, packages/types). These packages don't use React or JSX, so they
// don't need jsx-a11y or react plugins.
//
// Next.js apps (apps/web) use eslint-config-next's flat config directly
// (which bundles typescript-eslint, jsx-a11y, react, react-hooks, import)
// and then layer on /dev/log's custom rules in apps/web/eslint.config.mjs.

import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default [
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      // ── PRD §11.3 — Never ───────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': false,
          'ts-nocheck': false,
          'ts-check': false,
          minimumDescriptionLength: 10,
        },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-else-return': ['error', { allowElseIf: false }],
      'no-floating-decimal': 'error',
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
];
