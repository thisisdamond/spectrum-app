import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError } from "../lib/httpError.js";
import { requireAuth } from "../middleware/auth.js";
import { scoreCompatibility, type CompatibilityProfile } from "../services/compatibility.js";

export const discoveryRouter = Router();
discoveryRouter.use(requireAuth);

const distanceKm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const radians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = radians(bLat - aLat);
  const deltaLon = radians(bLon - aLon);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

discoveryRouter.get("/", async (req, res) => {
  const viewer = await prisma.user.findUnique({ where: { id: req.userId }, include: { profile: true, preferences: true } });
  if (!viewer?.profile || !viewer.preferences) throw new HttpError(409, "Complete your profile and preferences first");

  const [blocks, rejects, likes, candidates] = await Promise.all([
    prisma.block.findMany({ where: { OR: [{ blockerId: viewer.id }, { blockedId: viewer.id }] } }),
    prisma.reject.findMany({ where: { senderId: viewer.id }, select: { receiverId: true } }),
    prisma.like.findMany({ where: { senderId: viewer.id }, select: { receiverId: true } }),
    prisma.user.findMany({
      where: { id: { not: viewer.id }, status: "ACTIVE", deletedAt: null, profile: { is: { discoveryPaused: false } } },
      include: { profile: true, preferences: true, photos: { orderBy: { position: "asc" }, take: 4 }, prompts: { orderBy: { position: "asc" }, take: 3 } },
      take: 100,
    }),
  ]);
  const hidden = new Set([
    ...blocks.flatMap((item) => [item.blockerId, item.blockedId]),
    ...rejects.map((item) => item.receiverId),
    ...likes.map((item) => item.receiverId),
  ]);

  const viewerInput: CompatibilityProfile = {
    datingGoals: [viewer.profile.datingGoal],
    communicationStyles: viewer.profile.communicationStyle,
    sensoryPreferences: viewer.profile.sensoryPreferences,
    socialEnergy: viewer.profile.socialEnergy,
    routinePreference: viewer.profile.routinePreference,
    interests: viewer.profile.interests,
    distanceKm: 0,
    vicesCompatibility: 1,
    dateEnvironments: viewer.profile.preferredDateEnvironments,
    desiredPace: viewer.profile.preferredDatingPace,
    boundaries: viewer.profile.boundaries,
  };

  const results = [];
  for (const candidate of candidates) {
    if (hidden.has(candidate.id) || !candidate.profile) continue;
    const locationDistance = viewer.profile.approximateLatitude && viewer.profile.approximateLongitude && candidate.profile.approximateLatitude && candidate.profile.approximateLongitude
      ? distanceKm(Number(viewer.profile.approximateLatitude), Number(viewer.profile.approximateLongitude), Number(candidate.profile.approximateLatitude), Number(candidate.profile.approximateLongitude))
      : viewer.preferences.maxDistanceKm / 2;
    if (locationDistance > viewer.preferences.maxDistanceKm) continue;
    const vices = candidate.preferences
      ? ["drinking", "smoking", "cannabis"].filter((key) => candidate.preferences?.[key as "drinking" | "smoking" | "cannabis"] === viewer.preferences?.[key as "drinking" | "smoking" | "cannabis"]).length / 3
      : 0.5;
    const candidateInput: CompatibilityProfile = {
      datingGoals: [candidate.profile.datingGoal],
      communicationStyles: candidate.profile.communicationStyle,
      sensoryPreferences: candidate.profile.sensoryPreferences,
      socialEnergy: candidate.profile.socialEnergy,
      routinePreference: candidate.profile.routinePreference,
      interests: candidate.profile.interests,
      distanceKm: locationDistance,
      vicesCompatibility: vices,
      dateEnvironments: candidate.profile.preferredDateEnvironments,
      desiredPace: candidate.profile.preferredDatingPace,
      boundaries: candidate.profile.boundaries,
    };
    results.push({
      userId: candidate.id,
      profile: candidate.profile,
      photos: candidate.photos,
      prompts: candidate.prompts,
      distanceKm: Math.round(locationDistance),
      compatibility: scoreCompatibility(viewerInput, candidateInput, viewer.preferences.maxDistanceKm),
    });
  }
  results.sort((a, b) => b.compatibility.total - a.compatibility.total);
  res.json({ candidates: results.slice(0, 20) });
});

discoveryRouter.post("/like", async (req, res) => {
  const input = z.object({
    userId: z.uuid(),
    targetType: z.enum(["PROFILE", "PHOTO", "PROMPT", "VIDEO_PROMPT"]).default("PROFILE"),
    targetId: z.uuid().nullable().optional(),
    comment: z.string().trim().max(500).nullable().optional(),
  }).parse(req.body);
  if (input.userId === req.userId) throw new HttpError(400, "You cannot like your own profile");

  const subscription = await prisma.subscription.findUnique({ where: { userId: req.userId } });
  if (subscription?.tier !== "PREMIUM") {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    if (await prisma.like.count({ where: { senderId: req.userId, createdAt: { gte: start } } }) >= 8) {
      throw new HttpError(429, "Daily free-like limit reached");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const like = await tx.like.create({ data: { senderId: req.userId!, receiverId: input.userId, targetType: input.targetType, targetId: input.targetId, comment: input.comment } });
    const mutual = await tx.like.findUnique({ where: { senderId_receiverId: { senderId: input.userId, receiverId: req.userId! } } });
    if (!mutual) return { like, match: null };
    const [userAId, userBId] = [req.userId!, input.userId].sort() as [string, string];
    const match = await tx.match.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: { status: "ACTIVE", unmatchedAt: null },
    });
    return { like, match };
  });
  res.status(201).json(result);
});

discoveryRouter.post("/reject", async (req, res) => {
  const { userId } = z.object({ userId: z.uuid() }).parse(req.body);
  const rejection = await prisma.reject.upsert({
    where: { senderId_receiverId: { senderId: req.userId!, receiverId: userId } },
    create: { senderId: req.userId!, receiverId: userId },
    update: { createdAt: new Date() },
  });
  res.status(201).json({ rejection });
});

discoveryRouter.post("/backtrack", async (req, res) => {
  const subscription = await prisma.subscription.findUnique({ where: { userId: req.userId } });
  if (subscription?.tier !== "PREMIUM") throw new HttpError(403, "Backtrack is a Premium feature");
  const latest = await prisma.reject.findFirst({ where: { senderId: req.userId }, orderBy: { createdAt: "desc" } });
  if (!latest) throw new HttpError(404, "No rejection to restore");
  await prisma.reject.delete({ where: { id: latest.id } });
  res.json({ restoredUserId: latest.receiverId });
});
