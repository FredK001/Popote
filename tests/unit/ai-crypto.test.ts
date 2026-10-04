import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/ai/crypto";

const SECRET = randomBytes(32).toString("base64");
const KEY = "oauth-refresh-token-exampleexample-wxyz";

describe("AI token encryption", () => {
  it("round-trips", () => {
    expect(decryptSecret(encryptSecret(KEY, SECRET), SECRET)).toBe(KEY);
  });

  it("never stores the key in clear and uses a fresh IV each time", () => {
    const a = encryptSecret(KEY, SECRET);
    const b = encryptSecret(KEY, SECRET);
    expect(a).not.toContain(KEY);
    expect(a).not.toBe(b);
    expect(a.startsWith("v1:")).toBe(true);
  });

  it("detects tampering", () => {
    const payload = encryptSecret(KEY, SECRET);
    const raw = Buffer.from(payload.slice(3), "base64");
    raw[raw.length - 1] ^= 1;
    expect(() => decryptSecret(`v1:${raw.toString("base64")}`, SECRET)).toThrow();
  });

  it("fails with another server secret", () => {
    const payload = encryptSecret(KEY, SECRET);
    expect(() => decryptSecret(payload, randomBytes(32).toString("base64"))).toThrow();
  });

  it("rejects a badly sized secret", () => {
    expect(() => encryptSecret(KEY, Buffer.from("short").toString("base64"))).toThrow(/32 bytes/);
  });
});
