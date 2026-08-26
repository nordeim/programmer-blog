/**
 * apps/web/src/__mocks__/server-only.ts — empty stub for `server-only`.
 *
 * Next.js ships a `server-only` package that throws at runtime if a
 * module is imported from a client component. In vitest (jsdom) the
 * test environment doesn't distinguish server/client boundaries, so
 * we substitute this empty module via vitest.config.ts `resolve.alias`.
 *
 * Do not add real logic here — every import of `server-only` will
 * resolve to this file.
 */
export {};
