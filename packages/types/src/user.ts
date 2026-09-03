/**
 * packages/types/src/user.ts — user + session schemas (R-18, MEP #20).
 *
 * Mirrors packages/db/src/schema.ts `users` role enum and the
 * @devlog/auth `SessionUser` interface.
 */
import { z } from 'zod';

export const userRoleSchema = z.enum(['author', 'subscriber']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const USER_ROLES = ['author', 'subscriber'] as const;

export const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().nullable(),
  role: userRoleSchema,
  image: z.string().nullable(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;
