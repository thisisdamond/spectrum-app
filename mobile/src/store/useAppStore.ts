import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { api, clearSession, getStoredUser, saveSession } from "../services/api";
import type { AccessibilitySettings, Preferences, Profile, ProfilePhoto, PromptAnswer, Session, SetupStatus, SpectrumUser } from "../types";

type ProfileBundle = SpectrumUser & {
  profile: Profile | null;
  preferences: Preferences | null;
  accessibility: AccessibilitySettings | null;
  photos: ProfilePhoto[];
  prompts: PromptAnswer[];
};

type AppState = {
  sessionStatus: "loading" | "signedOut" | "signedIn";
  user: SpectrumUser | null;
  profile: Profile | null;
  preferences: Preferences | null;
  photos: ProfilePhoto[];
  prompts: PromptAnswer[];
  setupStatus: SetupStatus | null;
  challengeToken: string | null;
  pendingEmail: string | null;
  pendingPreviewUrl: string | null;
  accessibility: AccessibilitySettings;
  discoveryIndex: number;
  initialize: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<string | undefined>;
  login: (email: string, password: string) => Promise<"signedIn" | "twoFactor">;
  verifyTwoFactor: (code: string) => Promise<void>;
  socialLogin: (provider: "APPLE" | "GOOGLE", idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  saveProfile: (input: Record<string, unknown>, partial?: boolean) => Promise<void>;
  savePreferences: (input: Preferences) => Promise<void>;
  addPrompt: (input: { promptKey: string; answer: string; position: number }) => Promise<void>;
  addPhoto: (photo: ProfilePhoto) => void;
  nextProfile: () => void;
  updateAccessibility: (update: Partial<AccessibilitySettings>) => void;
};

const defaultAccessibility: AccessibilitySettings = {
  calmMode: true,
  highContrast: false,
  reducedMotion: true,
  textScale: 1,
  quietNotifications: true,
  noAutoplayVideo: true,
  breakModeUntil: null,
};

async function loadProfileBundle() {
  const [{ user }, { status }] = await Promise.all([
    api<{ user: ProfileBundle }>("/profile/me"),
    api<{ status: SetupStatus }>("/profile/setup-status"),
  ]);
  return { user, status };
}

export const useAppStore = create<AppState>((set, get) => ({
  sessionStatus: "loading",
  user: null,
  profile: null,
  preferences: null,
  photos: [],
  prompts: [],
  setupStatus: null,
  challengeToken: null,
  pendingEmail: null,
  pendingPreviewUrl: null,
  accessibility: defaultAccessibility,
  discoveryIndex: 0,

  initialize: async () => {
    const [storedUser, storedAccessibility] = await Promise.all([
      getStoredUser(),
      SecureStore.getItemAsync("spectrum.accessibility"),
    ]);
    if (storedAccessibility) {
      try { set({ accessibility: { ...defaultAccessibility, ...JSON.parse(storedAccessibility) } }); } catch { /* keep safe defaults */ }
    }
    if (!storedUser) { set({ sessionStatus: "signedOut" }); return; }
    set({ user: storedUser });
    try {
      await get().refreshProfile();
      set({ sessionStatus: "signedIn" });
    } catch {
      await clearSession();
      set({ sessionStatus: "signedOut", user: null });
    }
  },

  register: async (email, password) => {
    const response = await api<{ user: SpectrumUser; previewUrl?: string }>("/auth/register", {
      method: "POST", body: JSON.stringify({ email, password }),
    });
    set({ pendingEmail: response.user.email, pendingPreviewUrl: response.previewUrl ?? null });
  },

  verifyEmail: async (token) => {
    const session = await api<Session>("/auth/email/verify", { method: "POST", body: JSON.stringify({ token }) });
    await saveSession(session);
    set({ user: session.user, sessionStatus: "signedIn", pendingEmail: null, pendingPreviewUrl: null });
    await get().refreshProfile();
  },

  resendVerification: async () => {
    const email = get().pendingEmail;
    if (!email) throw new Error("Enter your email again to resend verification");
    const response = await api<{ previewUrl?: string }>("/auth/email/resend", { method: "POST", body: JSON.stringify({ email }) });
    set({ pendingPreviewUrl: response.previewUrl ?? null });
    return response.previewUrl;
  },

  login: async (email, password) => {
    const response = await api<Session | { requiresTwoFactor: true; challengeToken: string }>("/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    });
    if ("requiresTwoFactor" in response) {
      set({ challengeToken: response.challengeToken });
      return "twoFactor";
    }
    await saveSession(response);
    set({ user: response.user, sessionStatus: "signedIn", challengeToken: null });
    await get().refreshProfile();
    return "signedIn";
  },

  verifyTwoFactor: async (code) => {
    const challengeToken = get().challengeToken;
    if (!challengeToken) throw new Error("Start login again");
    const session = await api<Session>("/auth/2fa/challenge", { method: "POST", body: JSON.stringify({ challengeToken, code }) });
    await saveSession(session);
    set({ user: session.user, sessionStatus: "signedIn", challengeToken: null });
    await get().refreshProfile();
  },

  socialLogin: async (provider, idToken) => {
    const session = await api<Session>("/auth/social", { method: "POST", body: JSON.stringify({ provider, idToken }) });
    await saveSession(session);
    set({ user: session.user, sessionStatus: "signedIn" });
    await get().refreshProfile();
  },

  signOut: async () => {
    await api<void>("/auth/logout", { method: "POST" }).catch(() => undefined);
    await clearSession();
    set({ sessionStatus: "signedOut", user: null, profile: null, preferences: null, photos: [], prompts: [], setupStatus: null, discoveryIndex: 0 });
  },

  refreshProfile: async () => {
    const { user, status } = await loadProfileBundle();
    set({
      user: { id: user.id, email: user.email, status: user.status, twoFactorEnabled: user.twoFactorEnabled },
      profile: user.profile,
      preferences: user.preferences,
      photos: user.photos,
      prompts: user.prompts,
      setupStatus: status,
      ...(user.accessibility ? { accessibility: { ...defaultAccessibility, ...user.accessibility } } : {}),
    });
  },

  saveProfile: async (input, partial = false) => {
    const { profile } = await api<{ profile: Profile }>("/profile/me", { method: partial ? "PATCH" : "PUT", body: JSON.stringify(input) });
    set({ profile });
    await get().refreshProfile();
  },

  savePreferences: async (input) => {
    const { preferences } = await api<{ preferences: Preferences }>("/profile/preferences", { method: "PUT", body: JSON.stringify(input) });
    set({ preferences });
    await get().refreshProfile();
  },

  addPrompt: async (input) => {
    const { prompt } = await api<{ prompt: PromptAnswer }>("/profile/prompts", { method: "POST", body: JSON.stringify(input) });
    set((state) => ({ prompts: [...state.prompts, prompt] }));
    await get().refreshProfile();
  },

  addPhoto: (photo) => set((state) => ({ photos: [...state.photos, photo].sort((a, b) => a.position - b.position) })),
  nextProfile: () => set((state) => ({ discoveryIndex: state.discoveryIndex + 1 })),

  updateAccessibility: (update) => {
    const previous = get().accessibility;
    const accessibility = { ...previous, ...update };
    set({ accessibility });
    void SecureStore.setItemAsync("spectrum.accessibility", JSON.stringify(accessibility));
    if (get().sessionStatus === "signedIn") {
      void api<{ settings: AccessibilitySettings }>("/settings/accessibility", { method: "PUT", body: JSON.stringify(update) })
        .then(({ settings }) => set({ accessibility: { ...defaultAccessibility, ...settings } }))
        .catch(() => set({ accessibility: previous }));
    }
  },
}));
