import { hash, verify } from "argon2";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError } from "../lib/httpError.js";
import { requireAuth } from "../middleware/auth.js";
import { createAccessToken, createRefreshToken, verifyRefreshToken } from "../services/tokens.js";

export const authRouter = Router();

const credentials = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
});

async function tokenPair(userId: string) {
  return {
    accessToken: await createAccessToken(userId),
    refreshToken: await createRefreshToken(userId),
  };
}

authRouter.post("/register", async (req, res) => {
  const input = credentials.parse(req.body);
  if (await prisma.user.findUnique({ where: { email: input.email } })) {
    throw new HttpError(409, "An account already exists for that email");
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await hash(input.password),
      accessibility: { create: {} },
      notification: { create: {} },
      subscription: { create: {} },
    },
    select: { id: true, email: true, status: true },
  });
  const tokens = await tokenPair(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: await hash(tokens.refreshToken) } });
  res.status(201).json({ user, ...tokens });
});

authRouter.post("/login", async (req, res) => {
  const input = credentials.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user?.passwordHash || !(await verify(user.passwordHash, input.password))) {
    throw new HttpError(401, "Invalid email or password");
  }
  if (user.deletedAt || user.status === "SUSPENDED") throw new HttpError(403, "Account unavailable");

  const tokens = await tokenPair(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: await hash(tokens.refreshToken), lastActiveAt: new Date() },
  });
  res.json({ user: { id: user.id, email: user.email, status: user.status }, ...tokens });
});

authRouter.post("/refresh", async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
  const userId = await verifyRefreshToken(refreshToken).catch(() => {
    throw new HttpError(401, "Invalid refresh token");
  });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.refreshTokenHash || !(await verify(user.refreshTokenHash, refreshToken))) {
    throw new HttpError(401, "Refresh token has been revoked");
  }

  const tokens = await tokenPair(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: await hash(tokens.refreshToken) } });
  res.json(tokens);
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  await prisma.user.update({ where: { id: req.userId }, data: { refreshTokenHash: null } });
  res.status(204).send();
});

for (const path of ["/password-reset", "/verify-email", "/2fa/enable", "/2fa/verify", "/social-login"]) {
  authRouter.post(path, (_req, res) => res.status(501).json({ error: "Scheduled for Phase 2" }));
}
