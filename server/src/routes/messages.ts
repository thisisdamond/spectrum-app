import { setTimeout as wait } from "node:timers/promises";
import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError } from "../lib/httpError.js";
import { requireAuth } from "../middleware/auth.js";
import { decodeMessageCursor, encodeMessageCursor, messageCursorWhere } from "../services/conversation.js";
import { queuePushNotification } from "../services/notifications.js";

export const messagesRouter = Router();
messagesRouter.use(requireAuth);

async function requireMatch(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      userA: { select: { id: true, profile: { select: { displayName: true } } } },
      userB: { select: { id: true, profile: { select: { displayName: true } } } },
    },
  });
  if (!match || match.status !== "ACTIVE" || (match.userAId !== userId && match.userBId !== userId)) {
    throw new HttpError(404, "Active match not found");
  }
  return match;
}

function safeMessage(message: { id: string; clientId: string | null; matchId: string; senderId: string; body: string; readAt: Date | null; createdAt: Date }) {
  return {
    id: message.id, clientId: message.clientId, matchId: message.matchId, senderId: message.senderId,
    body: message.body, readAt: message.readAt, createdAt: message.createdAt,
  };
}

async function conversationUpdate(matchId: string, userId: string, cursorValue?: string) {
  const cursor = decodeMessageCursor(cursorValue);
  const match = await requireMatch(matchId, userId);
  const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
  const [rawMessages, typing, readReceipt] = await Promise.all([
    prisma.message.findMany({
      where: { matchId, deletedAt: null, ...messageCursorWhere(cursor) },
      orderBy: cursor ? [{ createdAt: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    }),
    prisma.typingIndicator.findUnique({ where: { matchId_userId: { matchId, userId: otherUserId } } }),
    prisma.message.findFirst({
      where: { matchId, senderId: userId, readAt: { not: null }, deletedAt: null },
      select: { createdAt: true, readAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  ]);
  const ordered = cursor ? rawMessages : rawMessages.reverse();
  const last = ordered.at(-1);
  return {
    messages: ordered.map(safeMessage),
    cursor: last ? encodeMessageCursor({ createdAt: last.createdAt.toISOString(), id: last.id }) : cursorValue ?? null,
    typing: typing ? { active: typing.expiresAt > new Date(), updatedAt: typing.updatedAt, expiresAt: typing.expiresAt } : null,
    readReceipt: readReceipt ? { through: readReceipt.createdAt, at: readReceipt.readAt } : null,
  };
}

const matchParams = z.object({ matchId: z.uuid() });

messagesRouter.get("/matches/:matchId", async (req, res) => {
  const { matchId } = matchParams.parse(req.params);
  const { cursor } = z.object({ cursor: z.string().max(500).optional() }).parse(req.query);
  res.json(await conversationUpdate(matchId, req.userId!, cursor));
});

messagesRouter.get("/matches/:matchId/updates", async (req, res) => {
  const { matchId } = matchParams.parse(req.params);
  const input = z.object({
    cursor: z.string().max(500).optional(),
    typingAt: z.iso.datetime().optional(),
    readAt: z.iso.datetime().optional(),
    timeoutMs: z.coerce.number().int().min(1000).max(25_000).default(20_000),
  }).parse(req.query);
  let closed = false;
  res.on("close", () => { closed = true; });
  const deadline = Date.now() + input.timeoutMs;
  do {
    const update = await conversationUpdate(matchId, req.userId!, input.cursor);
    const typingChanged = update.typing && (!input.typingAt || update.typing.updatedAt > new Date(input.typingAt));
    const readChanged = update.readReceipt?.at && (!input.readAt || update.readReceipt.at > new Date(input.readAt));
    if (update.messages.length || typingChanged || readChanged || Date.now() >= deadline) { res.json(update); return; }
    await wait(600);
  } while (!closed);
});

messagesRouter.post("/matches/:matchId", async (req, res) => {
  const { matchId } = matchParams.parse(req.params);
  const input = z.object({ clientId: z.uuid(), body: z.string().trim().min(1).max(5000) }).parse(req.body);
  const match = await requireMatch(matchId, req.userId!);
  const otherUser = match.userAId === req.userId ? match.userB : match.userA;
  const sender = match.userAId === req.userId ? match.userA : match.userB;
  const existing = await prisma.message.findUnique({ where: { senderId_clientId: { senderId: req.userId!, clientId: input.clientId } } });
  if (existing) {
    if (existing.matchId !== matchId) throw new HttpError(409, "Message identifier was already used in another conversation");
    res.json({ message: safeMessage(existing), created: false }); return;
  }

  let message;
  try {
    message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({ data: { matchId, senderId: req.userId!, clientId: input.clientId, body: input.body } });
      const active = await tx.match.updateMany({
        where: { id: matchId, status: "ACTIVE", OR: [{ userAId: req.userId! }, { userBId: req.userId! }] },
        data: { lastActivityAt: created.createdAt },
      });
      if (!active.count) throw new HttpError(404, "Active match not found");
      await tx.typingIndicator.upsert({
        where: { matchId_userId: { matchId, userId: req.userId! } },
        create: { matchId, userId: req.userId!, expiresAt: new Date() }, update: { expiresAt: new Date() },
      });
      return created;
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    const duplicate = await prisma.message.findUnique({ where: { senderId_clientId: { senderId: req.userId!, clientId: input.clientId } } });
    if (!duplicate) throw error;
    if (duplicate.matchId !== matchId) throw new HttpError(409, "Message identifier was already used in another conversation");
    res.json({ message: safeMessage(duplicate), created: false });
    return;
  }

  await queuePushNotification({
    userId: otherUser.id, kind: "NEW_MESSAGE", title: `New message from ${sender.profile?.displayName ?? "a match"}`,
    defaultBody: "You have a new message on Spectrum.", previewBody: input.body,
    data: { type: "message", matchId, senderId: req.userId! },
  });
  res.status(201).json({ message: safeMessage(message), created: true });
});

messagesRouter.post("/matches/:matchId/read", async (req, res) => {
  const { matchId } = matchParams.parse(req.params);
  await requireMatch(matchId, req.userId!);
  const readAt = new Date();
  const result = await prisma.message.updateMany({
    where: { matchId, senderId: { not: req.userId }, readAt: null, deletedAt: null },
    data: { readAt },
  });
  res.json({ readAt, count: result.count });
});

messagesRouter.put("/matches/:matchId/typing", async (req, res) => {
  const { matchId } = matchParams.parse(req.params);
  const { active } = z.object({ active: z.boolean() }).parse(req.body);
  await requireMatch(matchId, req.userId!);
  const expiresAt = new Date(Date.now() + (active ? 8_000 : 0));
  const typing = await prisma.typingIndicator.upsert({
    where: { matchId_userId: { matchId, userId: req.userId! } },
    create: { matchId, userId: req.userId!, expiresAt }, update: { expiresAt },
  });
  res.json({ typing: { active, updatedAt: typing.updatedAt, expiresAt: typing.expiresAt } });
});
