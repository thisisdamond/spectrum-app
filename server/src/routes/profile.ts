import express, { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../db.js";
import { HttpError } from "../lib/httpError.js";
import { requireAuth } from "../middleware/auth.js";
import { createPhotoReadUrl, createPhotoUpload, deletePhotoObject, readLocalPhoto, storeLocalPhoto, verifyPhotoObject } from "../services/media.js";
import { getProfileSetupStatus } from "../services/profileSetup.js";

export const profileRouter = Router();
profileRouter.use(requireAuth);

const stringList = (limit: number, itemLimit: number) => z.array(z.string().trim().min(1).max(itemLimit)).max(limit);
const profileCreateInput = z.object({
  displayName: z.string().trim().min(1).max(80),
  birthDate: z.coerce.date().refine((date) => Date.now() - date.getTime() >= 18 * 365.2425 * 24 * 60 * 60 * 1000, "You must be 18 or older"),
  gender: z.string().trim().min(1).max(80),
  pronouns: z.string().trim().max(80).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  region: z.string().trim().max(120).nullable().optional(),
  countryCode: z.string().length(2).toUpperCase().nullable().optional(),
  datingGoal: z.enum(["LONG_TERM", "SHORT_TERM", "FRIENDSHIP_FIRST", "LIFE_PARTNER", "EXPLORING"]),
  bio: z.string().trim().max(1200).nullable().optional(),
  interests: stringList(30, 60).default([]),
  communicationStyle: stringList(20, 80).default([]),
  sensoryPreferences: stringList(20, 80).default([]),
  socialEnergy: z.number().int().min(0).max(100).default(50),
  routinePreference: z.number().int().min(0).max(100).default(50),
  directnessPreference: z.number().int().min(0).max(100).default(50),
  preferredDatingPace: z.number().int().min(0).max(100).default(50),
  preferredDateEnvironments: stringList(20, 80).default([]),
  boundaries: stringList(30, 120).default([]),
  communicationCard: z.record(z.string(), z.string().trim().max(300)).optional(),
});
const profilePatchInput = profileCreateInput.partial().extend({ discoveryPaused: z.boolean().optional() });

const preferenceInput = z.object({
  minAge: z.number().int().min(18).max(100),
  maxAge: z.number().int().min(18).max(100),
  maxDistanceKm: z.number().int().min(1).max(500),
  interestedInGenders: stringList(20, 80),
  datingGoals: z.array(z.enum(["LONG_TERM", "SHORT_TERM", "FRIENDSHIP_FIRST", "LIFE_PARTNER", "EXPLORING"])).min(1),
  drinking: z.enum(["AVOID", "LOW", "MODERATE", "HIGH", "LOVE"]).default("MODERATE"),
  smoking: z.enum(["AVOID", "LOW", "MODERATE", "HIGH", "LOVE"]).default("AVOID"),
  cannabis: z.enum(["AVOID", "LOW", "MODERATE", "HIGH", "LOVE"]).default("MODERATE"),
  communicationStyles: stringList(20, 80).default([]),
  sensoryPreferences: stringList(20, 80).default([]),
  socialEnergyTarget: z.number().int().min(0).max(100).default(50),
  routineTarget: z.number().int().min(0).max(100).default(50),
  dateEnvironments: stringList(20, 80).default([]),
  desiredPace: z.number().int().min(0).max(100).default(50),
  hardBoundaries: stringList(30, 120).default([]),
}).refine((value) => value.maxAge >= value.minAge, { message: "Maximum age must be at least the minimum age", path: ["maxAge"] });

async function photoResponse(photo: { id: string; storageKey: string; altText: string | null; mimeType: string; sizeBytes: number; position: number }) {
  const signedUrl = await createPhotoReadUrl(photo.storageKey);
  return {
    id: photo.id,
    altText: photo.altText,
    mimeType: photo.mimeType,
    sizeBytes: photo.sizeBytes,
    position: photo.position,
    url: signedUrl ?? `${env.API_PUBLIC_URL.replace(/\/$/, "")}/profile/photos/${photo.id}/content`,
  };
}

profileRouter.get("/me", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true, email: true, status: true, twoFactorEnabled: true,
      profile: true, preferences: true, accessibility: true,
      photos: { orderBy: { position: "asc" } }, prompts: { orderBy: { position: "asc" } },
    },
  });
  if (!user) throw new HttpError(404, "Account not found");
  res.json({ user: { ...user, photos: await Promise.all(user.photos.map(photoResponse)) } });
});

profileRouter.put("/me", async (req, res) => {
  const input = profileCreateInput.parse(req.body);
  const profile = await prisma.profile.upsert({
    where: { userId: req.userId },
    create: { ...input, userId: req.userId },
    update: input,
  });
  res.json({ profile });
});

profileRouter.patch("/me", async (req, res) => {
  const input = profilePatchInput.parse(req.body);
  const profile = await prisma.profile.update({ where: { userId: req.userId }, data: input }).catch(() => {
    throw new HttpError(400, "Complete your basic profile before adding these details");
  });
  res.json({ profile });
});

profileRouter.get("/preferences", async (req, res) => {
  res.json({ preferences: await prisma.preference.findUnique({ where: { userId: req.userId } }) });
});

profileRouter.put("/preferences", async (req, res) => {
  const input = preferenceInput.parse(req.body);
  const preferences = await prisma.preference.upsert({
    where: { userId: req.userId },
    create: { ...input, userId: req.userId },
    update: input,
  });
  res.json({ preferences });
});

profileRouter.get("/setup-status", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { profile: true, preferences: true, _count: { select: { photos: true, prompts: true } } },
  });
  if (!user) throw new HttpError(404, "Account not found");
  res.json({ status: getProfileSetupStatus({ profile: user.profile, preferences: user.preferences, photoCount: user._count.photos, promptCount: user._count.prompts }) });
});

profileRouter.post("/photos/upload-url", async (req, res) => {
  const input = z.object({ mimeType: z.string(), sizeBytes: z.number().int() }).parse(req.body);
  const count = await prisma.profilePhoto.count({ where: { userId: req.userId } });
  if (count >= 4) throw new HttpError(409, "A profile can have up to four photos");
  res.json({ upload: await createPhotoUpload(req.userId, input.mimeType, input.sizeBytes) });
});

profileRouter.put("/photos/local-upload", express.raw({ type: ["image/jpeg", "image/png", "image/webp", "image/heic"], limit: "10mb" }), async (req, res) => {
  const { key } = z.object({ key: z.string().min(1) }).parse(req.query);
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new HttpError(400, "Photo body is empty");
  await storeLocalPhoto(req.userId, key, req.body);
  res.status(204).send();
});

profileRouter.post("/photos", async (req, res) => {
  const input = z.object({
    storageKey: z.string().min(1), mimeType: z.string().min(1), sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
    position: z.number().int().min(0).max(3), altText: z.string().trim().max(300).nullable().optional(),
  }).parse(req.body);
  if (!input.storageKey.startsWith(`profile-photos/${req.userId}/`)) throw new HttpError(403, "Media key is not valid for this account");
  const count = await prisma.profilePhoto.count({ where: { userId: req.userId } });
  if (count >= 4) throw new HttpError(409, "A profile can have up to four photos");
  await verifyPhotoObject(req.userId, input.storageKey, input.mimeType, input.sizeBytes);
  const photo = await prisma.profilePhoto.create({ data: { ...input, userId: req.userId } });
  res.status(201).json({ photo: await photoResponse(photo) });
});

profileRouter.get("/photos/:photoId/content", async (req, res) => {
  const photo = await prisma.profilePhoto.findUnique({ where: { id: req.params.photoId } });
  if (!photo) throw new HttpError(404, "Photo not found");
  const signedUrl = await createPhotoReadUrl(photo.storageKey);
  if (signedUrl) { res.redirect(signedUrl); return; }
  res.type(photo.mimeType).send(await readLocalPhoto(photo.storageKey));
});

profileRouter.delete("/photos/:photoId", async (req, res) => {
  const photo = await prisma.profilePhoto.findFirst({ where: { id: req.params.photoId, userId: req.userId } });
  if (!photo) throw new HttpError(404, "Photo not found");
  await deletePhotoObject(photo.storageKey);
  await prisma.profilePhoto.delete({ where: { id: photo.id } });
  res.status(204).send();
});

const promptInput = z.object({ promptKey: z.string().trim().min(1).max(120), answer: z.string().trim().min(1).max(1000), position: z.number().int().min(0).max(2) });

profileRouter.post("/prompts", async (req, res) => {
  const input = promptInput.parse(req.body);
  if (await prisma.promptAnswer.count({ where: { userId: req.userId } }) >= 3) throw new HttpError(409, "A profile can have up to three prompts");
  const prompt = await prisma.promptAnswer.create({ data: { ...input, userId: req.userId } });
  res.status(201).json({ prompt });
});

profileRouter.put("/prompts/:promptId", async (req, res) => {
  const input = promptInput.parse(req.body);
  const existing = await prisma.promptAnswer.findFirst({ where: { id: req.params.promptId, userId: req.userId } });
  if (!existing) throw new HttpError(404, "Prompt not found");
  res.json({ prompt: await prisma.promptAnswer.update({ where: { id: existing.id }, data: input }) });
});

profileRouter.delete("/prompts/:promptId", async (req, res) => {
  const deleted = await prisma.promptAnswer.deleteMany({ where: { id: req.params.promptId, userId: req.userId } });
  if (!deleted.count) throw new HttpError(404, "Prompt not found");
  res.status(204).send();
});
