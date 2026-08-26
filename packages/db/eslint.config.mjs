// Local ESLint flat config — extends @devlog/config/eslint/base.mjs.
import base from '@devlog/config/eslint/base.mjs';

export default [
  ...base,
  {
    ignores: ['dist/', 'node_modules/', 'tsconfig.tsbuildinfo'],
  },
  {
    files: ['src/seed.ts', 'src/migrate.ts', 'src/seed.test.ts'],
    rules: {
      // CLI scripts print progress to stdout.
      'no-console': 'off',
    },
  },
];
