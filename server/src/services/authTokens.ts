import { createHash, randomBytes } from "node:crypto";
import type { AuthTokenType } from "@prisma/client";
import { prisma } from "../db.js";
import { HttpError } from "../lib/httpError.js";

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function issueAuthToken(userId: string, type: AuthTokenType, lifetimeMinutes: number) {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { userId, type, consumedAt: null } }),
    prisma.authToken.create({
      data: {
        userId,
        type,
        digest: digest(token),
        expiresAt: new Date(Date.now() + lifetimeMinutes * 60_000),
      },
    }),
  ]);
  return token;
}

export async function consumeAuthToken(token: string, type: AuthTokenType) {
  const record = await prisma.authToken.findUnique({
    where: { digest: digest(token) },
    include: { user: true },
  });
  if (!record || record.type !== type || record.consumedAt || record.expiresAt <= new Date()) {
    throw new HttpError(400, "This link is invalid or has expired");
  }

  const consumed = await prisma.authToken.updateMany({
    where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  });
  if (consumed.count !== 1) throw new HttpError(400, "This link is invalid or has expired");
  return record.user;
}
