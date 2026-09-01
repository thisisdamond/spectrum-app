import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";

const s3 = env.MEDIA_BUCKET ? new S3Client({ region: env.AWS_REGION }) : null;
const allowedMimeTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/heic", "heic"],
]);

function assertOwnedKey(userId: string, key: string) {
  if (!key.startsWith(`profile-photos/${userId}/`) || key.includes("..")) {
    throw new HttpError(403, "Media key is not valid for this account");
  }
}

function localPath(key: string) {
  if (key.includes("..") || !key.startsWith("profile-photos/")) throw new HttpError(400, "Invalid media key");
  return join(env.MEDIA_LOCAL_DIR, key);
}

export async function createPhotoUpload(userId: string, mimeType: string, sizeBytes: number) {
  const extension = allowedMimeTypes.get(mimeType);
  if (!extension) throw new HttpError(400, "Photo must be JPEG, PNG, WebP, or HEIC");
  if (sizeBytes <= 0 || sizeBytes > 10 * 1024 * 1024) throw new HttpError(400, "Photo must be 10 MB or smaller");
  const storageKey = `profile-photos/${userId}/${randomUUID()}.${extension}`;

  if (s3 && env.MEDIA_BUCKET) {
    const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
      Bucket: env.MEDIA_BUCKET,
      Key: storageKey,
      ContentType: mimeType,
      ContentLength: sizeBytes,
      ServerSideEncryption: "AES256",
      Metadata: { owner: userId },
    }), { expiresIn: 600 });
    return { storageKey, uploadUrl, method: "PUT" as const, headers: { "content-type": mimeType }, expiresInSeconds: 600 };
  }

  return {
    storageKey,
    uploadUrl: `${env.API_PUBLIC_URL.replace(/\/$/, "")}/profile/photos/local-upload?key=${encodeURIComponent(storageKey)}`,
    method: "PUT" as const,
    headers: { "content-type": mimeType },
    expiresInSeconds: 600,
  };
}

export async function storeLocalPhoto(userId: string, key: string, data: Buffer) {
  if (env.MEDIA_BUCKET) throw new HttpError(404, "Route not found");
  assertOwnedKey(userId, key);
  const path = localPath(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "EEXIST") throw new HttpError(409, "Photo was already uploaded");
    throw error;
  });
}

export async function readLocalPhoto(key: string) {
  if (env.MEDIA_BUCKET) throw new HttpError(404, "Route not found");
  return readFile(localPath(key)).catch(() => { throw new HttpError(404, "Photo not found"); });
}

export async function createPhotoReadUrl(key: string) {
  if (!s3 || !env.MEDIA_BUCKET) return null;
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: env.MEDIA_BUCKET, Key: key }), { expiresIn: 900 });
}

export async function verifyPhotoObject(userId: string, key: string, mimeType: string, expectedSize: number) {
  assertOwnedKey(userId, key);
  if (s3 && env.MEDIA_BUCKET) {
    const object = await s3.send(new HeadObjectCommand({ Bucket: env.MEDIA_BUCKET, Key: key })).catch(() => {
      throw new HttpError(400, "Upload the photo before confirming it");
    });
    if (object.ContentLength !== expectedSize || object.ContentType !== mimeType) throw new HttpError(400, "Uploaded photo does not match its confirmation");
    return;
  }
  const object = await stat(localPath(key)).catch(() => { throw new HttpError(400, "Upload the photo before confirming it"); });
  if (object.size !== expectedSize) throw new HttpError(400, "Uploaded photo does not match its confirmation");
}

export async function deletePhotoObject(key: string) {
  if (s3 && env.MEDIA_BUCKET) {
    await s3.send(new DeleteObjectCommand({ Bucket: env.MEDIA_BUCKET, Key: key }));
    return;
  }
  await rm(localPath(key), { force: true });
}
