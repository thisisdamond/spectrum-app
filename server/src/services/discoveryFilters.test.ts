import { describe, expect, it } from "vitest";
import { ageOnDate, calculateDistanceKm, evaluateDiscoveryEligibility, genderPreferenceIncludes, utcUsageWindow, viceCompatibility } from "./discoveryFilters.js";

const viewerProfile = {
  birthDate: new Date("1996-09-02T00:00:00.000Z"),
  gender: "Woman",
  datingGoal: "LONG_TERM",
  approximateLatitude: 40.7128,
  approximateLongitude: -74.006,
};
const candidateProfile = {
  birthDate: new Date("1994-04-15T00:00:00.000Z"),
  gender: "Nonbinary",
  datingGoal: "LIFE_PARTNER",
  approximateLatitude: 40.7306,
  approximateLongitude: -73.9352,
};
const viewerPreferences = {
  minAge: 25, maxAge: 40, maxDistanceKm: 30,
  interestedInGenders: ["Nonbinary people"], datingGoals: ["LIFE_PARTNER"],
};
const candidatePreferences = {
  minAge: 25, maxAge: 40, maxDistanceKm: 30,
  interestedInGenders: ["Women"], datingGoals: ["LONG_TERM"],
};

describe("discovery filters", () => {
  it("calculates age without counting a birthday early", () => {
    expect(ageOnDate(viewerProfile.birthDate, new Date("2026-09-01T12:00:00.000Z"))).toBe(29);
    expect(ageOnDate(viewerProfile.birthDate, new Date("2026-09-02T12:00:00.000Z"))).toBe(30);
  });

  it("normalizes common gender labels", () => {
    expect(genderPreferenceIncludes(["Nonbinary people"], "non-binary")).toBe(true);
    expect(genderPreferenceIncludes(["Women"], "Woman")).toBe(true);
    expect(genderPreferenceIncludes(["Men"], "Woman")).toBe(false);
  });

  it("requires reciprocal age, gender, goal, and known-distance fit", () => {
    const result = evaluateDiscoveryEligibility(viewerProfile, viewerPreferences, candidateProfile, candidatePreferences, new Date("2026-09-01T12:00:00.000Z"));
    expect(result.eligible).toBe(true);
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.distanceKm).toBeLessThan(30);
  });

  it("reports every failed reciprocal filter without exposing it to clients", () => {
    const result = evaluateDiscoveryEligibility(
      viewerProfile,
      { ...viewerPreferences, interestedInGenders: ["Men"], datingGoals: ["SHORT_TERM"] },
      candidateProfile,
      { ...candidatePreferences, maxAge: 28 },
      new Date("2026-09-01T12:00:00.000Z"),
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining(["candidate-age-range", "viewer-gender-preference", "viewer-dating-goal"]));
  });

  it("does not invent a distance when coordinates are unavailable", () => {
    expect(calculateDistanceKm(null, null, 40, -74)).toBeNull();
  });

  it("scores lifestyle preferences by closeness rather than exact equality", () => {
    expect(viceCompatibility(
      { drinking: "AVOID", smoking: "LOW", cannabis: "MODERATE" },
      { drinking: "LOW", smoking: "LOW", cannabis: "HIGH" },
    )).toBeCloseTo(5 / 6);
  });

  it("uses a UTC day key and next-midnight reset", () => {
    expect(utcUsageWindow(new Date("2026-09-01T23:59:59.000Z"))).toEqual({
      dateKey: "2026-09-01", resetAt: new Date("2026-09-02T00:00:00.000Z"),
    });
  });
});
