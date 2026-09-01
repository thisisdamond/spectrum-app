import { describe, expect, it } from "vitest";
import { getProfileSetupStatus } from "./profileSetup.js";

describe("profile setup status", () => {
  it("reports each guided section without treating diagnosis as a requirement", () => {
    const status = getProfileSetupStatus({
      profile: { communicationStyle: ["Direct"], sensoryPreferences: ["Quiet spaces"], communicationCard: { pace: "slow" } },
      preferences: {},
      photoCount: 1,
      promptCount: 1,
    });
    expect(status.complete).toBe(true);
    expect(status.completed).toBe(6);
    expect(status.steps.map((step) => step.key)).toEqual(["basics", "preferences", "communication", "sensory", "photos", "prompts"]);
  });

  it("keeps a partially completed profile resumable", () => {
    const status = getProfileSetupStatus({ profile: null, preferences: null, photoCount: 0, promptCount: 0 });
    expect(status.complete).toBe(false);
    expect(status.completed).toBe(0);
  });
});
