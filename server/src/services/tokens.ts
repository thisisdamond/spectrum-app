import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env.js";

const encoder = new TextEncoder();
const accessSecret = encoder.encode(env.JWT_ACCESS_SECRET);
const refreshSecret = encoder.encode(env.JWT_REFRESH_SECRET);

export async function createAccessToken(userId: string) {
  return new SignJWT({ type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(accessSecret);
}

export async function createRefreshToken(userId: string) {
  return new SignJWT({ type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(env.REFRESH_TOKEN_TTL)
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, accessSecret);
  if (payload.type !== "access" || !payload.sub) throw new Error("Invalid access token");
  return payload.sub;
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, refreshSecret);
  if (payload.type !== "refresh" || !payload.sub) throw new Error("Invalid refresh token");
  return payload.sub;
}
