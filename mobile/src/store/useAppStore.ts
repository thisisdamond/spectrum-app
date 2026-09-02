import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { api, clearSession, getMediaHeaders, getStoredUser, saveSession } from "../services/api";
import type {
  AccessibilitySettings, DiscoveryAdvancedFilters, DiscoveryCandidate, DiscoveryStatus, IncomingLike,
  MatchSummary, Preferences, Profile, ProfilePhoto, PromptAnswer, Session, SetupStatus, SpectrumUser,
} from "../types";

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
  discoveryCandidates: DiscoveryCandidate[];
  discoveryStatus: DiscoveryStatus | null;
  discoveryLoading: boolean;
  discoveryError: string | null;
  discoveryActionUserId: string | null;
  discoveryFilters: DiscoveryAdvancedFilters;
  incomingLikes: IncomingLike[];
  likesLoading: boolean;
  likesError: string | null;
  matches: MatchSummary[];
  matchesLoading: boolean;
  matchesError: string | null;
  lastMatch: { id: string; userId: string; name: string } | null;
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
  updateAccessibility: (update: Partial<AccessibilitySettings>) => void;
  startDiscoveryBreak: () => void;
  setDiscoveryFilters: (filters: DiscoveryAdvancedFilters) => void;
  loadDiscovery: () => Promise<void>;
  likeCandidate: (userId: string, targetType?: "PROFILE" | "PHOTO" | "PROMPT", targetId?: string) => Promise<boolean>;
  passCandidate: (userId: string) => Promise<void>;
  backtrack: () => Promise<void>;
  loadIncomingLikes: () => Promise<void>;
  loadMatches: () => Promise<void>;
  clearLastMatch: () => void;
};

const defaultAccessibility: AccessibilitySettings = {
  calmMode: true, highContrast: false, reducedMotion: true, textScale: 1,
  quietNotifications: true, noAutoplayVideo: true, breakModeUntil: null,
};

async function loadProfileBundle() {
  const [{ user }, { status }] = await Promise.all([
    api<{ user: ProfileBundle }>("/profile/me"),
    api<{ status: SetupStatus }>("/profile/setup-status"),
  ]);
  return { user, status };
}

async function withMediaHeaders(candidate: DiscoveryCandidate) {
  const headers = await getMediaHeaders();
  return { ...candidate, photos: candidate.photos.map((photo) => ({ ...photo, headers })) };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
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
  discoveryCandidates: [],
  discoveryStatus: null,
  discoveryLoading: false,
  discoveryError: null,
  discoveryActionUserId: null,
  discoveryFilters: {},
  incomingLikes: [],
  likesLoading: false,
  likesError: null,
  matches: [],
  matchesLoading: false,
  matchesError: null,
  lastMatch: null,

  initialize: async () => {
    const [storedUser, storedAccessibility] = await Promise.all([
      getStoredUser(), SecureStore.getItemAsync("spectrum.accessibility"),
    ]);
    if (storedAccessibility) {
      try { set({ accessibility: { ...defaultAccessibility, ...JSON.parse(storedAccessibility) } }); } catch { /* keep safe defaults */ }
    }
    if (!storedUser) { set({ sessionStatus: "signedOut" }); return; }
    set({ user: storedUser });
    try { await get().refreshProfile(); set({ sessionStatus: "signedIn" }); }
    catch { await clearSession(); set({ sessionStatus: "signedOut", user: null }); }
  },

  register: async (email, password) => {
    const response = await api<{ user: SpectrumUser; previewUrl?: string }>("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) });
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
    const response = await api<Session | { requiresTwoFactor: true; challengeToken: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    if ("requiresTwoFactor" in response) { set({ challengeToken: response.challengeToken }); return "twoFactor"; }
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
    set({
      sessionStatus: "signedOut", user: null, profile: null, preferences: null, photos: [], prompts: [], setupStatus: null,
      discoveryCandidates: [], discoveryStatus: null, discoveryError: null, incomingLikes: [], likesError: null, matches: [], matchesError: null, lastMatch: null,
    });
  },

  refreshProfile: async () => {
    const { user, status } = await loadProfileBundle();
    set({
      user: { id: user.id, email: user.email, status: user.status, twoFactorEnabled: user.twoFactorEnabled },
      profile: user.profile, preferences: user.preferences, photos: user.photos, prompts: user.prompts, setupStatus: status,
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

  startDiscoveryBreak: () => {
    const breakModeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    get().updateAccessibility({ breakModeUntil });
    set({ discoveryCandidates: [], incomingLikes: [], discoveryError: null });
  },

  setDiscoveryFilters: (filters) => set({ discoveryFilters: filters }),

  loadDiscovery: async () => {
    set({ discoveryLoading: true, discoveryError: null });
    const filters = get().discoveryFilters;
    const query = [
      filters.minCompatibility !== undefined ? `minCompatibility=${filters.minCompatibility}` : null,
      filters.datingGoals?.length ? `datingGoals=${encodeURIComponent(filters.datingGoals.join(","))}` : null,
      filters.communicationStyles?.length ? `communicationStyles=${encodeURIComponent(filters.communicationStyles.join(","))}` : null,
      filters.dateEnvironments?.length ? `dateEnvironments=${encodeURIComponent(filters.dateEnvironments.join(","))}` : null,
    ].filter(Boolean).join("&");
    try {
      const response = await api<{ candidates: DiscoveryCandidate[]; status: DiscoveryStatus }>(`/discovery${query ? `?${query}` : ""}`);
      set({ discoveryCandidates: await Promise.all(response.candidates.map(withMediaHeaders)), discoveryStatus: response.status, discoveryLoading: false });
    } catch (error) {
      set({ discoveryCandidates: [], discoveryLoading: false, discoveryError: errorMessage(error) });
    }
  },

  likeCandidate: async (userId, targetType = "PROFILE", targetId) => {
    set({ discoveryActionUserId: userId, discoveryError: null });
    try {
      const response = await api<{ match: { id: string } | null; status: DiscoveryStatus }>("/discovery/like", {
        method: "POST", body: JSON.stringify({ userId, targetType, ...(targetId ? { targetId } : {}) }),
      });
      const candidate = get().discoveryCandidates.find((item) => item.userId === userId)
        ?? get().incomingLikes.find((item) => item.candidate.userId === userId)?.candidate;
      set((state) => ({
        discoveryCandidates: state.discoveryCandidates.filter((item) => item.userId !== userId),
        incomingLikes: state.incomingLikes.filter((item) => item.candidate.userId !== userId),
        discoveryStatus: response.status, discoveryActionUserId: null,
        ...(response.match && candidate ? { lastMatch: { id: response.match.id, userId: candidate.userId, name: candidate.profile.displayName } } : {}),
      }));
      return Boolean(response.match);
    } catch (error) {
      set({ discoveryActionUserId: null, discoveryError: errorMessage(error) });
      throw error;
    }
  },

  passCandidate: async (userId) => {
    set({ discoveryActionUserId: userId, discoveryError: null });
    try {
      await api("/discovery/reject", { method: "POST", body: JSON.stringify({ userId }) });
      set((state) => ({
        discoveryCandidates: state.discoveryCandidates.filter((item) => item.userId !== userId),
        incomingLikes: state.incomingLikes.filter((item) => item.candidate.userId !== userId),
        discoveryActionUserId: null,
        discoveryStatus: state.discoveryStatus ? { ...state.discoveryStatus, backtrackAvailable: state.discoveryStatus.tier === "PREMIUM" } : null,
      }));
    } catch (error) {
      set({ discoveryActionUserId: null, discoveryError: errorMessage(error) });
      throw error;
    }
  },

  backtrack: async () => {
    set({ discoveryLoading: true, discoveryError: null });
    try {
      const { status } = await api<{ status: DiscoveryStatus }>("/discovery/backtrack", { method: "POST" });
      set({ discoveryStatus: status });
      await get().loadDiscovery();
    } catch (error) {
      set({ discoveryLoading: false, discoveryError: errorMessage(error) });
    }
  },

  loadIncomingLikes: async () => {
    set({ likesLoading: true, likesError: null, discoveryError: null });
    try {
      const response = await api<{ likes: IncomingLike[]; status: DiscoveryStatus }>("/discovery/likes");
      const likes = await Promise.all(response.likes.map(async (like) => ({ ...like, candidate: await withMediaHeaders(like.candidate) })));
      set({ incomingLikes: likes, discoveryStatus: response.status, likesLoading: false });
    } catch (error) {
      set({ incomingLikes: [], likesLoading: false, likesError: errorMessage(error) });
    }
  },

  loadMatches: async () => {
    set({ matchesLoading: true, matchesError: null });
    try {
      const response = await api<{ matches: MatchSummary[] }>("/matches");
      const headers = await getMediaHeaders();
      set({
        matches: response.matches.map((match) => ({ ...match, otherUser: { ...match.otherUser, photo: match.otherUser.photo ? { ...match.otherUser.photo, headers } : null } })),
        matchesLoading: false, matchesError: null,
      });
    } catch (error) {
      set({ matches: [], matchesLoading: false, matchesError: errorMessage(error) });
    }
  },

  clearLastMatch: () => set({ lastMatch: null }),
}));
