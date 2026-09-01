import { hash, verify } from "argon2";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError } from "../lib/httpError.js";
import { requireAuth } from "../middleware/auth.js";
import { consumeAuthToken, issueAuthToken } from "../services/authTokens.js";
import { deliverAuthEmail } from "../services/email.js";
import { verifySocialIdentity } from "../services/oauth.js";
import { createTotpSecret, createTotpUri, decryptTotpSecret, encryptTotpSecret, verifyTotp } from "../services/totp.js";
import { createAccessToken, createRefreshToken, createTwoFactorChallengeToken, verifyRefreshToken, verifyTwoFactorChallengeToken } from "../services/tokens.js";

export const authRouter = Router();

const credentials = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
});
const tokenInput = z.object({ token: z.string().min(20) });
const codeInput = z.object({ code: z.string().regex(/^\d{6}$/) });

async function tokenPair(userId: string) {
  return { accessToken: await createAccessToken(userId), refreshToken: await createRefreshToken(userId) };
}

async function persistTokenPair(userId: string) {
  const tokens = await tokenPair(userId);
  await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenHash: await hash(tokens.refreshToken), lastActiveAt: new Date() },
  });
  return tokens;
}

function publicUser(user: { id: string; email: string; status: string; twoFactorEnabled: boolean }) {
  return { id: user.id, email: user.email, status: user.status, twoFactorEnabled: user.twoFactorEnabled };
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
    select: { id: true, email: true, status: true, twoFactorEnabled: true },
  });
  const verificationToken = await issueAuthToken(user.id, "EMAIL_VERIFICATION", 24 * 60);
  const previewUrl = await deliverAuthEmail({ email: user.email, kind: "verify-email", token: verificationToken }).catch(async (error) => {
    await prisma.user.delete({ where: { id: user.id } });
    throw error;
  });
  res.status(201).json({ user: publicUser(user), requiresEmailVerification: true, ...(previewUrl ? { previewUrl } : {}) });
});

authRouter.post("/email/verify", async (req, res) => {
  const { token } = tokenInput.parse(req.body);
  const user = await consumeAuthToken(token, "EMAIL_VERIFICATION");
  if (user.deletedAt || user.status === "SUSPENDED") throw new HttpError(403, "Account unavailable");
  const verified = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date(), status: "ACTIVE" },
    select: { id: true, email: true, status: true, twoFactorEnabled: true },
  });
  res.json({ user: publicUser(verified), ...(await persistTokenPair(user.id)) });
});

authRouter.post("/email/resend", async (req, res) => {
  const { email } = z.object({ email: z.email().transform((value) => value.toLowerCase()) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  let previewUrl: string | undefined;
  if (user && !user.emailVerifiedAt && !user.deletedAt) {
    const token = await issueAuthToken(user.id, "EMAIL_VERIFICATION", 24 * 60);
    previewUrl = await deliverAuthEmail({ email, kind: "verify-email", token });
  }
  res.status(202).json({ accepted: true, ...(previewUrl ? { previewUrl } : {}) });
});

authRouter.post("/password/forgot", async (req, res) => {
  const { email } = z.object({ email: z.email().transform((value) => value.toLowerCase()) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  let previewUrl: string | undefined;
  if (user?.passwordHash && !user.deletedAt) {
    const token = await issueAuthToken(user.id, "PASSWORD_RESET", 30);
    previewUrl = await deliverAuthEmail({ email, kind: "reset-password", token });
  }
  res.status(202).json({ accepted: true, ...(previewUrl ? { previewUrl } : {}) });
});

authRouter.post("/password/reset", async (req, res) => {
  const { token, password } = tokenInput.extend({ password: z.string().min(12).max(128) }).parse(req.body);
  const passwordHash = await hash(password);
  const user = await consumeAuthToken(token, "PASSWORD_RESET");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, refreshTokenHash: null } });
  res.status(204).send();
});

authRouter.post("/login", async (req, res) => {
  const input = credentials.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user?.passwordHash || !(await verify(user.passwordHash, input.password))) throw new HttpError(401, "Invalid email or password");
  if (user.deletedAt || user.status === "SUSPENDED") throw new HttpError(403, "Account unavailable");
  if (!user.emailVerifiedAt || user.status === "PENDING_VERIFICATION") throw new HttpError(403, "Verify your email before logging in");
  if (user.twoFactorEnabled) {
    res.status(202).json({ requiresTwoFactor: true, challengeToken: await createTwoFactorChallengeToken(user.id) });
    return;
  }
  res.json({ user: publicUser(user), ...(await persistTokenPair(user.id)) });
});

authRouter.post("/2fa/challenge", async (req, res) => {
  const { challengeToken, code } = codeInput.extend({ challengeToken: z.string().min(1) }).parse(req.body);
  const userId = await verifyTwoFactorChallengeToken(challengeToken).catch(() => { throw new HttpError(401, "Two-factor challenge is invalid or expired"); });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorEnabled || !user.twoFactorSecret || user.deletedAt || user.status !== "ACTIVE") throw new HttpError(401, "Two-factor authentication is unavailable");
  if (!verifyTotp(decryptTotpSecret(user.twoFactorSecret), code)) throw new HttpError(401, "Authenticator code is invalid");
  res.json({ user: publicUser(user), ...(await persistTokenPair(user.id)) });
});

authRouter.post("/2fa/setup", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(404, "Account not found");
  if (user.twoFactorEnabled) throw new HttpError(409, "Two-factor authentication is already enabled");
  const secret = createTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: encryptTotpSecret(secret) } });
  res.json({ secret, provisioningUri: createTotpUri(user.email, secret) });
});

authRouter.post("/2fa/enable", requireAuth, async (req, res) => {
  const { code } = codeInput.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user?.twoFactorSecret) throw new HttpError(400, "Start two-factor setup first");
  if (!verifyTotp(decryptTotpSecret(user.twoFactorSecret), code)) throw new HttpError(400, "Authenticator code is invalid");
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  res.json({ enabled: true });
});

authRouter.post("/2fa/disable", requireAuth, async (req, res) => {
  const { code, password } = codeInput.extend({ password: z.string().min(12).max(128).optional() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) throw new HttpError(400, "Two-factor authentication is not enabled");
  if (user.passwordHash && (!password || !(await verify(user.passwordHash, password)))) throw new HttpError(401, "Password is invalid");
  if (!verifyTotp(decryptTotpSecret(user.twoFactorSecret), code)) throw new HttpError(401, "Authenticator code is invalid");
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
  res.json({ enabled: false });
});

authRouter.post("/social", async (req, res) => {
  const { provider, idToken } = z.object({ provider: z.enum(["APPLE", "GOOGLE"]), idToken: z.string().min(20) }).parse(req.body);
  const identity = await verifySocialIdentity(provider, idToken);
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId: identity.providerAccountId } },
    include: { user: true },
  });
  let user = existingAccount?.user;
  if (!user) {
    if (!identity.email) throw new HttpError(400, "The provider did not share an email. Reauthorize Spectrum and share your email.");
    user = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email: identity.email! } });
      const linkedUser = existingUser ?? await tx.user.create({
        data: {
          email: identity.email!, emailVerifiedAt: new Date(), status: "ACTIVE",
          accessibility: { create: {} }, notification: { create: {} }, subscription: { create: {} },
        },
      });
      await tx.oAuthAccount.create({ data: { userId: linkedUser.id, provider, providerAccountId: identity.providerAccountId, providerEmail: identity.email } });
      return linkedUser;
    });
  }
  if (user.deletedAt || user.status === "SUSPENDED") throw new HttpError(403, "Account unavailable");
  if (!user.emailVerifiedAt || user.status === "PENDING_VERIFICATION") user = await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date(), status: "ACTIVE" } });
  res.json({ user: publicUser(user), ...(await persistTokenPair(user.id)) });
});

authRouter.post("/refresh", async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
  const userId = await verifyRefreshToken(refreshToken).catch(() => { throw new HttpError(401, "Invalid refresh token"); });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.refreshTokenHash || user.deletedAt || user.status !== "ACTIVE" || !(await verify(user.refreshTokenHash, refreshToken))) throw new HttpError(401, "Refresh token has been revoked");
  res.json(await persistTokenPair(user.id));
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  await prisma.user.update({ where: { id: req.userId }, data: { refreshTokenHash: null } });
  res.status(204).send();
});
