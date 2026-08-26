// Local ESLint flat config — extends @devlog/config/eslint/base.mjs.
import base from '@devlog/config/eslint/base.mjs';

export default [
  ...base,
  {
    ignores: ['dist/', 'node_modules/', 'tsconfig.tsbuildinfo'],
  },
];
