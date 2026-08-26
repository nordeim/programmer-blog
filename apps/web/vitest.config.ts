import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(rootDir, './src'),
      '@devlog/db': resolve(rootDir, '../../packages/db/src/index.ts'),
      '@devlog/db/*': resolve(rootDir, '../../packages/db/src/*'),
      '@devlog/auth': resolve(rootDir, '../../packages/auth/src/index.ts'),
      '@devlog/auth/*': resolve(rootDir, '../../packages/auth/src/*'),
      '@devlog/email': resolve(rootDir, '../../packages/email/src/index.ts'),
      '@devlog/email/*': resolve(rootDir, '../../packages/email/src/*'),
      '@devlog/types': resolve(rootDir, '../../packages/types/src/index.ts'),
      '@devlog/types/*': resolve(rootDir, '../../packages/types/src/*'),
      // `server-only` is a Next.js package that throws when imported on the
      // client. In vitest (jsdom), we treat it as an empty module so tests
      // can import server-only files without erroring.
      'server-only': resolve(rootDir, './src/__mocks__/server-only.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/__mocks__/**',
        'src/**/types.ts',
        'src/app/**/layout.tsx',
        'src/**/page.tsx',
        'next-env.d.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
