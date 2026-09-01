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

export type CompatibilityExplanation = {
  summary: string;
  highlights: string[];
  dimensions: Array<{ key: keyof Omit<CompatibilityBreakdown, "total">; label: string; score: number; maxScore: number }>;
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

const dimensionMaximums: Record<keyof Omit<CompatibilityBreakdown, "total">, number> = {
  datingGoals: 15,
  communicationStyle: 15,
  sensoryPreferences: 15,
  socialEnergy: 10,
  routine: 10,
  interests: 10,
  location: 10,
  vices: 5,
  dateEnvironment: 5,
  paceAndBoundaries: 5,
};

const dimensionLabels: Record<keyof Omit<CompatibilityBreakdown, "total">, string> = {
  datingGoals: "Dating goals",
  communicationStyle: "Communication",
  sensoryPreferences: "Sensory comfort",
  socialEnergy: "Social energy",
  routine: "Routine",
  interests: "Shared interests",
  location: "Distance",
  vices: "Lifestyle",
  dateEnvironment: "Date ideas",
  paceAndBoundaries: "Pace and boundaries",
};

function sharedValues(left: string[], right: string[]) {
  const normalizedRight = new Set(right.map((value) => value.trim().toLowerCase()));
  return left.filter((value, index) => normalizedRight.has(value.trim().toLowerCase()) && left.indexOf(value) === index);
}

function readable(value: string) {
  const normalized = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  return normalized ? normalized[0]!.toUpperCase() + normalized.slice(1) : value;
}

export function explainCompatibility(
  viewer: CompatibilityProfile,
  candidate: CompatibilityProfile,
  breakdown: CompatibilityBreakdown,
): CompatibilityExplanation {
  const highlights: string[] = [];
  const interests = sharedValues(viewer.interests, candidate.interests).slice(0, 3).map(readable);
  if (interests.length) highlights.push(`You both enjoy ${interests.join(interests.length > 1 ? ", " : "")}.`);

  const communication = sharedValues(viewer.communicationStyles, candidate.communicationStyles).slice(0, 2).map(readable);
  if (communication.length) highlights.push(`Your communication preferences overlap around ${communication.join(" and ").toLowerCase()}.`);

  const environments = sharedValues(viewer.dateEnvironments, candidate.dateEnvironments).slice(0, 2).map(readable);
  if (environments.length) highlights.push(`You may both feel comfortable with ${environments.join(" and ").toLowerCase()} dates.`);

  const sensory = sharedValues(viewer.sensoryPreferences, candidate.sensoryPreferences).slice(0, 2).map(readable);
  if (sensory.length) highlights.push(`You share comfort preferences such as ${sensory.join(" and ").toLowerCase()}.`);

  if (Math.abs(viewer.desiredPace - candidate.desiredPace) <= 15) highlights.push("Your preferred dating pace is similar.");
  if (highlights.length === 0) highlights.push("Your overall preferences have a balanced mix of similarities and differences.");

  const dimensions = (Object.keys(dimensionMaximums) as Array<keyof typeof dimensionMaximums>)
    .map((key) => ({ key, label: dimensionLabels[key], score: breakdown[key], maxScore: dimensionMaximums[key] }))
    .sort((left, right) => (right.score / right.maxScore) - (left.score / left.maxScore))
    .slice(0, 4);

  const summary = breakdown.total >= 80
    ? "Strong alignment across several preferences"
    : breakdown.total >= 65
      ? "Good alignment with room to discover more"
      : "Some promising points of connection";

  return { summary, highlights: highlights.slice(0, 3), dimensions };
}
