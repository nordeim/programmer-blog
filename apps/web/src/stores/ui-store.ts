/**
 * apps/web/src/stores/ui-store.ts — Zustand store for misc UI state.
 *
 * Holds: mobile nav drawer open/close, subscribe toast visible/hidden.
 * Phase 4 of the MEP adds the toast; Phase 6 adds the mobile nav drawer.
 */
'use client';

import { create } from 'zustand';

interface UiState {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  subscribeToastVisible: boolean;
  showSubscribeToast: () => void;
  hideSubscribeToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  subscribeToastVisible: false,
  showSubscribeToast: () => set({ subscribeToastVisible: true }),
  hideSubscribeToast: () => set({ subscribeToastVisible: false }),
}));
