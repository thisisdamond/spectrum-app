import { describe, expect, it } from "vitest";
import { decodeMessageCursor, encodeMessageCursor, messageCursorWhere } from "./conversation.js";

describe("message cursors", () => {
  const cursor = { createdAt: "2026-09-01T20:00:00.000Z", id: "11111111-1111-4111-8111-111111111111" };

  it("round-trips an opaque cursor", () => {
    expect(decodeMessageCursor(encodeMessageCursor(cursor))).toEqual(cursor);
  });

  it("orders same-timestamp messages by id", () => {
    expect(messageCursorWhere(cursor)).toEqual({ OR: [
      { createdAt: { gt: new Date(cursor.createdAt) } },
      { createdAt: new Date(cursor.createdAt), id: { gt: cursor.id } },
    ] });
  });

  it("rejects malformed cursors", () => {
    expect(() => decodeMessageCursor("not-a-cursor")).toThrow("Message cursor is invalid");
  });
});
