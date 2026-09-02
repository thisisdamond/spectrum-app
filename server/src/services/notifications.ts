import type { Prisma, PushNotificationKind } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../db.js";
import { notificationPreferenceAllows } from "./notificationPolicy.js";

type QueueInput = {
  userId: string;
  kind: PushNotificationKind;
  title: string;
  defaultBody: string;
  previewBody?: string;
  data?: Prisma.InputJsonValue;
};

export async function queuePushNotification(input: QueueInput) {
  const [settings, accessibility, tokens] = await Promise.all([
    prisma.notificationSettings.findUnique({ where: { userId: input.userId } }),
    prisma.accessibilitySettings.findUnique({ where: { userId: input.userId } }),
    prisma.notificationToken.findMany({ where: { userId: input.userId }, select: { token: true, platform: true } }),
  ]);
  const paused = Boolean(settings?.pausedUntil && settings.pausedUntil > new Date());
  const enabled = notificationPreferenceAllows(input.kind, settings);
  const quiet = accessibility?.quietNotifications ?? true;
  const body = input.kind === "NEW_MESSAGE" && settings?.messagePreviews && input.previewBody ? input.previewBody : input.defaultBody;
  const skippedReason = paused ? "Notifications are paused" : !enabled ? "Notification category is disabled" : !tokens.length ? "No registered device" : null;
  const notification = await prisma.pushNotification.create({
    data: {
      userId: input.userId, kind: input.kind, title: input.title, body, quiet,
      ...(input.data ? { data: input.data } : {}),
      ...(skippedReason ? { status: "SKIPPED", lastError: skippedReason } : {}),
    },
  });
  if (!skippedReason) void deliverPushNotification(notification.id, tokens).catch(() => undefined);
  return notification;
}

async function deliverPushNotification(notificationId: string, tokens: { token: string; platform: string }[]) {
  const notification = await prisma.pushNotification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.status !== "PENDING") return;
  try {
    const response = await fetch(env.EXPO_PUSH_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(tokens.map(({ token: to, platform }) => ({
        to, title: notification.title, body: notification.body,
        sound: notification.quiet ? null : "default",
        ...(platform === "android" ? { channelId: notification.quiet ? "spectrum-quiet" : "spectrum-default" } : {}),
        priority: "normal", data: notification.data ?? {},
      }))),
    });
    if (!response.ok) throw new Error(`Push provider returned ${response.status}`);
    await prisma.pushNotification.update({ where: { id: notification.id }, data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, lastError: null } });
  } catch (error) {
    await prisma.pushNotification.update({ where: { id: notification.id }, data: { status: "FAILED", attempts: { increment: 1 }, lastError: error instanceof Error ? error.message.slice(0, 1000) : "Push delivery failed" } });
  }
}
