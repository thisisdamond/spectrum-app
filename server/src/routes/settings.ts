import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

settingsRouter.get("/accessibility", async (req, res) => {
  const settings = await prisma.accessibilitySettings.findUnique({ where: { userId: req.userId } });
  res.json({ settings });
});

settingsRouter.put("/accessibility", async (req, res) => {
  const input = z.object({
    calmMode: z.boolean().optional(),
    highContrast: z.boolean().optional(),
    reducedMotion: z.boolean().optional(),
    textScale: z.number().min(0.85).max(2).optional(),
    quietNotifications: z.boolean().optional(),
    noAutoplayVideo: z.boolean().optional(),
    breakModeUntil: z.coerce.date().nullable().optional(),
  }).parse(req.body);
  const settings = await prisma.accessibilitySettings.upsert({
    where: { userId: req.userId },
    create: { userId: req.userId!, ...input },
    update: input,
  });
  res.json({ settings });
});

settingsRouter.get("/notifications", async (req, res) => {
  const settings = await prisma.notificationSettings.findUnique({ where: { userId: req.userId } });
  res.json({ settings });
});

settingsRouter.put("/notifications", async (req, res) => {
  const input = z.object({
    newMatches: z.boolean().optional(),
    newMessages: z.boolean().optional(),
    newLikes: z.boolean().optional(),
    messagePreviews: z.boolean().optional(),
    batched: z.boolean().optional(),
    pausedUntil: z.coerce.date().nullable().optional(),
  }).parse(req.body);
  const settings = await prisma.notificationSettings.upsert({
    where: { userId: req.userId },
    create: { userId: req.userId!, ...input },
    update: input,
  });
  res.json({ settings });
});
