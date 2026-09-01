import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const profileRouter = Router();
profileRouter.use(requireAuth);

const profileInput = z.object({
  displayName: z.string().trim().min(1).max(80),
  birthDate: z.coerce.date().refine((date) => Date.now() - date.getTime() >= 18 * 365.2425 * 24 * 60 * 60 * 1000, "You must be 18 or older"),
  gender: z.string().trim().min(1).max(80),
  pronouns: z.string().trim().max(80).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  region: z.string().trim().max(120).nullable().optional(),
  countryCode: z.string().length(2).toUpperCase().nullable().optional(),
  datingGoal: z.enum(["LONG_TERM", "SHORT_TERM", "FRIENDSHIP_FIRST", "LIFE_PARTNER", "EXPLORING"]),
  bio: z.string().max(1200).nullable().optional(),
  interests: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  communicationStyle: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  sensoryPreferences: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  socialEnergy: z.number().int().min(0).max(100).default(50),
  routinePreference: z.number().int().min(0).max(100).default(50),
  directnessPreference: z.number().int().min(0).max(100).default(50),
  preferredDatingPace: z.number().int().min(0).max(100).default(50),
  preferredDateEnvironments: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  boundaries: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  communicationCard: z.record(z.string(), z.string().max(300)).optional(),
});

profileRouter.get("/me", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      profile: true,
      preferences: true,
      photos: { orderBy: { position: "asc" } },
      prompts: { orderBy: { position: "asc" } },
    },
  });
  res.json({ user });
});

profileRouter.put("/me", async (req, res) => {
  const input = profileInput.parse(req.body);
  const profile = await prisma.profile.upsert({
    where: { userId: req.userId },
    create: { ...input, userId: req.userId! },
    update: input,
  });
  res.json({ profile });
});

profileRouter.post("/photos", (_req, res) => res.status(501).json({ error: "Signed media upload arrives in Phase 2" }));
profileRouter.delete("/photos/:photoId", (_req, res) => res.status(501).json({ error: "Media deletion arrives in Phase 2" }));
profileRouter.post("/prompts", (_req, res) => res.status(501).json({ error: "Prompt editing arrives in Phase 2" }));
profileRouter.put("/prompts/:promptId", (_req, res) => res.status(501).json({ error: "Prompt editing arrives in Phase 2" }));
profileRouter.delete("/prompts/:promptId", (_req, res) => res.status(501).json({ error: "Prompt editing arrives in Phase 2" }));
profileRouter.post("/video-prompts", (_req, res) => res.status(501).json({ error: "Video prompts arrive in Phase 2" }));
