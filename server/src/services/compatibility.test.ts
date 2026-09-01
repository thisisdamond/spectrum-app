import { describe, expect, it } from "vitest";
import { scoreCompatibility, type CompatibilityProfile } from "./compatibility.js";

const base: CompatibilityProfile = {
  datingGoals: ["LONG_TERM"],
  communicationStyles: ["direct", "written-plans"],
  sensoryPreferences: ["quiet", "low-light"],
  socialEnergy: 35,
  routinePreference: 80,
  interests: ["museums", "gaming", "hiking"],
  distanceKm: 0,
  vicesCompatibility: 1,
  dateEnvironments: ["quiet-cafe", "museum"],
  desiredPace: 40,
  boundaries: ["ask-before-touch", "clear-plans"],
};

describe("scoreCompatibility", () => {
  it("returns 100 for identical nearby profiles", () => {
    expect(scoreCompatibility(base, base).total).toBe(100);
  });

  it("keeps the score in the 0–100 range", () => {
    const result = scoreCompatibility(base, {
      ...base,
      datingGoals: ["SHORT_TERM"],
      communicationStyles: ["spontaneous"],
      sensoryPreferences: ["crowds"],
      interests: ["clubs"],
      distanceKm: 500,
      vicesCompatibility: -2,
    });
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });
});
