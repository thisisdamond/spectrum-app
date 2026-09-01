import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const encryptionKey = createHash("sha256").update(env.TWO_FACTOR_ENCRYPTION_KEY).digest();

function encodeBase32(buffer: Buffer) {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let index = 0; index < bits.length; index += 5) {
    output += alphabet[Number.parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  }
  return output;
}

function decodeBase32(value: string) {
  const bits = value.toUpperCase().replace(/=+$/g, "").split("").map((character) => {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Invalid base32 secret");
    return index.toString(2).padStart(5, "0");
  }).join("");
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

export function createTotpSecret() {
  return encodeBase32(randomBytes(20));
}

export function createTotpUri(email: string, secret: string) {
  const label = encodeURIComponent(`Spectrum:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=Spectrum&algorithm=SHA1&digits=6&period=30`;
}

export function generateTotp(secret: string, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 30_000);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, timestamp = Date.now()) {
  if (!/^\d{6}$/.test(code)) return false;
  const provided = Buffer.from(code);
  return [-1, 0, 1].some((window) => {
    const expected = Buffer.from(generateTotp(secret, timestamp + window * 30_000));
    return expected.length === provided.length && timingSafeEqual(expected, provided);
  });
}

export function encryptTotpSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptTotpSecret(payload: string) {
  const [ivValue, tagValue, encryptedValue] = payload.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Invalid encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}
