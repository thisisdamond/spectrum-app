import { describe, expect, it } from "vitest";
import { notificationPreferenceAllows } from "./notificationPolicy.js";

const settings = { newMatches: true, newMessages: false, newLikes: true };

describe("notification preferences", () => {
  it("honors each user-controlled category", () => {
    expect(notificationPreferenceAllows("NEW_MATCH", settings)).toBe(true);
    expect(notificationPreferenceAllows("NEW_MESSAGE", settings)).toBe(false);
    expect(notificationPreferenceAllows("NEW_LIKE", settings)).toBe(true);
  });

  it("never suppresses a scheduled safety check-in reminder", () => {
    expect(notificationPreferenceAllows("SAFETY_CHECK_IN", settings)).toBe(true);
  });
});
