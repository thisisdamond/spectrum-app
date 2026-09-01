import { Router } from "express";
import { prisma } from "../db.js";
import { HttpError } from "../lib/httpError.js";
import { requireAuth } from "../middleware/auth.js";

export const matchesRouter = Router();
matchesRouter.use(requireAuth);

matchesRouter.get("/", async (req, res) => {
  const matches = await prisma.match.findMany({
    where: { status: "ACTIVE", OR: [{ userAId: req.userId }, { userBId: req.userId }] },
    include: {
      userA: { select: { id: true, profile: true, photos: { orderBy: { position: "asc" }, take: 1 } } },
      userB: { select: { id: true, profile: true, photos: { orderBy: { position: "asc" }, take: 1 } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { matchedAt: "desc" },
  });
  res.json({ matches });
});

matchesRouter.delete("/:matchId", async (req, res) => {
  const match = await prisma.match.findUnique({ where: { id: req.params.matchId } });
  if (!match || (match.userAId !== req.userId && match.userBId !== req.userId)) throw new HttpError(404, "Match not found");
  await prisma.match.update({ where: { id: match.id }, data: { status: "UNMATCHED", unmatchedAt: new Date() } });
  res.status(204).send();
});
