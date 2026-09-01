import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";

const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type SocialIdentity = {
  provider: "APPLE" | "GOOGLE";
  providerAccountId: string;
  email?: string;
};

export async function verifySocialIdentity(provider: "APPLE" | "GOOGLE", idToken: string): Promise<SocialIdentity> {
  if (provider === "APPLE") {
    if (!env.APPLE_CLIENT_ID) throw new HttpError(503, "Apple sign-in is not configured");
    const { payload } = await jwtVerify(idToken, appleKeys, {
      issuer: "https://appleid.apple.com",
      audience: env.APPLE_CLIENT_ID,
    }).catch(() => { throw new HttpError(401, "Apple identity token is invalid"); });
    if (!payload.sub) throw new HttpError(401, "Apple identity token is incomplete");
    return { provider, providerAccountId: payload.sub, ...(typeof payload.email === "string" ? { email: payload.email.toLowerCase() } : {}) };
  }

  const audiences = env.GOOGLE_CLIENT_IDS?.split(",").map((value) => value.trim()).filter(Boolean);
  if (!audiences?.length) throw new HttpError(503, "Google sign-in is not configured");
  const { payload } = await jwtVerify(idToken, googleKeys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: audiences,
  }).catch(() => { throw new HttpError(401, "Google identity token is invalid"); });
  if (!payload.sub) throw new HttpError(401, "Google identity token is incomplete");
  if (payload.email_verified !== true) throw new HttpError(401, "Google email is not verified");
  return { provider, providerAccountId: payload.sub, ...(typeof payload.email === "string" ? { email: payload.email.toLowerCase() } : {}) };
}
