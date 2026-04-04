// backend/src/services/encryption.ts
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "crypto";

// ─── Constants ─────────────────────────────────────────────────────────────────
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DIGEST = "sha256";
const SALT_PREFIX = "aichat-user-key-v1";

// ─── Master secret ─────────────────────────────────────────────────────────────
function getMasterSecret(): Buffer {
  const secret = process.env.ENCRYPTION_MASTER_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ENCRYPTION_MASTER_SECRET must be set and at least 32 characters. " +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(secret, "hex");
}

// ─── Key Derivation ────────────────────────────────────────────────────────────
export function deriveUserKey(googleId: string): Buffer {
  const masterSecret = getMasterSecret();
  const salt = Buffer.from(`${SALT_PREFIX}:${googleId}`, "utf8");
  return pbkdf2Sync(
    masterSecret,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    PBKDF2_DIGEST
  );
}

// ─── Encryption ────────────────────────────────────────────────────────────────
export function encryptMessage(plaintext: string, userKey: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, userKey, iv);
  const encryptedPart1 = cipher.update(plaintext, "utf8");
  const encryptedPart2 = cipher.final();
  const ciphertext = Buffer.concat([encryptedPart1, encryptedPart2]);
  const authTag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, authTag, ciphertext]);
  return packed.toString("base64");
}

// ─── Decryption ────────────────────────────────────────────────────────────────
export function decryptMessage(encryptedData: string, userKey: Buffer): string {
  let packed: Buffer;

  try {
    packed = Buffer.from(encryptedData, "base64");
  } catch {
    throw new Error("Invalid encrypted data: not valid base64");
  }

  if (packed.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid encrypted data: too short");
  }

  const iv = packed.slice(0, IV_LENGTH);
  const authTag = packed.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.slice(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, userKey, iv);
  decipher.setAuthTag(authTag);

  try {
    const decryptedPart1 = decipher.update(ciphertext);
    const decryptedPart2 = decipher.final();
    return Buffer.concat([decryptedPart1, decryptedPart2]).toString("utf8");
  } catch {
    throw new Error("Decryption failed: data may be tampered or key is incorrect");
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 44) return false;
  return /^[A-Za-z0-9+/]+=*$/.test(value);
}

export function encryptIfNeeded(plaintext: string, userKey: Buffer): string {
  if (isEncrypted(plaintext)) return plaintext;
  return encryptMessage(plaintext, userKey);
}