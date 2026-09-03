/**
 * apps/web/src/stores/ui-store.test.ts — Zustand UI state.
 */
import { describe, expect, it } from 'vitest';

import { useUiStore } from './ui-store';

describe('useUiStore', () => {
  it('starts with the drawer closed and toast hidden', () => {
    const s = useUiStore.getState();
    expect(s.mobileNavOpen).toBe(false);
    expect(s.subscribeToastVisible).toBe(false);
  });

  it('toggles the mobile nav drawer', () => {
    useUiStore.getState().setMobileNavOpen(true);
    expect(useUiStore.getState().mobileNavOpen).toBe(true);
    useUiStore.getState().setMobileNavOpen(false);
    expect(useUiStore.getState().mobileNavOpen).toBe(false);
  });

  it('shows and hides the subscribe toast', () => {
    useUiStore.getState().showSubscribeToast();
    expect(useUiStore.getState().subscribeToastVisible).toBe(true);
    useUiStore.getState().hideSubscribeToast();
    expect(useUiStore.getState().subscribeToastVisible).toBe(false);
  });
});
