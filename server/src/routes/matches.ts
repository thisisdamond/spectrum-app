import { Router } from "express";
import { prisma } from "../db.js";
import { HttpError } from "../lib/httpError.js";
import { requireAuth } from "../middleware/auth.js";
import { publicPhoto, publicProfile } from "../services/publicProfile.js";

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
  const safeMatches = await Promise.all(matches.map(async (match) => {
    const other = match.userAId === req.userId ? match.userB : match.userA;
    if (!other.profile) return null;
    const photo = other.photos[0];
    const lastMessage = match.messages[0];
    return {
      id: match.id,
      matchedAt: match.matchedAt,
      compatibilityScore: match.compatibilityScore,
      compatibility: match.compatibilitySnapshot,
      otherUser: {
        userId: other.id,
        profile: publicProfile(other.profile),
        photo: photo ? await publicPhoto(photo) : null,
      },
      lastMessage: lastMessage ? {
        id: lastMessage.id,
        senderId: lastMessage.senderId,
        body: lastMessage.body,
        readAt: lastMessage.readAt,
        createdAt: lastMessage.createdAt,
      } : null,
    };
  }));
  res.json({ matches: safeMatches.filter((match) => match !== null) });
});

matchesRouter.delete("/:matchId", async (req, res) => {
  const match = await prisma.match.findUnique({ where: { id: req.params.matchId } });
  if (!match || (match.userAId !== req.userId && match.userBId !== req.userId)) throw new HttpError(404, "Match not found");
  await prisma.match.update({ where: { id: match.id }, data: { status: "UNMATCHED", unmatchedAt: new Date() } });
  res.status(204).send();
});
