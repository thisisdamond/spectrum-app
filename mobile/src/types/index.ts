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

export type ProfilePhoto = { id: string; url: string; altText: string | null; mimeType: string; sizeBytes: number; position: number; headers?: Record<string, string> };
export type PromptAnswer = { id: string; promptKey: string; answer: string; position: number };
export type SetupStatus = { steps: Array<{ key: string; complete: boolean }>; completed: number; total: number; complete: boolean };

export type CompatibilityBreakdown = {
  total: number;
  datingGoals: number;
  communicationStyle: number;
  sensoryPreferences: number;
  socialEnergy: number;
  routine: number;
  interests: number;
  location: number;
  vices: number;
  dateEnvironment: number;
  paceAndBoundaries: number;
};

export type CompatibilityExplanation = {
  summary: string;
  highlights: string[];
  dimensions: Array<{ key: string; label: string; score: number; maxScore: number }>;
};

export type PublicProfile = {
  displayName: string;
  age: number;
  gender: string;
  pronouns: string | null;
  city: string | null;
  region: string | null;
  datingGoal: DatingGoal;
  bio: string | null;
  interests: string[];
  communicationStyle: string[];
  sensoryPreferences: string[];
  socialEnergy: number;
  routinePreference: number;
  preferredDatingPace: number;
  preferredDateEnvironments: string[];
  boundaries: string[];
  communicationCard: Record<string, string> | null;
};

export type DiscoveryCandidate = {
  userId: string;
  profile: PublicProfile;
  photos: ProfilePhoto[];
  prompts: PromptAnswer[];
  distanceKm: number | null;
  compatibility: CompatibilityBreakdown;
  explanation: CompatibilityExplanation;
};

export type DiscoveryStatus = {
  tier: "FREE" | "PREMIUM";
  likesUsed: number;
  dailyLikeLimit: number | null;
  likesRemaining: number | null;
  resetAt: string;
  backtrackAvailable: boolean;
};

export type IncomingLike = {
  id: string;
  receivedAt: string;
  targetType: "PROFILE" | "PHOTO" | "PROMPT" | "VIDEO_PROMPT";
  targetId: string | null;
  comment: string | null;
  candidate: DiscoveryCandidate;
};

export type MatchSummary = {
  id: string;
  matchedAt: string;
  compatibilityScore: number | null;
  otherUser: { userId: string; profile: PublicProfile; photo: ProfilePhoto | null };
  lastMessage: { id: string; senderId: string; body: string; readAt: string | null; createdAt: string } | null;
};

export type DiscoveryAdvancedFilters = {
  minCompatibility?: number;
  datingGoals?: DatingGoal[];
  communicationStyles?: string[];
  dateEnvironments?: string[];
};
