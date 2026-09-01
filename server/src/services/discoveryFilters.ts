export type DiscoveryProfile = {
  birthDate: Date;
  gender: string;
  datingGoal: string;
  approximateLatitude: unknown | null;
  approximateLongitude: unknown | null;
};

export type DiscoveryPreferences = {
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  interestedInGenders: string[];
  datingGoals: string[];
};

export type DiscoveryEligibility = {
  eligible: boolean;
  distanceKm: number | null;
  reasons: string[];
};

export function ageOnDate(birthDate: Date, now = new Date()) {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayHasPassed = now.getUTCMonth() > birthDate.getUTCMonth()
    || (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() >= birthDate.getUTCDate());
  if (!birthdayHasPassed) age -= 1;
  return age;
}

function normalizedGender(value: string) {
  const compact = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (["woman", "women", "female", "she", "sheher"].includes(compact)) return "woman";
  if (["man", "men", "male", "he", "hehim"].includes(compact)) return "man";
  if (["nonbinary", "nonbinarypeople", "nb", "enby", "they", "theythem"].includes(compact)) return "nonbinary";
  if (["genderexpansive", "genderexpansivepeople", "genderqueer", "genderfluid"].includes(compact)) return "genderexpansive";
  return compact;
}

export function genderPreferenceIncludes(preferences: string[], gender: string) {
  const candidateGender = normalizedGender(gender);
  return preferences.some((value) => {
    const preference = normalizedGender(value);
    return preference === "everyone" || preference === "all" || preference === "anygender" || preference === candidateGender;
  });
}

export function calculateDistanceKm(aLat: unknown, aLon: unknown, bLat: unknown, bLon: unknown) {
  if ([aLat, aLon, bLat, bLon].some((value) => value === null || value === undefined || value === "")) return null;
  const values = [aLat, aLon, bLat, bLon].map(Number);
  if (values.some((value) => !Number.isFinite(value))) return null;
  const [latitudeA, longitudeA, latitudeB, longitudeB] = values as [number, number, number, number];
  const radians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = radians(latitudeB - latitudeA);
  const deltaLon = radians(longitudeB - longitudeA);
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function evaluateDiscoveryEligibility(
  viewerProfile: DiscoveryProfile,
  viewerPreferences: DiscoveryPreferences,
  candidateProfile: DiscoveryProfile,
  candidatePreferences: DiscoveryPreferences,
  now = new Date(),
): DiscoveryEligibility {
  const reasons: string[] = [];
  const viewerAge = ageOnDate(viewerProfile.birthDate, now);
  const candidateAge = ageOnDate(candidateProfile.birthDate, now);

  if (candidateAge < viewerPreferences.minAge || candidateAge > viewerPreferences.maxAge) reasons.push("viewer-age-range");
  if (viewerAge < candidatePreferences.minAge || viewerAge > candidatePreferences.maxAge) reasons.push("candidate-age-range");
  if (!genderPreferenceIncludes(viewerPreferences.interestedInGenders, candidateProfile.gender)) reasons.push("viewer-gender-preference");
  if (!genderPreferenceIncludes(candidatePreferences.interestedInGenders, viewerProfile.gender)) reasons.push("candidate-gender-preference");
  if (!viewerPreferences.datingGoals.includes(candidateProfile.datingGoal)) reasons.push("viewer-dating-goal");
  if (!candidatePreferences.datingGoals.includes(viewerProfile.datingGoal)) reasons.push("candidate-dating-goal");

  const distanceKm = calculateDistanceKm(
    viewerProfile.approximateLatitude,
    viewerProfile.approximateLongitude,
    candidateProfile.approximateLatitude,
    candidateProfile.approximateLongitude,
  );
  if (distanceKm !== null && distanceKm > viewerPreferences.maxDistanceKm) reasons.push("viewer-distance");
  if (distanceKm !== null && distanceKm > candidatePreferences.maxDistanceKm) reasons.push("candidate-distance");

  return { eligible: reasons.length === 0, distanceKm, reasons };
}

export function viceCompatibility(
  viewer: { drinking: string; smoking: string; cannabis: string },
  candidate: { drinking: string; smoking: string; cannabis: string },
) {
  const levels = new Map([["AVOID", 0], ["LOW", 0.25], ["MODERATE", 0.5], ["HIGH", 0.75], ["LOVE", 1]]);
  return (["drinking", "smoking", "cannabis"] as const)
    .map((key) => 1 - Math.abs((levels.get(viewer[key]) ?? 0.5) - (levels.get(candidate[key]) ?? 0.5)))
    .reduce((total, value) => total + value, 0) / 3;
}

export function utcUsageWindow(now = new Date()) {
  const dateKey = now.toISOString().slice(0, 10);
  const resetAt = new Date(`${dateKey}T00:00:00.000Z`);
  resetAt.setUTCDate(resetAt.getUTCDate() + 1);
  return { dateKey, resetAt };
}
