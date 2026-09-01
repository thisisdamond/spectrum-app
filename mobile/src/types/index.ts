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
};
