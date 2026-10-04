/** Encryption at rest for users' AI connection tokens (ChatGPT OAuth, phase 3). */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function loadKey(secret: string | undefined): Buffer {
  if (!secret) throw new Error("Missing AI_TOKENS_ENCRYPTION_KEY. See .env.example.");
  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) throw new Error("AI_TOKENS_ENCRYPTION_KEY must be 32 bytes, base64-encoded.");
  return key;
}

/** AES-256-GCM. Output: "v1:" + base64(iv | tag | ciphertext). */
export function encryptSecret(plain: string, secret = process.env.AI_TOKENS_ENCRYPTION_KEY): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", loadKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${VERSION}:${Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64")}`;
}

/** Throws if the payload was tampered with or the server secret changed. */
export function decryptSecret(payload: string, secret = process.env.AI_TOKENS_ENCRYPTION_KEY): string {
  const [version, data] = payload.split(":", 2);
  if (version !== VERSION || !data) throw new Error("Unknown encrypted payload format");
  const raw = Buffer.from(data, "base64");
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", loadKey(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

