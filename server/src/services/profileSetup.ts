type SetupSource = {
  profile: { communicationStyle: string[]; sensoryPreferences: string[]; communicationCard: unknown } | null;
  preferences: unknown;
  photoCount: number;
  promptCount: number;
};

export function getProfileSetupStatus(source: SetupSource) {
  const steps = [
    { key: "basics", complete: Boolean(source.profile) },
    { key: "preferences", complete: Boolean(source.preferences) },
    { key: "communication", complete: Boolean(source.profile?.communicationStyle.length || source.profile?.communicationCard) },
    { key: "sensory", complete: Boolean(source.profile?.sensoryPreferences.length) },
    { key: "photos", complete: source.photoCount > 0 },
    { key: "prompts", complete: source.promptCount > 0 },
  ];
  const completed = steps.filter((step) => step.complete).length;
  return { steps, completed, total: steps.length, complete: completed === steps.length };
}
