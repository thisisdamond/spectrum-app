import { describe, expect, it } from "vitest";
import { decryptSensitiveValue, encryptSensitiveValue } from "./sensitiveData.js";

const secret = "test-safety-secret-that-is-longer-than-thirty-two-characters";

describe("sensitive safety data", () => {
  it("round-trips encrypted content without retaining plaintext", () => {
    const encrypted = encryptSensitiveValue("Jordan · +1 555 0100", secret);
    expect(encrypted).not.toContain("Jordan");
    expect(decryptSensitiveValue(encrypted, secret)).toBe("Jordan · +1 555 0100");
  });

  it("normalizes empty optional values to null", () => {
    expect(encryptSensitiveValue("   ", secret)).toBeNull();
    expect(decryptSensitiveValue(null, secret)).toBeNull();
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSensitiveValue("private note", secret)!;
    const parts = encrypted.split(".");
    const tag = parts[2]!;
    parts[2] = `${tag[0] === "A" ? "B" : "A"}${tag.slice(1)}`;
    expect(() => decryptSensitiveValue(parts.join("."), secret)).toThrow();
  });
});
