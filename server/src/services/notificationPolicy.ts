import type { PushNotificationKind } from "@prisma/client";

export function notificationPreferenceAllows(kind: PushNotificationKind, settings: { newMatches: boolean; newMessages: boolean; newLikes: boolean } | null) {
  if (kind === "SAFETY_CHECK_IN") return true;
  if (!settings) return true;
  if (kind === "NEW_MATCH") return settings.newMatches;
  if (kind === "NEW_MESSAGE") return settings.newMessages;
  return settings.newLikes;
}
