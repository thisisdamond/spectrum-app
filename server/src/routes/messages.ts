import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError } from "../lib/httpError.js";
import { requireAuth } from "../middleware/auth.js";

export const messagesRouter = Router();
messagesRouter.use(requireAuth);

async function requireMatch(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== "ACTIVE" || (match.userAId !== userId && match.userBId !== userId)) {
    throw new HttpError(404, "Active match not found");
  }
  return match;
}

messagesRouter.get("/:matchId", async (req, res) => {
  await requireMatch(req.params.matchId, req.userId!);
  const messages = await prisma.message.findMany({
    where: { matchId: req.params.matchId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  res.json({ messages });
});

messagesRouter.post("/:matchId", async (req, res) => {
  const { body } = z.object({ body: z.string().trim().min(1).max(5000) }).parse(req.body);
  await requireMatch(req.params.matchId, req.userId!);
  const message = await prisma.message.create({ data: { matchId: req.params.matchId, senderId: req.userId!, body } });
  res.status(201).json({ message });
});
