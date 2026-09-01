import { create } from "zustand";
import type { AccessibilitySettings } from "../types";

type AppState = {
  isAuthenticated: boolean;
  accessibility: AccessibilitySettings;
  discoveryIndex: number;
  authenticate: () => void;
  signOut: () => void;
  nextProfile: () => void;
  updateAccessibility: (update: Partial<AccessibilitySettings>) => void;
};

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: false,
  accessibility: {
    calmMode: true,
    highContrast: false,
    reducedMotion: true,
    textScale: 1,
    quietNotifications: true,
  },
  discoveryIndex: 0,
  authenticate: () => set({ isAuthenticated: true }),
  signOut: () => set({ isAuthenticated: false, discoveryIndex: 0 }),
  nextProfile: () => set((state) => ({ discoveryIndex: state.discoveryIndex + 1 })),
  updateAccessibility: (update) => set((state) => ({ accessibility: { ...state.accessibility, ...update } })),
}));
