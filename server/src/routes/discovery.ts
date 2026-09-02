import { Router } from "express";
import type { Preference, Profile } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError } from "../lib/httpError.js";
import { requireAuth } from "../middleware/auth.js";
import { explainCompatibility, scoreCompatibility, type CompatibilityProfile } from "../services/compatibility.js";
import { evaluateDiscoveryEligibility, utcUsageWindow, viceCompatibility } from "../services/discoveryFilters.js";
import { publicPhoto, publicProfile } from "../services/publicProfile.js";
import { queuePushNotification } from "../services/notifications.js";

export const discoveryRouter = Router();
discoveryRouter.use(requireAuth);

const FREE_DAILY_LIKE_LIMIT = 8;
const datingGoals = ["LONG_TERM", "SHORT_TERM", "FRIENDSHIP_FIRST", "LIFE_PARTNER", "EXPLORING"] as const;
const listFromQuery = z.preprocess(
  (value) => typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : value,
  z.array(z.string().trim().min(1).max(80)).max(20).optional(),
);
const discoveryQuery = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
  cursor: z.string().max(300).optional(),
  minCompatibility: z.coerce.number().min(0).max(100).optional(),
  datingGoals: z.preprocess(
    (value) => typeof value === "string" ? value.split(",").map((item) => item.trim()).filter(Boolean) : value,
    z.array(z.enum(datingGoals)).max(datingGoals.length).optional(),
  ),
  communicationStyles: listFromQuery,
  dateEnvironments: listFromQuery,
});

const discoveryUserInclude = {
  profile: true,
  preferences: true,
  subscription: true,
  accessibility: true,
  photos: { orderBy: { position: "asc" as const }, take: 4 },
  prompts: { orderBy: { position: "asc" as const }, take: 3 },
  videoPrompts: { orderBy: { createdAt: "asc" as const }, take: 3 },
};

function isPremium(subscription: { tier: string; status: string } | null) {
  return subscription?.tier === "PREMIUM" && ["ACTIVE", "TRIALING"].includes(subscription.status);
}

function requireCompleteUser<T extends { profile: Profile | null; preferences: Preference | null }>(user: T | null): asserts user is T & { profile: Profile; preferences: Preference } {
  if (!user?.profile || !user.preferences) throw new HttpError(409, "Complete your profile and preferences first");
}

function ensureDiscoveryAvailable(user: { status: string; profile: Profile; accessibility: { breakModeUntil: Date | null } | null }) {
  if (user.status !== "ACTIVE") throw new HttpError(403, "Your account is not available for discovery");
  if (user.profile.discoveryPaused) throw new HttpError(409, "Resume discovery in your profile before browsing");
  if (user.accessibility?.breakModeUntil && user.accessibility.breakModeUntil > new Date()) {
    throw new HttpError(423, `Your discovery break lasts until ${user.accessibility.breakModeUntil.toISOString()}`);
  }
}

function compatibilityInput(profile: Profile, distanceKm: number, vicesCompatibility: number): CompatibilityProfile {
  return {
    datingGoals: [profile.datingGoal], communicationStyles: profile.communicationStyle,
    sensoryPreferences: profile.sensoryPreferences, socialEnergy: profile.socialEnergy,
    routinePreference: profile.routinePreference, interests: profile.interests, distanceKm,
    vicesCompatibility, dateEnvironments: profile.preferredDateEnvironments,
    desiredPace: profile.preferredDatingPace, boundaries: profile.boundaries,
  };
}

function scoredPair(viewerProfile: Profile, viewerPreferences: Preference, candidateProfile: Profile, candidatePreferences: Preference, distanceKm: number | null) {
  const scoreDistance = distanceKm ?? viewerPreferences.maxDistanceKm / 2;
  const vices = viceCompatibility(viewerPreferences, candidatePreferences);
  const viewerInput = compatibilityInput(viewerProfile, 0, vices);
  const candidateInput = compatibilityInput(candidateProfile, scoreDistance, vices);
  const compatibility = scoreCompatibility(viewerInput, candidateInput, viewerPreferences.maxDistanceKm);
  return { compatibility, explanation: explainCompatibility(viewerInput, candidateInput, compatibility) };
}

function includesAny(values: string[], requested?: string[]) {
  if (!requested?.length) return true;
  const normalized = new Set(values.map((value) => value.toLowerCase()));
  return requested.some((value) => normalized.has(value.toLowerCase()));
}

const cursorInput = z.object({ score: z.number(), userId: z.uuid() });
function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  try { return cursorInput.parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))); }
  catch { throw new HttpError(400, "Discovery cursor is invalid"); }
}
function encodeCursor(score: number, userId: string) {
  return Buffer.from(JSON.stringify({ score, userId }), "utf8").toString("base64url");
}

async function runSerializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code);
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new HttpError(409, "The like changed at the same time. Please try again");
}

async function hiddenUserIds(viewerId: string) {
  const [blocks, rejects, likes, matches] = await Promise.all([
    prisma.block.findMany({ where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] }, select: { blockerId: true, blockedId: true } }),
    prisma.reject.findMany({ where: { OR: [{ senderId: viewerId }, { receiverId: viewerId }] }, select: { senderId: true, receiverId: true } }),
    prisma.like.findMany({ where: { senderId: viewerId }, select: { receiverId: true } }),
    prisma.match.findMany({ where: { OR: [{ userAId: viewerId }, { userBId: viewerId }] }, select: { userAId: true, userBId: true } }),
  ]);
  return new Set([
    viewerId,
    ...blocks.flatMap((item) => [item.blockerId, item.blockedId]),
    ...rejects.flatMap((item) => [item.senderId, item.receiverId]),
    ...likes.map((item) => item.receiverId),
    ...matches.flatMap((item) => [item.userAId, item.userBId]),
  ]);
}

async function discoveryStatus(userId: string, premium: boolean) {
  const { dateKey, resetAt } = utcUsageWindow();
  const [usage, actualLikes, latestReject] = await Promise.all([
    prisma.discoveryUsage.findUnique({ where: { userId_dateKey: { userId, dateKey } } }),
    prisma.like.count({ where: { senderId: userId, createdAt: { gte: new Date(`${dateKey}T00:00:00.000Z`) } } }),
    prisma.reject.findFirst({ where: { senderId: userId }, select: { id: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const likesUsed = Math.max(usage?.likesUsed ?? 0, actualLikes);
  return {
    tier: premium ? "PREMIUM" : "FREE", likesUsed,
    dailyLikeLimit: premium ? null : FREE_DAILY_LIKE_LIMIT,
    likesRemaining: premium ? null : Math.max(0, FREE_DAILY_LIKE_LIMIT - likesUsed),
    resetAt: resetAt.toISOString(), backtrackAvailable: premium && Boolean(latestReject),
  };
}

discoveryRouter.get("/status", async (req, res) => {
  const subscription = await prisma.subscription.findUnique({ where: { userId: req.userId } });
  res.json({ status: await discoveryStatus(req.userId!, isPremium(subscription)) });
});

discoveryRouter.get("/", async (req, res) => {
  const input = discoveryQuery.parse(req.query);
  const cursor = decodeCursor(input.cursor);
  const viewer = await prisma.user.findUnique({ where: { id: req.userId }, include: discoveryUserInclude });
  requireCompleteUser(viewer);
  ensureDiscoveryAvailable(viewer);

  const advancedFiltersUsed = input.minCompatibility !== undefined || Boolean(input.datingGoals?.length)
    || Boolean(input.communicationStyles?.length) || Boolean(input.dateEnvironments?.length);
  const premium = isPremium(viewer.subscription);
  if (advancedFiltersUsed && !premium) throw new HttpError(403, "Advanced discovery filters are a Premium feature");

  const [hidden, candidates] = await Promise.all([
    hiddenUserIds(viewer.id),
    prisma.user.findMany({
      where: { id: { not: viewer.id }, status: "ACTIVE", deletedAt: null, profile: { is: { discoveryPaused: false } } },
      include: discoveryUserInclude, orderBy: { id: "asc" }, take: 250,
    }),
  ]);

  const results = [];
  for (const candidate of candidates) {
    if (hidden.has(candidate.id) || !candidate.profile || !candidate.preferences || !candidate.photos.length || !candidate.prompts.length) continue;
    const eligibility = evaluateDiscoveryEligibility(viewer.profile, viewer.preferences, candidate.profile, candidate.preferences);
    if (!eligibility.eligible) continue;
    if (input.datingGoals?.length && !input.datingGoals.includes(candidate.profile.datingGoal)) continue;
    if (!includesAny(candidate.profile.communicationStyle, input.communicationStyles)) continue;
    if (!includesAny(candidate.profile.preferredDateEnvironments, input.dateEnvironments)) continue;
    const scored = scoredPair(viewer.profile, viewer.preferences, candidate.profile, candidate.preferences, eligibility.distanceKm);
    if (input.minCompatibility !== undefined && scored.compatibility.total < input.minCompatibility) continue;
    results.push({
      userId: candidate.id, profile: publicProfile(candidate.profile),
      photos: await Promise.all(candidate.photos.map(publicPhoto)),
      prompts: candidate.prompts.map(({ id, promptKey, answer, position }) => ({ id, promptKey, answer, position })),
      distanceKm: eligibility.distanceKm === null ? null : Math.round(eligibility.distanceKm), ...scored,
    });
  }

  results.sort((left, right) => right.compatibility.total - left.compatibility.total || left.userId.localeCompare(right.userId));
  const afterCursor = cursor
    ? results.filter((item) => item.compatibility.total < cursor.score || (item.compatibility.total === cursor.score && item.userId > cursor.userId))
    : results;
  const page = afterCursor.slice(0, input.limit);
  const last = page.at(-1);
  const nextCursor = afterCursor.length > page.length && last ? encodeCursor(last.compatibility.total, last.userId) : null;
  res.json({ candidates: page, nextCursor, status: await discoveryStatus(viewer.id, premium) });
});

discoveryRouter.get("/likes", async (req, res) => {
  const viewer = await prisma.user.findUnique({ where: { id: req.userId }, include: discoveryUserInclude });
  requireCompleteUser(viewer);
  ensureDiscoveryAvailable(viewer);
  const [hidden, incoming] = await Promise.all([
    hiddenUserIds(viewer.id),
    prisma.like.findMany({
      where: { receiverId: viewer.id, sender: { likesReceived: { none: { senderId: viewer.id } } } },
      include: { sender: { include: discoveryUserInclude } }, orderBy: { createdAt: "desc" }, take: 50,
    }),
  ]);
  const likes = [];
  for (const like of incoming) {
    const candidate = like.sender;
    if (hidden.has(candidate.id) || candidate.status !== "ACTIVE" || candidate.deletedAt || !candidate.profile || candidate.profile.discoveryPaused || !candidate.preferences || !candidate.photos.length || !candidate.prompts.length) continue;
    const eligibility = evaluateDiscoveryEligibility(viewer.profile, viewer.preferences, candidate.profile, candidate.preferences);
    if (!eligibility.eligible) continue;
    const scored = scoredPair(viewer.profile, viewer.preferences, candidate.profile, candidate.preferences, eligibility.distanceKm);
    likes.push({
      id: like.id, receivedAt: like.createdAt, targetType: like.targetType, targetId: like.targetId, comment: like.comment,
      candidate: {
        userId: candidate.id, profile: publicProfile(candidate.profile),
        photos: await Promise.all(candidate.photos.map(publicPhoto)),
        prompts: candidate.prompts.map(({ id, promptKey, answer, position }) => ({ id, promptKey, answer, position })),
        distanceKm: eligibility.distanceKm === null ? null : Math.round(eligibility.distanceKm), ...scored,
      },
    });
  }
  res.json({ likes, status: await discoveryStatus(viewer.id, isPremium(viewer.subscription)) });
});

const likeInput = z.object({
  userId: z.uuid(), targetType: z.enum(["PROFILE", "PHOTO", "PROMPT", "VIDEO_PROMPT"]).default("PROFILE"),
  targetId: z.uuid().nullable().optional(), comment: z.string().trim().max(500).nullable().optional(),
});

discoveryRouter.post("/like", async (req, res) => {
  const input = likeInput.parse(req.body);
  if (input.userId === req.userId) throw new HttpError(400, "You cannot like your own profile");
  const [viewer, candidate, blocked, rejected] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.userId }, include: discoveryUserInclude }),
    prisma.user.findFirst({ where: { id: input.userId, status: "ACTIVE", deletedAt: null }, include: discoveryUserInclude }),
    prisma.block.findFirst({ where: { OR: [{ blockerId: req.userId, blockedId: input.userId }, { blockerId: input.userId, blockedId: req.userId }] } }),
    prisma.reject.findFirst({ where: { OR: [{ senderId: req.userId, receiverId: input.userId }, { senderId: input.userId, receiverId: req.userId }] } }),
  ]);
  requireCompleteUser(viewer);
  requireCompleteUser(candidate);
  ensureDiscoveryAvailable(viewer);
  if (candidate.profile.discoveryPaused || blocked || rejected) throw new HttpError(404, "Profile is not available");
  const eligibility = evaluateDiscoveryEligibility(viewer.profile, viewer.preferences, candidate.profile, candidate.preferences);
  if (!eligibility.eligible) throw new HttpError(409, "This profile no longer fits both people’s discovery preferences");

  const validTarget = input.targetType === "PROFILE"
    ? input.targetId == null || input.targetId === candidate.profile.id
    : input.targetType === "PHOTO"
      ? candidate.photos.some((item) => item.id === input.targetId)
      : input.targetType === "PROMPT"
        ? candidate.prompts.some((item) => item.id === input.targetId)
        : candidate.videoPrompts.some((item) => item.id === input.targetId);
  if (!validTarget) throw new HttpError(400, "The liked item does not belong to this profile");

  const existing = await prisma.like.findUnique({ where: { senderId_receiverId: { senderId: viewer.id, receiverId: candidate.id } } });
  if (existing) {
    const [userAId, userBId] = [viewer.id, candidate.id].sort() as [string, string];
    const match = await prisma.match.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
    res.json({ like: existing, match: match?.status === "ACTIVE" ? { id: match.id, matchedAt: match.matchedAt } : null, status: await discoveryStatus(viewer.id, isPremium(viewer.subscription)) });
    return;
  }

  const premium = isPremium(viewer.subscription);
  const { dateKey } = utcUsageWindow();
  const startOfDay = new Date(`${dateKey}T00:00:00.000Z`);
  const actualLikes = await prisma.like.count({ where: { senderId: viewer.id, createdAt: { gte: startOfDay } } });
  const scored = scoredPair(viewer.profile, viewer.preferences, candidate.profile, candidate.preferences, eligibility.distanceKm);
  const result = await runSerializable(async (tx) => {
    const duplicate = await tx.like.findUnique({ where: { senderId_receiverId: { senderId: viewer.id, receiverId: candidate.id } } });
    if (duplicate) {
      const [userAId, userBId] = [viewer.id, candidate.id].sort() as [string, string];
      const match = await tx.match.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
      return { like: duplicate, match: match?.status === "ACTIVE" ? { id: match.id, matchedAt: match.matchedAt } : null };
    }
    if (!premium) {
      const usage = await tx.discoveryUsage.upsert({
        where: { userId_dateKey: { userId: viewer.id, dateKey } },
        create: { userId: viewer.id, dateKey, likesUsed: actualLikes + 1 }, update: { likesUsed: { increment: 1 } },
      });
      if (usage.likesUsed > FREE_DAILY_LIKE_LIMIT) throw new HttpError(429, "Daily free-like limit reached");
    }
    const like = await tx.like.create({ data: { senderId: viewer.id, receiverId: candidate.id, targetType: input.targetType, targetId: input.targetId, comment: input.comment } });
    const mutual = await tx.like.findUnique({ where: { senderId_receiverId: { senderId: candidate.id, receiverId: viewer.id } } });
    if (!mutual) return { like, match: null };
    const [userAId, userBId] = [viewer.id, candidate.id].sort() as [string, string];
    const snapshot = { compatibility: scored.compatibility, explanation: scored.explanation } as unknown as Prisma.InputJsonValue;
    const match = await tx.match.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId, compatibilityScore: scored.compatibility.total, compatibilitySnapshot: snapshot },
      update: { status: "ACTIVE", unmatchedAt: null, matchedAt: new Date(), lastActivityAt: new Date(), compatibilityScore: scored.compatibility.total, compatibilitySnapshot: snapshot },
    });
    return { like, match: { id: match.id, matchedAt: match.matchedAt } };
  });
  if (result.match) {
    await queuePushNotification({
      userId: candidate.id, kind: "NEW_MATCH", title: "You have a new match",
      defaultBody: `You and ${viewer.profile.displayName} liked each other.`,
      data: { type: "match", matchId: result.match.id },
    });
  } else {
    await queuePushNotification({
      userId: candidate.id, kind: "NEW_LIKE", title: "Someone likes you",
      defaultBody: "You have a new like on Spectrum.",
      data: { type: "like" },
    });
  }
  res.status(201).json({ ...result, status: await discoveryStatus(viewer.id, premium) });
});

discoveryRouter.post("/reject", async (req, res) => {
  const { userId } = z.object({ userId: z.uuid() }).parse(req.body);
  if (userId === req.userId) throw new HttpError(400, "You cannot pass on your own profile");
  const candidate = await prisma.user.findFirst({ where: { id: userId, status: "ACTIVE", deletedAt: null }, select: { id: true } });
  if (!candidate) throw new HttpError(404, "Profile is not available");
  const rejection = await prisma.reject.upsert({
    where: { senderId_receiverId: { senderId: req.userId!, receiverId: userId } },
    create: { senderId: req.userId!, receiverId: userId }, update: { createdAt: new Date() },
  });
  res.status(201).json({ rejection });
});

discoveryRouter.post("/backtrack", async (req, res) => {
  const subscription = await prisma.subscription.findUnique({ where: { userId: req.userId } });
  if (!isPremium(subscription)) throw new HttpError(403, "Backtrack is a Premium feature");
  const latest = await prisma.reject.findFirst({ where: { senderId: req.userId }, orderBy: { createdAt: "desc" } });
  if (!latest) throw new HttpError(404, "No passed profile to restore");
  const { dateKey } = utcUsageWindow();
  await prisma.$transaction([
    prisma.reject.delete({ where: { id: latest.id } }),
    prisma.discoveryUsage.upsert({
      where: { userId_dateKey: { userId: req.userId!, dateKey } },
      create: { userId: req.userId!, dateKey, backtracksUsed: 1 }, update: { backtracksUsed: { increment: 1 } },
    }),
  ]);
  res.json({ restoredUserId: latest.receiverId, status: await discoveryStatus(req.userId!, true) });
});
