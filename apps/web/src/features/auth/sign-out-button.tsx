/**
 * apps/web/src/features/auth/sign-out-button.tsx — FR-33.
 *
 * Client component. Calls the `signOutAction` Server Action and
 * redirects to `/admin/login`.
 */
'use client';

import { useRouter } from 'next/navigation';

import { signOutAction } from '@/features/auth/actions';

export function SignOutButton() {
  const router = useRouter();

  async function onSignOut() {
    try {
      const { redirectTo } = await signOutAction();
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      console.error('[sign-out-button] failed', err);
    }
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      className="font-mono text-sm hover-link"
      data-testid="sign-out"
    >
      sign out →
    </button>
  );
}
