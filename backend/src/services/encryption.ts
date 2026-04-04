import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "crypto";

// ─── Constants ─────────────────────────────────────────────────────────────────
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;        // 128-bit IV for AES-GCM
const TAG_LENGTH = 16;       // 128-bit authentication tag
const KEY_LENGTH = 32;       // 256-bit key for AES-256
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DIGEST = "sha256";
const SALT_PREFIX = "aichat-user-key-v1"; // version prefix for future key rotation

// ─── Master secret (from environment) ─────────────────────────────────────────
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
/**
 * Derives a unique 256-bit AES key for a specific user.
 *
 * The key is derived from:
 *   - The user's Google ID (unique per user, never changes)
 *   - The server's ENCRYPTION_MASTER_SECRET (secret, never stored in DB)
 *
 * This means:
 *   - Each user gets a completely different key
 *   - Without the master secret, you cannot derive any user's key
 *   - The server cannot decrypt messages without the master secret
 *
 * @param googleId - The user's stable Google ID (sub claim)
 * @returns 32-byte Buffer to use as AES-256 key
 */
export function deriveUserKey(googleId: string): Buffer {
  const masterSecret = getMasterSecret();

  // Salt = prefix + googleId (deterministic, unique per user)
  const salt = Buffer.from(`${SALT_PREFIX}:${googleId}`, "utf8");

  return pbkdf2Sync(
    masterSecret,          // password (master secret)
    salt,                  // salt (user-specific)
    PBKDF2_ITERATIONS,     // iterations (slow = hard to brute force)
    KEY_LENGTH,            // output key length
    PBKDF2_DIGEST          // hash algorithm
  );
}

// ─── Encryption ────────────────────────────────────────────────────────────────
/**
 * Encrypts a plaintext message using AES-256-GCM.
 *
 * Output format (all concatenated, then base64 encoded):
 *   [ IV (16 bytes) ][ AuthTag (16 bytes) ][ Ciphertext (variable) ]
 *
 * The format is self-contained — everything needed to decrypt is in the string.
 *
 * @param plaintext - The message to encrypt
 * @param userKey   - 32-byte key derived from deriveUserKey()
 * @returns base64-encoded encrypted string
 */
export function encryptMessage(plaintext: string, userKey: Buffer): string {
  // Random IV — NEVER reuse an IV with the same key
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, userKey, iv);

  // Encrypt
  const encryptedPart1 = cipher.update(plaintext, "utf8");
  const encryptedPart2 = cipher.final();
  const ciphertext = Buffer.concat([encryptedPart1, encryptedPart2]);

  // Get the GCM authentication tag (detects tampering)
  const authTag = cipher.getAuthTag();

  // Pack: IV + AuthTag + Ciphertext → base64
  const packed = Buffer.concat([iv, authTag, ciphertext]);
  return packed.toString("base64");
}

// ─── Decryption ────────────────────────────────────────────────────────────────
/**
 * Decrypts a message encrypted with encryptMessage().
 *
 * @param encryptedData - base64 string from encryptMessage()
 * @param userKey       - same 32-byte key used for encryption
 * @returns decrypted plaintext string
 * @throws if data is tampered, corrupted, or wrong key is used
 */
export function decryptMessage(encryptedData: string, userKey: Buffer): string {
  let packed: Buffer;

  try {
    packed = Buffer.from(encryptedData, "base64");
  } catch {
    throw new Error("Invalid encrypted data: not valid base64");
  }

  // Minimum size check: IV + Tag must be present
  if (packed.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid encrypted data: too short");
  }

  // Unpack
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
    // GCM auth tag mismatch = data was tampered or wrong key
    throw new Error("Decryption failed: data may be tampered or key is incorrect");
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Checks if a string looks like an encrypted message (base64, minimum length).
 * Used to safely handle mixed legacy/encrypted data during migrations.
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 44) return false; // min base64 for IV+Tag
  // Valid base64 pattern
  return /^[A-Za-z0-9+/]+=*$/.test(value);
}

/**
 * Encrypts text only if it isn't already encrypted.
 * Useful during migration of existing plain-text messages.
 */
export function encryptIfNeeded(plaintext: string, userKey: Buffer): string {
  if (isEncrypted(plaintext)) return plaintext;
  return encryptMessage(plaintext, userKey);
}