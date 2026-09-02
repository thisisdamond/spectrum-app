import { z } from "zod";
import { HttpError } from "../lib/httpError.js";

const cursorSchema = z.object({ createdAt: z.iso.datetime(), id: z.uuid() });
export type MessageCursor = z.infer<typeof cursorSchema>;

export function encodeMessageCursor(cursor: MessageCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeMessageCursor(value?: string) {
  if (!value) return null;
  try { return cursorSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8"))); }
  catch { throw new HttpError(400, "Message cursor is invalid"); }
}

export function messageCursorWhere(cursor: MessageCursor | null) {
  if (!cursor) return {};
  const createdAt = new Date(cursor.createdAt);
  return { OR: [{ createdAt: { gt: createdAt } }, { createdAt, id: { gt: cursor.id } }] };
}
