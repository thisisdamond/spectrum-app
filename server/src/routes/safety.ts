import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const safetyRouter = Router();
safetyRouter.use(requireAuth);

safetyRouter.post("/block", async (req, res) => {
  const { userId } = z.object({ userId: z.uuid() }).parse(req.body);
  const block = await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: req.userId!, blockedId: userId } },
    create: { blockerId: req.userId!, blockedId: userId },
    update: {},
  });
  res.status(201).json({ block });
});

safetyRouter.delete("/block/:userId", async (req, res) => {
  await prisma.block.deleteMany({ where: { blockerId: req.userId, blockedId: req.params.userId } });
  res.status(204).send();
});

safetyRouter.post("/report", async (req, res) => {
  const input = z.object({
    userId: z.uuid(),
    category: z.enum(["HARASSMENT", "SPAM", "FAKE_PROFILE", "INAPPROPRIATE_CONTENT", "HATE_OR_DISCRIMINATION", "UNSAFE_BEHAVIOR", "OTHER"]),
    details: z.string().trim().max(3000).nullable().optional(),
  }).parse(req.body);
  const report = await prisma.report.create({ data: { reporterId: req.userId!, reportedId: input.userId, category: input.category, details: input.details } });
  res.status(201).json({ report });
});
