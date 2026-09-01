export type CompatibilityProfile = {
  datingGoals: string[];
  communicationStyles: string[];
  sensoryPreferences: string[];
  socialEnergy: number;
  routinePreference: number;
  interests: string[];
  distanceKm: number;
  vicesCompatibility: number;
  dateEnvironments: string[];
  desiredPace: number;
  boundaries: string[];
};

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

const overlap = (a: string[], b: string[]) => {
  if (!a.length || !b.length) return 0.5;
  const left = new Set(a.map((value) => value.toLowerCase()));
  return b.filter((value) => left.has(value.toLowerCase())).length / Math.max(a.length, b.length);
};

const proximity = (a: number, b: number) => Math.max(0, 1 - Math.abs(a - b) / 100);
const round = (value: number) => Math.round(value * 10) / 10;

export function scoreCompatibility(
  viewer: CompatibilityProfile,
  candidate: CompatibilityProfile,
  maxDistanceKm = 80,
): CompatibilityBreakdown {
  const datingGoals = overlap(viewer.datingGoals, candidate.datingGoals) * 15;
  const communicationStyle = overlap(viewer.communicationStyles, candidate.communicationStyles) * 15;
  const sensoryPreferences = overlap(viewer.sensoryPreferences, candidate.sensoryPreferences) * 15;
  const socialEnergy = proximity(viewer.socialEnergy, candidate.socialEnergy) * 10;
  const routine = proximity(viewer.routinePreference, candidate.routinePreference) * 10;
  const interests = overlap(viewer.interests, candidate.interests) * 10;
  const location = Math.max(0, 1 - candidate.distanceKm / Math.max(maxDistanceKm, 1)) * 10;
  const vices = Math.min(1, Math.max(0, candidate.vicesCompatibility)) * 5;
  const dateEnvironment = overlap(viewer.dateEnvironments, candidate.dateEnvironments) * 5;
  const boundariesFit = overlap(viewer.boundaries, candidate.boundaries);
  const paceAndBoundaries = ((proximity(viewer.desiredPace, candidate.desiredPace) + boundariesFit) / 2) * 5;
  const total = datingGoals + communicationStyle + sensoryPreferences + socialEnergy + routine + interests + location + vices + dateEnvironment + paceAndBoundaries;

  return {
    total: round(Math.min(100, Math.max(0, total))),
    datingGoals: round(datingGoals),
    communicationStyle: round(communicationStyle),
    sensoryPreferences: round(sensoryPreferences),
    socialEnergy: round(socialEnergy),
    routine: round(routine),
    interests: round(interests),
    location: round(location),
    vices: round(vices),
    dateEnvironment: round(dateEnvironment),
    paceAndBoundaries: round(paceAndBoundaries),
  };
}
