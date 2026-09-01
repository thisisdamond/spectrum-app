import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  vi.stubEnv("DATABASE_URL", "postgresql://spectrum:test@localhost:5432/spectrum");
  vi.stubEnv("JWT_ACCESS_SECRET", "access-secret-for-tests-at-least-32-characters");
  vi.stubEnv("JWT_REFRESH_SECRET", "refresh-secret-for-tests-at-least-32-characters");
  vi.stubEnv("TWO_FACTOR_ENCRYPTION_KEY", "two-factor-test-key-at-least-32-characters");
});

describe("authenticator codes", () => {
  it("accepts the current time window and rejects a different code", async () => {
    const { generateTotp, verifyTotp } = await import("./totp.js");
    const secret = "JBSWY3DPEHPK3PXP";
    const timestamp = 1_700_000_000_000;
    const code = generateTotp(secret, timestamp);
    expect(verifyTotp(secret, code, timestamp)).toBe(true);
    expect(verifyTotp(secret, code === "000000" ? "000001" : "000000", timestamp)).toBe(false);
  });

  it("encrypts authenticator secrets at rest", async () => {
    const { decryptTotpSecret, encryptTotpSecret } = await import("./totp.js");
    const encrypted = encryptTotpSecret("JBSWY3DPEHPK3PXP");
    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptTotpSecret(encrypted)).toBe("JBSWY3DPEHPK3PXP");
  });
});
