import { env } from "../config/env.js";
import { prisma } from "../db.js";
import { decryptSensitiveValue } from "./sensitiveData.js";
import { queuePushNotification } from "./notifications.js";

const GRACE_PERIOD_MS = 15 * 60 * 1000;

async function alertTrustedContact(checkInId: string) {
  if (!env.SAFETY_WEBHOOK_URL) return;
  const checkIn = await prisma.dateCheckIn.findUnique({
    where: { id: checkInId }, include: { user: { include: { safetyPlan: true, profile: true } } },
  });
  const plan = checkIn?.user.safetyPlan;
  if (!checkIn?.trustedContactRequested || !plan?.encryptedContactDetails) return;
  const payload = {
    event: "date-check-in-missed",
    checkInId: checkIn.id,
    scheduledFor: checkIn.scheduledFor.toISOString(),
    label: checkIn.label,
    personName: checkIn.user.profile?.displayName ?? null,
    trustedContactName: decryptSensitiveValue(plan.encryptedContactName, env.SAFETY_DATA_ENCRYPTION_KEY),
    trustedContactDetails: decryptSensitiveValue(plan.encryptedContactDetails, env.SAFETY_DATA_ENCRYPTION_KEY),
    venue: decryptSensitiveValue(checkIn.encryptedVenue, env.SAFETY_DATA_ENCRYPTION_KEY),
    note: decryptSensitiveValue(checkIn.encryptedNote, env.SAFETY_DATA_ENCRYPTION_KEY),
  };
  await fetch(env.SAFETY_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(env.SAFETY_WEBHOOK_SECRET ? { authorization: `Bearer ${env.SAFETY_WEBHOOK_SECRET}` } : {}),
    },
    body: JSON.stringify(payload),
  }).then((response) => {
    if (!response.ok) throw new Error(`Safety webhook returned ${response.status}`);
  });
}

export async function processDueDateCheckIns(now = new Date()) {
  const due = await prisma.dateCheckIn.findMany({
    where: { status: "SCHEDULED", scheduledFor: { lte: now } }, orderBy: { scheduledFor: "asc" }, take: 100,
  });
  for (const checkIn of due) {
    const missed = checkIn.scheduledFor.getTime() + GRACE_PERIOD_MS <= now.getTime();
    if (missed) {
      const claimed = await prisma.dateCheckIn.updateMany({ where: { id: checkIn.id, status: "SCHEDULED" }, data: { status: "MISSED", missedAt: now } });
      if (!claimed.count) continue;
      await queuePushNotification({
        userId: checkIn.userId, kind: "SAFETY_CHECK_IN", title: "We missed your check-in",
        defaultBody: "Open Spectrum to confirm you’re okay or use your safety plan.",
        data: { type: "safety-check-in", checkInId: checkIn.id },
      });
      if (checkIn.trustedContactRequested) await alertTrustedContact(checkIn.id).catch(() => undefined);
      continue;
    }
    if (!checkIn.notificationSentAt) {
      const claimed = await prisma.dateCheckIn.updateMany({ where: { id: checkIn.id, status: "SCHEDULED", notificationSentAt: null }, data: { notificationSentAt: now } });
      if (claimed.count) await queuePushNotification({
        userId: checkIn.userId, kind: "SAFETY_CHECK_IN", title: "Time to check in",
        defaultBody: `Are you okay after ${checkIn.label}?`, data: { type: "safety-check-in", checkInId: checkIn.id },
      });
    }
  }
  return due.length;
}
