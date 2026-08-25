// @devlog/web ESLint flat config.
// Uses eslint-config-next v16's flat config as the base (it bundles
// typescript-eslint, jsx-a11y, react, react-hooks, import, and the
// Next.js core-web-vitals rules), then layers on /dev/log's custom rules
// from PRD §11 (Boundaries) and PAD §6 (Security).
//
// The `react/no-danger` rule is overridden ONLY in src/lib/mdx.ts and
// src/app/layout.tsx — the two places where dangerouslySetInnerHTML is
// required (the inline theme-script in <head>, and the MDX renderer's
// serialized props). Both are heavily reviewed.

import nextPlugin from 'eslint-config-next';

// eslint-config-next v16 exports a flat-config array directly.
const nextConfigs = /** @type {unknown} */ (nextPlugin);

export default [
  {
    ignores: [
      '.next/',
      '.turbo/',
      'dist/',
      'coverage/',
      'node_modules/',
      'drizzle.config.ts',
      'vitest.setup.ts',
      'next-env.d.ts',
    ],
  },
  ...(/** @type {any[]} */ (nextConfigs)),
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // ── PRD §11.3 — Never ───────────────────────────────────────────
      // No `any`. Use `unknown` and narrow with Zod.
      '@typescript-eslint/no-explicit-any': 'error',
      // No `@ts-ignore` without a justification comment.
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
      // No `dangerouslySetInnerHTML` — gated to mdx.ts and layout.tsx overrides below.
      'react/no-danger': 'error',

      // ── Code quality ────────────────────────────────────────────────
      // No console.log in committed code — use the structured logger.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // No unused vars (the TS compiler also enforces this in strict mode).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Prefer early returns over deep nesting.
      'no-else-return': ['error', { allowElseIf: false }],
      // No floating decimals (1.0 vs 1).
      'no-floating-decimal': 'error',
      // Enforce import ordering.
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // ── Next.js-specific ───────────────────────────────────────────
      // Next.js Image component is required for all images.
      '@next/next/no-img-element': 'error',
      // No <a> for internal links — use <Link>.
      '@next/next/no-html-link-for-pages': 'warn',
      // Allow async Server Actions / Next.js async params pattern.
      '@typescript-eslint/no-misused-promises': 'off',
      // Permit inline script in <head> for the theme cookie sync.
      // See apps/web/src/app/layout.tsx (PAD §3.3 Pattern 1).
      '@next/next/no-sync-scripts': 'off',
    },
  },
  {
    // mdx.ts uses dangerouslySetInnerHTML via next-mdx-remote's serialize.
    // layout.tsx uses dangerouslySetInnerHTML for the inline theme-sync script.
    files: ['src/lib/mdx.ts', 'src/app/layout.tsx'],
    rules: {
      'react/no-danger': 'off',
    },
  },
];
