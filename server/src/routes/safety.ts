import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../db.js";
import { HttpError } from "../lib/httpError.js";
import { requireAuth } from "../middleware/auth.js";
import { requireModerator } from "../middleware/moderator.js";
import { processDueDateCheckIns } from "../services/safetyCheckIns.js";
import { decryptSensitiveValue, encryptSensitiveValue } from "../services/sensitiveData.js";

export const safetyRouter = Router();
safetyRouter.use(requireAuth);

const reportCategories = ["HARASSMENT", "SPAM", "FAKE_PROFILE", "INAPPROPRIATE_CONTENT", "HATE_OR_DISCRIMINATION", "UNSAFE_BEHAVIOR", "OTHER"] as const;

async function activeMatchesBetween(leftId: string, rightId: string) {
  return prisma.match.findMany({
    where: { status: "ACTIVE", OR: [{ userAId: leftId, userBId: rightId }, { userAId: rightId, userBId: leftId }] },
    select: { id: true },
  });
}

async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new HttpError(400, "You cannot block your own account");
  const target = await prisma.user.findFirst({ where: { id: blockedId, deletedAt: null }, select: { id: true } });
  if (!target) throw new HttpError(404, "Account not found");
  const matches = await activeMatchesBetween(blockerId, blockedId);
  const [block] = await prisma.$transaction([
    prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } }, create: { blockerId, blockedId }, update: {},
    }),
    prisma.match.updateMany({ where: { id: { in: matches.map((match) => match.id) } }, data: { status: "UNMATCHED", unmatchedAt: new Date() } }),
    prisma.typingIndicator.deleteMany({ where: { matchId: { in: matches.map((match) => match.id) } } }),
  ]);
  return { block, unmatchedCount: matches.length };
}

safetyRouter.get("/blocks", async (req, res) => {
  const blocks = await prisma.block.findMany({
    where: { blockerId: req.userId },
    include: { blocked: { select: { id: true, profile: { select: { displayName: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ blocks: blocks.map((block) => ({
    id: block.id, userId: block.blocked.id, displayName: block.blocked.profile?.displayName ?? "Spectrum member",
    photo: null, createdAt: block.createdAt,
  })) });
});

safetyRouter.post("/block", async (req, res) => {
  const { userId } = z.object({ userId: z.uuid() }).parse(req.body);
  res.status(201).json(await blockUser(req.userId!, userId));
});

safetyRouter.delete("/block/:userId", async (req, res) => {
  const { userId } = z.object({ userId: z.uuid() }).parse(req.params);
  await prisma.block.deleteMany({ where: { blockerId: req.userId, blockedId: userId } });
  res.status(204).send();
});

safetyRouter.post("/report", async (req, res) => {
  const input = z.object({
    userId: z.uuid(), matchId: z.uuid().nullable().optional(), category: z.enum(reportCategories),
    details: z.string().trim().max(3000).nullable().optional(), evidenceMessageIds: z.array(z.uuid()).max(20).default([]),
    block: z.boolean().default(true),
  }).parse(req.body);
  if (input.userId === req.userId) throw new HttpError(400, "You cannot report your own account");
  const reported = await prisma.user.findFirst({ where: { id: input.userId, deletedAt: null }, select: { id: true } });
  if (!reported) throw new HttpError(404, "Account not found");
  if (input.matchId) {
    const match = await prisma.match.findFirst({
      where: { id: input.matchId, OR: [{ userAId: req.userId, userBId: input.userId }, { userAId: input.userId, userBId: req.userId }] }, select: { id: true },
    });
    if (!match) throw new HttpError(400, "Reported match is invalid");
    const evidenceCount = await prisma.message.count({ where: { id: { in: input.evidenceMessageIds }, matchId: input.matchId } });
    if (evidenceCount !== input.evidenceMessageIds.length) throw new HttpError(400, "One or more evidence messages are invalid");
  } else if (input.evidenceMessageIds.length) {
    throw new HttpError(400, "Message evidence requires a match");
  }
  const report = await prisma.report.create({ data: {
    reporterId: req.userId!, reportedId: input.userId, matchId: input.matchId, category: input.category,
    details: input.details, evidenceMessageIds: input.evidenceMessageIds,
  } });
  const blockResult = input.block ? await blockUser(req.userId!, input.userId) : null;
  res.status(201).json({ report: { id: report.id, status: report.status, createdAt: report.createdAt }, blocked: Boolean(blockResult) });
});

function safetyPlanResponse(plan: { encryptedContactName: string | null; encryptedContactDetails: string | null; encryptedNotes: string | null; updatedAt: Date } | null) {
  if (!plan) return null;
  return {
    trustedContactName: decryptSensitiveValue(plan.encryptedContactName, env.SAFETY_DATA_ENCRYPTION_KEY),
    trustedContactDetails: decryptSensitiveValue(plan.encryptedContactDetails, env.SAFETY_DATA_ENCRYPTION_KEY),
    notes: decryptSensitiveValue(plan.encryptedNotes, env.SAFETY_DATA_ENCRYPTION_KEY), updatedAt: plan.updatedAt,
  };
}

safetyRouter.get("/plan", async (req, res) => {
  const plan = await prisma.safetyPlan.findUnique({ where: { userId: req.userId } });
  res.json({ plan: safetyPlanResponse(plan) });
});

safetyRouter.put("/plan", async (req, res) => {
  const input = z.object({
    trustedContactName: z.string().trim().max(120).nullable().optional(),
    trustedContactDetails: z.string().trim().max(300).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  }).parse(req.body);
  const encrypted = {
    ...(input.trustedContactName !== undefined ? { encryptedContactName: encryptSensitiveValue(input.trustedContactName, env.SAFETY_DATA_ENCRYPTION_KEY) } : {}),
    ...(input.trustedContactDetails !== undefined ? { encryptedContactDetails: encryptSensitiveValue(input.trustedContactDetails, env.SAFETY_DATA_ENCRYPTION_KEY) } : {}),
    ...(input.notes !== undefined ? { encryptedNotes: encryptSensitiveValue(input.notes, env.SAFETY_DATA_ENCRYPTION_KEY) } : {}),
  };
  const plan = await prisma.safetyPlan.upsert({ where: { userId: req.userId }, create: { userId: req.userId!, ...encrypted }, update: encrypted });
  res.json({ plan: safetyPlanResponse(plan) });
});

function checkInResponse(checkIn: { id: string; matchId: string | null; label: string; scheduledFor: Date; status: string; encryptedVenue: string | null; encryptedNote: string | null; trustedContactRequested: boolean; checkedInAt: Date | null; canceledAt: Date | null; missedAt: Date | null; createdAt: Date }) {
  return {
    id: checkIn.id, matchId: checkIn.matchId, label: checkIn.label, scheduledFor: checkIn.scheduledFor, status: checkIn.status,
    venue: decryptSensitiveValue(checkIn.encryptedVenue, env.SAFETY_DATA_ENCRYPTION_KEY),
    note: decryptSensitiveValue(checkIn.encryptedNote, env.SAFETY_DATA_ENCRYPTION_KEY),
    trustedContactRequested: checkIn.trustedContactRequested, checkedInAt: checkIn.checkedInAt,
    canceledAt: checkIn.canceledAt, missedAt: checkIn.missedAt, createdAt: checkIn.createdAt,
  };
}

safetyRouter.get("/check-ins", async (req, res) => {
  await processDueDateCheckIns();
  const checkIns = await prisma.dateCheckIn.findMany({ where: { userId: req.userId }, orderBy: { scheduledFor: "desc" }, take: 50 });
  res.json({ checkIns: checkIns.map(checkInResponse) });
});

safetyRouter.post("/check-ins", async (req, res) => {
  const input = z.object({
    matchId: z.uuid().nullable().optional(), label: z.string().trim().min(1).max(120),
    scheduledFor: z.coerce.date().refine((date) => date > new Date(), "Check-in time must be in the future")
      .refine((date) => date.getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000, "Check-ins can be scheduled up to 30 days ahead"),
    venue: z.string().trim().max(500).nullable().optional(), note: z.string().trim().max(1000).nullable().optional(),
    trustedContactRequested: z.boolean().default(false),
  }).parse(req.body);
  if (input.matchId) {
    const match = await prisma.match.findFirst({ where: { id: input.matchId, status: "ACTIVE", OR: [{ userAId: req.userId }, { userBId: req.userId }] } });
    if (!match) throw new HttpError(400, "Active match not found");
  }
  if (input.trustedContactRequested) {
    const plan = await prisma.safetyPlan.findUnique({ where: { userId: req.userId } });
    if (!plan?.encryptedContactDetails) throw new HttpError(409, "Add trusted contact details to your safety plan first");
  }
  const checkIn = await prisma.dateCheckIn.create({ data: {
    userId: req.userId!, matchId: input.matchId, label: input.label, scheduledFor: input.scheduledFor,
    encryptedVenue: encryptSensitiveValue(input.venue, env.SAFETY_DATA_ENCRYPTION_KEY),
    encryptedNote: encryptSensitiveValue(input.note, env.SAFETY_DATA_ENCRYPTION_KEY),
    trustedContactRequested: input.trustedContactRequested,
  } });
  res.status(201).json({ checkIn: checkInResponse(checkIn) });
});

safetyRouter.post("/check-ins/:checkInId/check-in", async (req, res) => {
  const { checkInId } = z.object({ checkInId: z.uuid() }).parse(req.params);
  const existing = await prisma.dateCheckIn.findFirst({ where: { id: checkInId, userId: req.userId } });
  if (!existing) throw new HttpError(404, "Check-in not found");
  if (!["SCHEDULED", "MISSED"].includes(existing.status)) throw new HttpError(409, "This check-in is already closed");
  const checkIn = await prisma.dateCheckIn.update({ where: { id: existing.id }, data: { status: "CHECKED_IN", checkedInAt: new Date() } });
  res.json({ checkIn: checkInResponse(checkIn) });
});

safetyRouter.post("/check-ins/:checkInId/cancel", async (req, res) => {
  const { checkInId } = z.object({ checkInId: z.uuid() }).parse(req.params);
  const existing = await prisma.dateCheckIn.findFirst({ where: { id: checkInId, userId: req.userId, status: "SCHEDULED" } });
  if (!existing) throw new HttpError(404, "Scheduled check-in not found");
  const checkIn = await prisma.dateCheckIn.update({ where: { id: existing.id }, data: { status: "CANCELED", canceledAt: new Date() } });
  res.json({ checkIn: checkInResponse(checkIn) });
});

safetyRouter.get("/moderation/reports", requireModerator, async (req, res) => {
  const { status } = z.object({ status: z.enum(["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"]).optional() }).parse(req.query);
  const reports = await prisma.report.findMany({
    where: status ? { status } : { status: { in: ["OPEN", "REVIEWING"] } },
    include: {
      reporter: { select: { id: true, profile: { select: { displayName: true } } } },
      reported: { select: { id: true, status: true, profile: { select: { displayName: true } } } },
    }, orderBy: { createdAt: "asc" }, take: 100,
  });
  res.json({ reports: reports.map((report) => ({
    id: report.id, category: report.category, details: report.details, status: report.status,
    matchId: report.matchId, evidenceMessageIds: report.evidenceMessageIds, createdAt: report.createdAt,
    reporter: { userId: report.reporter.id, displayName: report.reporter.profile?.displayName ?? "Spectrum member" },
    reported: { userId: report.reported.id, displayName: report.reported.profile?.displayName ?? "Spectrum member", accountStatus: report.reported.status },
  })) });
});

safetyRouter.get("/moderation/reports/:reportId", requireModerator, async (req, res) => {
  const { reportId } = z.object({ reportId: z.uuid() }).parse(req.params);
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new HttpError(404, "Report not found");
  const evidence = report.matchId && report.evidenceMessageIds.length ? await prisma.message.findMany({
    where: { id: { in: report.evidenceMessageIds }, matchId: report.matchId },
    select: { id: true, senderId: true, body: true, createdAt: true, deletedAt: true }, orderBy: { createdAt: "asc" },
  }) : [];
  res.json({ report, evidence });
});

safetyRouter.patch("/moderation/reports/:reportId", requireModerator, async (req, res) => {
  const { reportId } = z.object({ reportId: z.uuid() }).parse(req.params);
  const input = z.object({ status: z.enum(["REVIEWING", "RESOLVED", "DISMISSED"]), resolutionNote: z.string().trim().max(3000).nullable().optional() }).parse(req.body);
  const report = await prisma.report.update({
    where: { id: reportId },
    data: { status: input.status, resolutionNote: input.resolutionNote, resolvedAt: ["RESOLVED", "DISMISSED"].includes(input.status) ? new Date() : null },
  }).catch(() => { throw new HttpError(404, "Report not found"); });
  res.json({ report });
});

safetyRouter.post("/moderation/notes", requireModerator, async (req, res) => {
  const input = z.object({ userId: z.uuid(), note: z.string().trim().min(1).max(5000) }).parse(req.body);
  const target = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } });
  if (!target) throw new HttpError(404, "Account not found");
  const note = await prisma.adminModerationNote.create({ data: { moderatedUserId: input.userId, adminUserId: req.userId!, note: input.note } });
  res.status(201).json({ note });
});
