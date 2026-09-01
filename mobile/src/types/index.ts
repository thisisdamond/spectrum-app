export type DemoProfile = {
  id: string;
  name: string;
  age: number;
  pronouns: string;
  city: string;
  compatibility: number;
  bio: string;
  interests: string[];
  communication: string[];
  dateEnvironments: string[];
  prompt: { question: string; answer: string };
  accent: string;
};

export type AccessibilitySettings = {
  calmMode: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  textScale: number;
  quietNotifications: boolean;
  noAutoplayVideo: boolean;
  breakModeUntil: string | null;
};

export type SpectrumUser = { id: string; email: string; status: string; twoFactorEnabled: boolean };
export type Session = { accessToken: string; refreshToken: string; user: SpectrumUser };
export type DatingGoal = "LONG_TERM" | "SHORT_TERM" | "FRIENDSHIP_FIRST" | "LIFE_PARTNER" | "EXPLORING";

export type Profile = {
  id: string;
  displayName: string;
  birthDate: string;
  gender: string;
  pronouns: string | null;
  city: string | null;
  region: string | null;
  countryCode: string | null;
  datingGoal: DatingGoal;
  bio: string | null;
  interests: string[];
  communicationStyle: string[];
  sensoryPreferences: string[];
  socialEnergy: number;
  routinePreference: number;
  directnessPreference: number;
  preferredDatingPace: number;
  preferredDateEnvironments: string[];
  boundaries: string[];
  communicationCard: Record<string, string> | null;
  discoveryPaused: boolean;
};

export type Preferences = {
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  interestedInGenders: string[];
  datingGoals: DatingGoal[];
  drinking: "AVOID" | "LOW" | "MODERATE" | "HIGH" | "LOVE";
  smoking: "AVOID" | "LOW" | "MODERATE" | "HIGH" | "LOVE";
  cannabis: "AVOID" | "LOW" | "MODERATE" | "HIGH" | "LOVE";
  communicationStyles: string[];
  sensoryPreferences: string[];
  socialEnergyTarget: number;
  routineTarget: number;
  dateEnvironments: string[];
  desiredPace: number;
  hardBoundaries: string[];
};

export type ProfilePhoto = { id: string; url: string; altText: string | null; mimeType: string; sizeBytes: number; position: number };
export type PromptAnswer = { id: string; promptKey: string; answer: string; position: number };
export type SetupStatus = { steps: Array<{ key: string; complete: boolean }>; completed: number; total: number; complete: boolean };
