
## Project Structure

```
AChat/
├── litellm-config.yaml
├── database/
│   └── init.sql
├── backend/
|   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── config.ts
│       ├── database.ts
│       ├── middleware/
│       │   ├── auth.ts
│       │   └── rateLimit.ts
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── chats.ts
│       │   └── messages.ts
│       └── services/
|           ├── encryption.ts
│           └── ai.ts
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── next.config.js
    ├── next-env.d.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env.local
    ├── public/
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── globals.css
        │   └── chat/
        │       └── page.tsx
        ├── components/
        │   ├── LoginButton.tsx
        │   ├── Sidebar.tsx
        │   ├── ChatWindow.tsx
        │   ├── MessageBubble.tsx
        │   ├── MessageInput.tsx
        │   └── LoadingDots.tsx
        ├── contexts/
        │   └── AuthContext.tsx
        ├── hooks/
        │   └── useChat.ts
        └── lib/
            └── api.ts
```

---

## Environment & Infrastructure Files

### `.env`

```env
# ─── Google OAuth ───
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE

# ─── Database ───
POSTGRES_USER=aichat
POSTGRES_PASSWORD=aichatbymayank
POSTGRES_DB=aichat
DATABASE_URL=postgresql://aichat:aichatbymayank@localhost:5432/aichat

# ─── Backend ───
JWT_SECRET=6aa25657d7e64c4ba5bccecaa32b24d6facf4e52d22b407bad2f96a58d9e170a
BACKEND_PORT=4000
FRONTEND_URL=http://localhost:3000
LITELLM_BASE_URL=http://localhost:4001

# ─── LiteLLM ───
LITELLM_MASTER_KEY=sk-litellm-9f8d7c6b5a4xyz

# ─── Ollama ───
OLLAMA_HOST=http://localhost:11434
DEFAULT_MODEL=ollama/llama3.2

# ─── Encryption ─── ADD THIS ───────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_MASTER_SECRET=ba8136e05daec9e549d85c5ec4ab07f4e1c42b9bf5a78d3a460bb58f5b47ed46
```

---

### `litellm-config.yaml`

```yaml
model_list:
  - model_name: ollama/llama3.2
    litellm_params:
      model: ollama/llama3.2
      api_base: http://localhost:11434
      stream: true

  - model_name: ollama/llama3.1
    litellm_params:
      model: ollama/llama3.1
      api_base: http://localhost:11434
      stream: false

  - model_name: ollama/mistral
    litellm_params:
      model: ollama/mistral
      api_base: http://localhost:11434
      stream: false

  - model_name: ollama/gemma2
    litellm_params:
      model: ollama/gemma2
      api_base: http://localhost:11434
      stream: false

litellm_settings:
  drop_params: true
  set_verbose: false
  request_timeout: 300
  num_retries: 2

general_settings:
  master_key: sk-litellm-9f8d7c6b5a4xyz
```

---

### `database/init.sql`

```sql
-- ════════════════════════════════════════════════════════════
-- AI Chat Database Schema
-- ════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ─────────────────────────────────────────────────
CREATE TABLE users (
    user_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id     VARCHAR(255) UNIQUE NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    name          VARCHAR(255) NOT NULL,
    profile_picture TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);

-- ─── Models (reference table) ──────────────────────────────
CREATE TABLE models (
    model_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO models (name) VALUES
    ('ollama/llama3.2'),
    ('ollama/llama3.1'),
    ('ollama/mistral'),
    ('ollama/gemma2');

-- ─── Chats ─────────────────────────────────────────────────
CREATE TABLE chats (
    chat_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    model_id   UUID REFERENCES models(model_id),
    title      VARCHAR(500) NOT NULL DEFAULT 'New Chat',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX idx_chats_user_active ON chats(user_id, is_deleted, updated_at DESC);

-- ─── Messages ──────────────────────────────────────────────
CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id    UUID NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
    content    TEXT NOT NULL,
    model_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at ASC);

-- ─── Updated_at trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---


### `backend/package.json`

```json
{
  "name": "ai-chat-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "express-rate-limit": "^7.4.0",
    "google-auth-library": "^9.14.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "openai": "^4.67.1",
    "pg": "^8.13.0",
    "uuid": "^10.0.0",
    "winston": "^3.14.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.7.4",
    "@types/pg": "^8.11.10",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.1",
    "typescript": "^5.6.2"
  }
}
```

### `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `backend/src/config.ts`

```typescript
import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.BACKEND_PORT || "4000", 10),
  databaseUrl: process.env.DATABASE_URL || "postgresql://aichat:aichat@localhost:5432/aichat",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  litellmBaseUrl: process.env.LITELLM_BASE_URL || "http://litellm:4000",
  litellmMasterKey: process.env.LITELLM_MASTER_KEY || "sk-litellm-master-key-change-me",
  defaultModel: process.env.DEFAULT_MODEL || "ollama/llama3.2",
  jwtExpiresIn: "7d",
  maxMessagesContext: 50,
  systemPrompt:
    "You are an AI assistant. Answer questions clearly without any hesitation.",
};
```

### `backend/src/database.ts`

```typescript
// backend/src/database.ts
import { Pool } from "pg";
import { config } from "./config";
import { deriveUserKey, encryptMessage, decryptMessage } from "./services/encryption";

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

// ─── User queries ──────────────────────────────────────────────────────────────

export interface DbUser {
  user_id: string;
  google_id: string;
  email: string;
  name: string;
  profile_picture: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function findUserByGoogleId(googleId: string): Promise<DbUser | null> {
  const result = await pool.query(
    "SELECT * FROM users WHERE google_id = $1",
    [googleId]
  );
  return result.rows[0] || null;
}

export async function createUser(
  googleId: string,
  email: string,
  name: string,
  profilePicture: string | null
): Promise<DbUser> {
  const result = await pool.query(
    `INSERT INTO users (google_id, email, name, profile_picture)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO UPDATE SET
       email = EXCLUDED.email,
       name = EXCLUDED.name,
       profile_picture = EXCLUDED.profile_picture
     RETURNING *`,
    [googleId, email, name, profilePicture]
  );
  return result.rows[0];
}

// ─── Chat queries ──────────────────────────────────────────────────────────────

export interface DbChat {
  chat_id: string;
  user_id: string;
  model_id: string | null;
  title: string;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function getUserChats(userId: string): Promise<DbChat[]> {
  const result = await pool.query(
    `SELECT * FROM chats
     WHERE user_id = $1 AND is_deleted = FALSE
     ORDER BY updated_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getChatById(
  chatId: string,
  userId: string
): Promise<DbChat | null> {
  const result = await pool.query(
    "SELECT * FROM chats WHERE chat_id = $1 AND user_id = $2 AND is_deleted = FALSE",
    [chatId, userId]
  );
  return result.rows[0] || null;
}

export async function createChat(
  userId: string,
  title?: string
): Promise<DbChat> {
  const result = await pool.query(
    "INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING *",
    [userId, title || "New Chat"]
  );
  return result.rows[0];
}

export async function updateChatTitle(
  chatId: string,
  userId: string,
  title: string
): Promise<DbChat | null> {
  const result = await pool.query(
    `UPDATE chats SET title = $1
     WHERE chat_id = $2 AND user_id = $3 AND is_deleted = FALSE
     RETURNING *`,
    [title, chatId, userId]
  );
  return result.rows[0] || null;
}

export async function softDeleteChat(
  chatId: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    "UPDATE chats SET is_deleted = TRUE WHERE chat_id = $1 AND user_id = $2",
    [chatId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ─── Message queries (WITH ENCRYPTION) ────────────────────────────────────────

export interface DbMessage {
  message_id: string;
  chat_id: string;
  role: "system" | "user" | "assistant";
  content: string;           // Always DECRYPTED when returned from these functions
  model_name: string | null;
  created_at: Date;
}

/**
 * Retrieves all messages for a chat, decrypting content using the user's key.
 *
 * @param chatId   - The chat to fetch messages for
 * @param googleId - The owning user's Google ID (used to derive decryption key)
 */
export async function getChatMessages(
  chatId: string,
  googleId: string        // ← NEW PARAMETER
): Promise<DbMessage[]> {
  const result = await pool.query(
    "SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC",
    [chatId]
  );

  if (result.rows.length === 0) return [];

  // Derive the user's unique decryption key
  const userKey = deriveUserKey(googleId);

  // Decrypt every message
  return result.rows.map((row) => {
    try {
      return {
        ...row,
        content: decryptMessage(row.content, userKey),
      };
    } catch (err) {
      // If decryption fails (e.g., legacy plain-text message), return as-is
      // Remove this fallback after running the migration script
      console.warn(`Failed to decrypt message ${row.message_id}, returning raw`);
      return row;
    }
  });
}

/**
 * Saves a message, encrypting the content with the user's key.
 *
 * @param chatId    - The chat to save to
 * @param role      - 'user' | 'assistant' | 'system'
 * @param content   - Plain text content (will be encrypted before storage)
 * @param googleId  - The owning user's Google ID (used to derive encryption key)
 * @param modelName - Optional model name
 */
export async function createMessage(
  chatId: string,
  role: "system" | "user" | "assistant",
  content: string,
  googleId: string,       // ← NEW PARAMETER
  modelName?: string
): Promise<DbMessage> {
  // Derive the user's unique encryption key
  const userKey = deriveUserKey(googleId);

  // Encrypt the content before storing
  const encryptedContent = encryptMessage(content, userKey);

  const result = await pool.query(
    `INSERT INTO messages (chat_id, role, content, model_name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [chatId, role, encryptedContent, modelName || null]
  );

  // Touch the chat's updated_at
  await pool.query(
    "UPDATE chats SET updated_at = NOW() WHERE chat_id = $1",
    [chatId]
  );

  // Return with DECRYPTED content (so callers always get plain text)
  return {
    ...result.rows[0],
    content, // original plain text
  };
}

// ─── Model queries ─────────────────────────────────────────────────────────────

export async function getAvailableModels(): Promise<
  { model_id: string; name: string }[]
> {
  const result = await pool.query(
    "SELECT model_id, name FROM models ORDER BY name"
  );
  return result.rows;
}
```

### `backend/src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface AuthPayload {
  userId: string;
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
}
```

### `backend/src/middleware/rateLimit.ts`

```typescript
import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." },
});

export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages, please slow down." },
});
```

### `backend/src/services/ai.ts`

```typescript
import OpenAI from "openai";
import { config } from "../config";

const openai = new OpenAI({
  baseURL: config.litellmBaseUrl + "/v1",
  apiKey: config.litellmMasterKey,
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function getAIResponse(
  messages: ChatMessage[],
  model?: string
): Promise<string> {
  const modelName = model || config.defaultModel;

  // Prepend system prompt if not already present
  const fullMessages: ChatMessage[] = [];
  if (messages.length === 0 || messages[0].role !== "system") {
    fullMessages.push({ role: "system", content: config.systemPrompt });
  }
  fullMessages.push(...messages);

  // Trim to max context length
  const trimmed = trimMessages(fullMessages, config.maxMessagesContext);

  try {
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: trimmed,
      temperature: 0.7,
      max_tokens: 4096,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from model");
    }
    return content;
  } catch (error: any) {
    console.error("AI service error:", error.message || error);
    throw new Error(`AI request failed: ${error.message || "Unknown error"}`);
  }
}

export async function getAIResponseStream(
  messages: ChatMessage[],
  model?: string
): Promise<AsyncIterable<string>> {
  const modelName = model || config.defaultModel;

  const fullMessages: ChatMessage[] = [];
  if (messages.length === 0 || messages[0].role !== "system") {
    fullMessages.push({ role: "system", content: config.systemPrompt });
  }
  fullMessages.push(...messages);

  const trimmed = trimMessages(fullMessages, config.maxMessagesContext);

  const stream = await openai.chat.completions.create({
    model: modelName,
    messages: trimmed,
    temperature: 0.7,
    max_tokens: 4096,
    stream: true,
  });

  async function* generateChunks() {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  return generateChunks();
}

function trimMessages(messages: ChatMessage[], maxCount: number): ChatMessage[] {
  if (messages.length <= maxCount) return messages;

  // Keep system message + last (maxCount - 1) messages
  const systemMessages = messages.filter((m) => m.role === "system");
  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  const keep = nonSystemMessages.slice(-(maxCount - systemMessages.length));
  return [...systemMessages, ...keep];
}
```

### `backend/src/routes/encryption.ts`

```typescript
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
```

### `backend/src/routes/auth.ts`

```typescript
import { Router, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { findUserByGoogleId, createUser } from "../database";
import { authLimiter } from "../middleware/rateLimit";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
const googleClient = new OAuth2Client(config.googleClientId);

// POST /api/auth/google
// Body: { credential: string } — the Google ID token from GIS
router.post("/google", authLimiter, async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({ error: "Missing Google credential" });
      return;
    }

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(401).json({ error: "Invalid Google token" });
      return;
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!googleId || !email || !name) {
      res.status(401).json({ error: "Incomplete Google profile data" });
      return;
    }

    // Upsert user
    const user = await createUser(googleId, email, name, picture || null);

    // Create JWT
    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
        name: user.name,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      token,
      user: {
        id: user.user_id,
        email: user.email,
        name: user.name,
        profilePicture: user.profile_picture,
      },
    });
  } catch (error: any) {
    console.error("Auth error:", error.message || error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// GET /api/auth/me — get current user from JWT
router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await findUserByGoogleId(""); // We'll find by userId instead
    // Actually, let's query by user_id from the JWT
    const { Pool } = require("pg");
    const { pool } = require("../database");

    const result = await pool.query("SELECT * FROM users WHERE user_id = $1", [
      req.user.userId,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const dbUser = result.rows[0];
    res.json({
      user: {
        id: dbUser.user_id,
        email: dbUser.email,
        name: dbUser.name,
        profilePicture: dbUser.profile_picture,
      },
    });
  } catch (error: any) {
    console.error("Me endpoint error:", error.message || error);
    res.status(500).json({ error: "Failed to get user info" });
  }
});

export default router;
```

### `backend/src/routes/chats.ts`

```typescript
import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import {
  getUserChats,
  getChatById,
  createChat,
  updateChatTitle,
  softDeleteChat,
} from "../database";

const router = Router();

// All chat routes require auth
router.use(authMiddleware);

// GET /api/chats — list user's chats
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const chats = await getUserChats(req.user!.userId);
    res.json({
      chats: chats.map((c) => ({
        id: c.chat_id,
        title: c.title,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    });
  } catch (error: any) {
    console.error("List chats error:", error.message);
    res.status(500).json({ error: "Failed to list chats" });
  }
});

// POST /api/chats — create a new chat
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body;
    const chat = await createChat(req.user!.userId, title);
    res.status(201).json({
      chat: {
        id: chat.chat_id,
        title: chat.title,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Create chat error:", error.message);
    res.status(500).json({ error: "Failed to create chat" });
  }
});

// GET /api/chats/:chatId — get a specific chat
router.get("/:chatId", async (req: AuthRequest, res: Response) => {
  try {
    const chat = await getChatById(req.params.chatId, req.user!.userId);
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
    res.json({
      chat: {
        id: chat.chat_id,
        title: chat.title,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Get chat error:", error.message);
    res.status(500).json({ error: "Failed to get chat" });
  }
});

// PATCH /api/chats/:chatId — rename a chat
router.patch("/:chatId", async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const chat = await updateChatTitle(req.params.chatId, req.user!.userId, title.trim());
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    res.json({
      chat: {
        id: chat.chat_id,
        title: chat.title,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Update chat error:", error.message);
    res.status(500).json({ error: "Failed to update chat" });
  }
});

// DELETE /api/chats/:chatId — soft delete a chat
router.delete("/:chatId", async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await softDeleteChat(req.params.chatId, req.user!.userId);
    if (!deleted) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete chat error:", error.message);
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

export default router;
```

### `backend/src/routes/messages.ts`

```typescript
// backend/src/routes/messages.ts
import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { messageLimiter } from "../middleware/rateLimit";
import { getChatById, getChatMessages, createMessage } from "../database";
import { getAIResponse, getAIResponseStream, ChatMessage } from "../services/ai";
import { pool } from "../database";

const router = Router();

router.use(authMiddleware);

// ─── Helper: get googleId from userId ─────────────────────────────────────────
/**
 * Fetches the Google ID for a user from the database.
 * The Google ID is the stable identifier we use for key derivation.
 */
async function getGoogleId(userId: string): Promise<string> {
  const result = await pool.query(
    "SELECT google_id FROM users WHERE user_id = $1",
    [userId]
  );
  if (result.rows.length === 0) {
    throw new Error(`User not found: ${userId}`);
  }
  return result.rows[0].google_id;
}

// ─── GET /api/chats/:chatId/messages ──────────────────────────────────────────
router.get("/:chatId/messages", async (req: AuthRequest, res: Response) => {
  try {
    // Verify chat belongs to user
    const chat = await getChatById(req.params.chatId, req.user!.userId);
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    // Get the user's Google ID for key derivation
    const googleId = await getGoogleId(req.user!.userId);

    // Fetch and decrypt messages
    const messages = await getChatMessages(req.params.chatId, googleId);

    res.json({
      messages: messages.map((m) => ({
        id: m.message_id,
        role: m.role,
        content: m.content,       // ← decrypted plain text
        modelName: m.model_name,
        createdAt: m.created_at,
      })),
    });
  } catch (error: any) {
    console.error("List messages error:", error.message);
    res.status(500).json({ error: "Failed to list messages" });
  }
});

// ─── POST /api/chats/:chatId/messages ─────────────────────────────────────────
router.post(
  "/:chatId/messages",
  messageLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { content, model, stream: useStream } = req.body;

      if (!content || typeof content !== "string" || content.trim().length === 0) {
        res.status(400).json({ error: "Message content is required" });
        return;
      }

      // Verify chat belongs to user
      const chat = await getChatById(req.params.chatId, req.user!.userId);
      if (!chat) {
        res.status(404).json({ error: "Chat not found" });
        return;
      }

      // Get Google ID once for this request
      const googleId = await getGoogleId(req.user!.userId);

      // Save user message (encrypted automatically)
      const userMessage = await createMessage(
        req.params.chatId,
        "user",
        content.trim(),
        googleId,      // ← pass googleId
        undefined
      );

      // Get chat history (decrypted automatically) for AI context
      const history = await getChatMessages(req.params.chatId, googleId);
      const contextMessages: ChatMessage[] = history.map((m) => ({
        role: m.role,
        content: m.content,   // ← already decrypted, safe to send to AI
      }));

      // ─── Streaming response ──────────────────────────────────────────────────
      if (useStream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");

        // 1. Force headers to send immediately to open the tunnel
        res.flushHeaders();

        // 2. Keep the connection alive while Ollama is "thinking"
        const keepAlive = setInterval(() => {
          res.write(": ping\n\n"); // Invisible SSE comment
        }, 3000);

        try {
          const stream = await getAIResponseStream(contextMessages, model);
          let fullResponse = "";

          for await (const chunk of stream) {
            // Stop pinging once the AI starts talking
            clearInterval(keepAlive);
            
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          }

          // Save assistant message (encrypted automatically)
          const assistantMessage = await createMessage(
            req.params.chatId,
            "assistant",
            fullResponse,
            googleId,
            model
          );

          // Auto-title on first exchange
          if (history.filter((m) => m.role === "user").length <= 1) {
            await autoTitleChat(req.params.chatId, content.trim());
          }

          res.write(
            `data: ${JSON.stringify({
              done: true,
              messageId: assistantMessage.message_id,
            })}\n\n`
          );
          res.end();
        } catch (aiError: any) {
          clearInterval(keepAlive); // Stop pinging on error
          res.write(
            `data: ${JSON.stringify({
              error: aiError.message || "AI request failed",
            })}\n\n`
          );
          res.end();
        }
        return;
      }

      // ─── Non-streaming response ──────────────────────────────────────────────
      const aiResponse = await getAIResponse(contextMessages, model);

      // Save assistant message (encrypted automatically)
      const assistantMessage = await createMessage(
        req.params.chatId,
        "assistant",
        aiResponse,
        googleId,      // ← pass googleId
        model
      );

      // Auto-title on first exchange
      if (history.filter((m) => m.role === "user").length <= 1) {
        await autoTitleChat(req.params.chatId, content.trim());
      }

      res.json({
        userMessage: {
          id: userMessage.message_id,
          role: userMessage.role,
          content: userMessage.content,    // ← decrypted
          createdAt: userMessage.created_at,
        },
        assistantMessage: {
          id: assistantMessage.message_id,
          role: assistantMessage.role,
          content: assistantMessage.content, // ← decrypted
          modelName: assistantMessage.model_name,
          createdAt: assistantMessage.created_at,
        },
      });
    } catch (error: any) {
      console.error("Send message error:", error.message);
      res.status(500).json({ error: "Failed to process message" });
    }
  }
);

// ─── Auto-title helper ────────────────────────────────────────────────────────
async function autoTitleChat(
  chatId: string,
  firstMessage: string
): Promise<void> {
  try {
    const title =
      firstMessage.length > 60
        ? firstMessage.substring(0, 57) + "..."
        : firstMessage;

    await pool.query(
      "UPDATE chats SET title = $1 WHERE chat_id = $2",
      [title, chatId]
    );
  } catch {
    // Non-critical, ignore
  }
}

export default router;
```

### `backend/src/index.ts`

```typescript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import winston from "winston";
import { config } from "./config";
import { generalLimiter } from "./middleware/rateLimit";
import authRouter from "./routes/auth";
import chatsRouter from "./routes/chats";
import messagesRouter from "./routes/messages";
import { pool, getAvailableModels } from "./database";
import { authMiddleware, AuthRequest } from "./middleware/auth";

// ─── Logger ────────────────────────────────────────────────
export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

// ─── Express App ───────────────────────────────────────────
const app = express();

// Trust the proxy (Ngrok/Next.js) so rate-limiting works correctly
app.set("trust proxy", 1);

// Security
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing
app.use(express.json({ limit: "1mb" }));

// Rate limiting
app.use(generalLimiter);

// ─── Routes ────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/chats", chatsRouter);
app.use("/api/chats", messagesRouter);

// Models endpoint
app.get("/api/models", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const models = await getAvailableModels();
    res.json({ models, default: config.defaultModel });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: "error", message: "Database unreachable" });
  }
});

// ─── Start ─────────────────────────────────────────────────
app.listen(config.port, () => {
  logger.info(`Backend server running on port ${config.port}`);
  logger.info(`Frontend URL: ${config.frontendUrl}`);
  logger.info(`LiteLLM URL: ${config.litellmBaseUrl}`);
  logger.info(`Default model: ${config.defaultModel}`);
});

export default app;
```

---


### `frontend/package.json`

```json
{
  "name": "ai-chat-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@react-oauth/google": "^0.12.1",
    "jwt-decode": "^4.0.0",
    "next": "^16.2.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^9.0.1",
    "react-syntax-highlighter": "^16.1.1"
  },
  "devDependencies": {
    "@types/node": "^22.7.4",
    "@types/react": "^18.3.10",
    "@types/react-dom": "^18.3.0",
    "@types/react-syntax-highlighter": "^15.5.13",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.2"
  }
}

```

### `frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "ignoreDeprecations": "6.0",
    "target": "es5",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": [
        "./src/*"
      ]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}

```

### `frontend/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add this line to stop Next.js from buffering streams!
  compress: false, 
  
  // Read from the environment variable
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGIN ? [process.env.ALLOWED_DEV_ORIGIN] : [],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*'
      }
    ]
  }
};

module.exports = nextConfig;
```

### `frontend/tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0f0f10",
          1: "#1a1a1d",
          2: "#242428",
          3: "#2e2e33",
          4: "#38383f",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.08)",
          strong: "rgba(255,255,255,0.14)",
        },
        accent: {
          DEFAULT: "#7c6af7",
          hover: "#6b59e6",
          muted: "rgba(124,106,247,0.15)",
          glow: "rgba(124,106,247,0.35)",
        },
        text: {
          primary: "#f0f0f2",
          secondary: "#9898a6",
          muted: "#5c5c6b",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        pulse: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.6" },
          "50%": { transform: "scale(1.4)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "60%": { transform: "scale(1.05)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out forwards",
        "slide-in-left": "slide-in-left 0.2s ease-out forwards",
        "slide-in-right": "slide-in-right 0.2s ease-out forwards",
        blink: "blink 1s ease-in-out infinite",
        pulse: "pulse 1.4s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "spin-slow": "spin-slow 2s linear infinite",
        "bounce-in": "bounce-in 0.3s ease-out forwards",
      },
      boxShadow: {
        glow: "0 0 20px rgba(124,106,247,0.25), 0 0 60px rgba(124,106,247,0.1)",
        "glow-sm": "0 0 10px rgba(124,106,247,0.2)",
        card: "0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)",
        "card-hover":
          "0 4px 16px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.3)",
        float: "0 8px 32px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};
```

### `frontend/postcss.config.js`

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### `frontend/src/app/globals.css`

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");

@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  overflow: hidden;
  background-color: #0f0f10;
  color: #f0f0f2;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ─── Scrollbars ─────────────────────────────────── */
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  transition: background 0.2s;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ─── Selection ──────────────────────────────────── */
::selection {
  background: rgba(124, 106, 247, 0.35);
  color: #fff;
}

/* ─── Markdown message content ───────────────────── */
.message-content {
  line-height: 1.75;
  font-size: 0.9375rem;
  color: #e8e8ee;
}

.message-content > *:first-child {
  margin-top: 0;
}

.message-content > *:last-child {
  margin-bottom: 0;
}

.message-content h1,
.message-content h2,
.message-content h3,
.message-content h4 {
  font-weight: 600;
  margin-top: 1.4em;
  margin-bottom: 0.6em;
  color: #f0f0f2;
  letter-spacing: -0.01em;
}

.message-content h1 {
  font-size: 1.4em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.4em;
}

.message-content h2 {
  font-size: 1.2em;
}

.message-content h3 {
  font-size: 1.05em;
}

.message-content p {
  margin-bottom: 0.9em;
}

.message-content ul,
.message-content ol {
  margin-left: 1.4em;
  margin-bottom: 0.9em;
  display: flex;
  flex-direction: column;
  gap: 0.25em;
}

.message-content li {
  padding-left: 0.2em;
}

.message-content ul li::marker {
  color: rgba(124, 106, 247, 0.8);
}

.message-content ol li::marker {
  color: rgba(124, 106, 247, 0.8);
  font-weight: 600;
}

.message-content code:not(pre code) {
  background: rgba(124, 106, 247, 0.12);
  border: 1px solid rgba(124, 106, 247, 0.2);
  color: #c4b8ff;
  padding: 0.15em 0.4em;
  border-radius: 5px;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.85em;
}

.message-content pre {
  margin: 1em 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.message-content blockquote {
  border-left: 3px solid rgba(124, 106, 247, 0.6);
  padding: 0.5em 1em;
  margin: 0.9em 0;
  background: rgba(124, 106, 247, 0.06);
  border-radius: 0 8px 8px 0;
  color: #9898a6;
  font-style: italic;
}

.message-content a {
  color: #a394ff;
  text-decoration: none;
  border-bottom: 1px solid rgba(163, 148, 255, 0.3);
  transition: border-color 0.15s, color 0.15s;
}

.message-content a:hover {
  color: #c4b8ff;
  border-bottom-color: rgba(196, 184, 255, 0.6);
}

.message-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
  font-size: 0.9em;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.message-content th {
  background: rgba(124, 106, 247, 0.12);
  padding: 0.6em 1em;
  text-align: left;
  font-weight: 600;
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #c4b8ff;
}

.message-content td {
  padding: 0.6em 1em;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.message-content tr:nth-child(even) td {
  background: rgba(255, 255, 255, 0.02);
}

.message-content hr {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 1.2em 0;
}

/* ─── Code block header ──────────────────────────── */
.code-block-wrapper {
  position: relative;
}

.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  padding: 0.5em 1em;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.75rem;
  color: #6b6b7e;
}

/* ─── Shimmer loading ────────────────────────────── */
.shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 25%,
    rgba(255, 255, 255, 0.07) 50%,
    rgba(255, 255, 255, 0.03) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 2s linear infinite;
}

/* ─── Typing cursor ──────────────────────────────── */
.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  background: #7c6af7;
  margin-left: 2px;
  vertical-align: text-bottom;
  border-radius: 1px;
  animation: blink 1s ease-in-out infinite;
}

/* ─── Glass panel ────────────────────────────────── */
.glass {
  background: rgba(26, 26, 29, 0.8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

/* ─── Focus ring ─────────────────────────────────── */
.focus-ring:focus-visible {
  outline: 2px solid rgba(124, 106, 247, 0.7);
  outline-offset: 2px;
}
```

### `frontend/src/lib/api.ts`

```typescript
// Change this line:
// const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// To this:
const API_URL = "";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private headers(): HeadersInit {
    const h: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      h["Authorization"] = `Bearer ${this.token}`;
    }
    return h;
  }

  // ─── Auth ─────────────────────────────────────────
  async loginWithGoogle(credential: string) {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
  }

  async getMe() {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Not authenticated");
    return res.json();
  }

  // ─── Chats ────────────────────────────────────────
  async getChats() {
    const res = await fetch(`${API_URL}/api/chats`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Failed to fetch chats");
    return res.json();
  }

  async createChat(title?: string) {
    const res = await fetch(`${API_URL}/api/chats`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to create chat");
    return res.json();
  }

  async updateChat(chatId: string, title: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}`, {
      method: "PATCH",
      headers: this.headers(),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to update chat");
    return res.json();
  }

  async deleteChat(chatId: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Failed to delete chat");
    return res.json();
  }

  // ─── Messages ─────────────────────────────────────
  async getMessages(chatId: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Failed to fetch messages");
    return res.json();
  }

  async sendMessage(chatId: string, content: string, model?: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ content, model, stream: false }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
  }

  async sendMessageStream(
    chatId: string,
    content: string,
    onChunk: (text: string) => void,
    onDone: (messageId: string) => void,
    onError: (error: string) => void,
    model?: string
  ) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ content, model, stream: true }),
    });

    if (!res.ok) {
      onError("Failed to send message");
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              onChunk(data.content);
            } else if (data.done) {
              onDone(data.messageId);
            } else if (data.error) {
              onError(data.error);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    }
  }

  // ─── Models ───────────────────────────────────────
  async getModels() {
    const res = await fetch(`${API_URL}/api/models`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Failed to fetch models");
    return res.json();
  }
}

export const api = new ApiClient();
```

### `frontend/src/contexts/AuthContext.tsx`

```tsx
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  profilePicture: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session
  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    const savedUser = localStorage.getItem("auth_user");

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        api.setToken(savedToken);
      } catch {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (credential: string) => {
    try {
      const data = await api.loginWithGoogle(credential);
      setToken(data.token);
      setUser(data.user);
      api.setToken(data.token);
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    api.setToken(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### `frontend/src/hooks/useChat.ts`

```typescript
"use client";

import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";

export interface ChatItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  modelName?: string;
  createdAt: string;
}

export function useChat() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref so streaming callbacks always see the latest active chat
  const activeChatRef = useRef<ChatItem | null>(null);
  activeChatRef.current = activeChat;

  const fetchChats = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getChats();
      setChats(data.chats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadChat = useCallback(async (chat: ChatItem) => {
    try {
      setActiveChat(chat);
      setIsLoading(true);
      setError(null);
      const data = await api.getMessages(chat.id);
      setMessages(data.messages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createNewChat = useCallback(async (): Promise<ChatItem | null> => {
    try {
      const data = await api.createChat();
      const newChat: ChatItem = data.chat;
      setChats((prev) => [newChat, ...prev]);
      setActiveChat(newChat);
      activeChatRef.current = newChat;
      setMessages([]);
      return newChat;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  // No model param — backend always uses its configured default
  const sendMessage = useCallback(
    async (content: string) => {
      const chat = activeChatRef.current;
      if (!chat || isSending) return;

      setIsSending(true);
      setError(null);

      const tempUserMsg: MessageItem = {
        id: `temp-user-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      const tempAssistantId = `temp-assistant-${Date.now()}`;
      const tempAssistantMsg: MessageItem = {
        id: tempAssistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempAssistantMsg]);

      try {
        await api.sendMessageStream(
          chat.id,
          content,
          // onChunk
          (chunk: string) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId
                  ? { ...m, content: m.content + chunk }
                  : m
              )
            );
          },
          // onDone
          (messageId: string) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId ? { ...m, id: messageId } : m
              )
            );
            fetchChats(); // refresh list so auto-title appears
          },
          // onError
          (errorMsg: string) => {
            setError(errorMsg);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId
                  ? { ...m, content: `⚠️ ${errorMsg}` }
                  : m
              )
            );
          }
          // no model argument — backend uses DEFAULT_MODEL from .env
        );
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, fetchChats]
  );

  const renameChat = useCallback(async (chatId: string, title: string) => {
    try {
      await api.updateChat(chatId, title);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title } : c))
      );
      if (activeChatRef.current?.id === chatId) {
        setActiveChat((prev) => (prev ? { ...prev, title } : null));
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
      await api.deleteChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatRef.current?.id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  return {
    chats,
    activeChat,
    messages,
    isLoading,
    isSending,
    error,
    fetchChats,
    loadChat,
    createNewChat,
    sendMessage,
    renameChat,
    deleteChat,
    setActiveChat,
    setError,
  };
}
```

### `frontend/src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Chat",
  description: "Chat with AI models running locally on your infrastructure.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤖</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <GoogleOAuthProvider
          clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}
        >
          <AuthProvider>{children}</AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
```

### `frontend/src/app/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LoginButton from "@/components/LoginButton";

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "End-to-end encrypted",
    desc: "All data are encrypted. Only you can read your conversations.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Streaming responses",
    desc: "Tokens render in real-time with GPU-accelerated inference.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Persistent history",
    desc: "All conversations saved. Resume any chat from exactly where you left off.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    title: "Multiple domain capabilities",
    desc: "Excels across coding, finance, research, content creation, and real-world problem solving.",
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!loading && user) router.push("/chat");
  }, [user, loading, router]);

  if (loading || !mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center animate-pulse">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <span className="text-text-secondary text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface relative overflow-hidden">
      {/* Ambient background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/3 blur-[150px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 py-16 flex flex-col items-center gap-16">
        {/* Hero */}
        <div className="text-center space-y-6 animate-fade-in">
          {/* Logo */}
          <div className="relative inline-flex">
            <div className="absolute inset-0 rounded-2xl bg-accent/30 blur-xl" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-glow">
              <svg className="w-10 h-10 text-white drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-5xl sm:text-6xl font-bold text-text-primary tracking-tight">
              AI{" "}
              <span className="bg-gradient-to-r from-accent to-blue-400 bg-clip-text text-transparent">
                Chat
              </span>
            </h1>
            <p className="text-text-secondary text-lg max-w-md mx-auto leading-relaxed">
              One AI for everything — code, analyze, create, and solve.
              <br />
              Lightning-fast, secure, and always improving.
            </p>
          </div>

          {/* Login */}
          <div className="pt-2">
            <LoginButton />
          </div>

          <p className="text-text-muted text-xs">
            Sign in with Google · Your data never leaves our server
          </p>
        </div>

        {/* Feature grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="group relative p-5 rounded-2xl bg-surface-1 border border-border hover:border-border-strong transition-all duration-300 hover:shadow-card-hover"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-start gap-4">
                <div className="mt-0.5 p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20 flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <div className="font-semibold text-text-primary mb-1">{f.title}</div>
                  <div className="text-text-secondary text-sm leading-relaxed">{f.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-text-muted text-xs text-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Powered by Ollama · LiteLLM · PostgreSQL
        </p>
      </div>
    </main>
  );
}
```

### `frontend/src/app/chat/page.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/hooks/useChat";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";

export default function ChatPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const chatHook = useChat();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) chatHook.fetchChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">
            Loading workspace…
          </span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex overflow-hidden bg-surface">
      <Sidebar
        chats={chatHook.chats}
        activeChat={chatHook.activeChat}
        onSelectChat={chatHook.loadChat}
        onNewChat={chatHook.createNewChat}
        onRenameChat={chatHook.renameChat}
        onDeleteChat={chatHook.deleteChat}
        user={user}
        onLogout={logout}
      />
      <ChatWindow
        activeChat={chatHook.activeChat}
        messages={chatHook.messages}
        isLoading={chatHook.isLoading}
        isSending={chatHook.isSending}
        error={chatHook.error}
        onSendMessage={chatHook.sendMessage}
        onNewChat={chatHook.createNewChat}
        onDismissError={() => chatHook.setError(null)}
      />
    </div>
  );
}
```

### `frontend/src/components/LoginButton.tsx`

```tsx
"use client";

import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginButton() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setError("No credential received from Google.");
      return;
    }
    try {
      setError(null);
      setLoading(true);
      await login(response.credential);
      router.push("/chat");
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {loading ? (
        <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-surface-2 border border-border text-text-secondary text-sm">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          Signing in…
        </div>
      ) : (
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError("Google sign-in failed.")}
          theme="filled_black"
          size="large"
          shape="pill"
          text="signin_with"
          width="280"
        />
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
```

### `frontend/src/components/Sidebar.tsx`

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ChatItem } from "@/hooks/useChat";

interface SidebarProps {
  chats: ChatItem[];
  activeChat: ChatItem | null;
  onSelectChat: (chat: ChatItem) => void;
  onNewChat: () => void;
  onRenameChat: (chatId: string, title: string) => void;
  onDeleteChat: (chatId: string) => void;
  user: {
    id: string;
    name: string;
    email: string;
    profilePicture: string | null;
  };
  onLogout: () => void;
}

function groupChatsByDate(chats: ChatItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const lastWeek = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, ChatItem[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    Older: [],
  };

  for (const chat of chats) {
    const d = new Date(chat.updatedAt);
    if (d >= today) groups["Today"].push(chat);
    else if (d >= yesterday) groups["Yesterday"].push(chat);
    else if (d >= lastWeek) groups["Last 7 days"].push(chat);
    else groups["Older"].push(chat);
  }

  return groups;
}

interface ChatItemRowProps {
  chat: ChatItem;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

function ChatItemRow({ chat, isActive, onSelect, onRename, onDelete }: ChatItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync title if chat prop changes (e.g., auto-title from AI)
  useEffect(() => {
    if (!editing) setTitle(chat.title);
  }, [chat.title, editing]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const confirmRename = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== chat.title) onRename(trimmed);
    else setTitle(chat.title);
    setEditing(false);
  };

  return (
    <div
      className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
        isActive
          ? "bg-accent/15 text-text-primary border border-accent/25"
          : "text-text-secondary hover:bg-surface-2 hover:text-text-primary border border-transparent"
      }`}
      onClick={() => !editing && onSelect()}
    >
      {/* Icon */}
      <svg
        className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? "text-accent" : "text-text-muted group-hover:text-text-secondary"}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>

      {/* Title / Edit input */}
      {editing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmRename();
            if (e.key === "Escape") { setTitle(chat.title); setEditing(false); }
          }}
          onBlur={confirmRename}
          autoFocus
          className="flex-1 bg-surface-3 text-text-primary text-sm px-2 py-0.5 rounded-md outline-none border border-accent/40 focus:border-accent"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate text-sm">{chat.title}</span>
      )}

      {/* Context menu button */}
      {!editing && (
        <div
          className={`relative transition-opacity ${menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          ref={menuRef}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="p-1 rounded-md hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors"
            title="Options"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-5 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm10 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] bg-surface-2 border border-border-strong rounded-xl shadow-float py-1 animate-bounce-in">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setEditing(true);
                  setTimeout(() => inputRef.current?.select(), 50);
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Rename
              </button>
              <div className="h-px bg-border mx-2 my-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  chats,
  activeChat,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  user,
  onLogout,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filtered = search.trim()
    ? chats.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : chats;

  const grouped = groupChatsByDate(filtered);
  const hasChats = chats.length > 0;

  const handleDelete = (chatId: string) => {
    setDeleteConfirmId(chatId);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteChat(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  // Collapsed sidebar
  if (!isOpen) {
    return (
      <>
        <div className="flex flex-col items-center py-3 px-2 gap-3 bg-surface-1 border-r border-border h-full">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2.5 rounded-xl hover:bg-surface-2 text-text-muted hover:text-text-primary transition-all focus-ring"
            title="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="h-px w-full bg-border" />
          <button
            onClick={onNewChat}
            className="p-2.5 rounded-xl hover:bg-accent/15 text-text-muted hover:text-accent transition-all focus-ring"
            title="New chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Delete confirm modal */}
        {deleteConfirmId && <DeleteModal onConfirm={confirmDelete} onCancel={() => setDeleteConfirmId(null)} />}
      </>
    );
  }

  return (
    <>
      <aside className="w-[272px] min-w-[272px] bg-surface-1 border-r border-border flex flex-col h-full overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <span className="font-semibold text-sm text-text-primary truncate">AI Chat</span>
          </div>

          <button
            onClick={onNewChat}
            className="p-2 rounded-lg hover:bg-accent/15 text-text-muted hover:text-accent transition-all focus-ring"
            title="New chat (Ctrl+N)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-all focus-ring"
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Search */}
        {hasChats && (
          <div className="px-3 pt-2 pb-1">
            <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-3 py-1.5">
              <svg className="w-3.5 h-3.5 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats…"
                className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-text-muted hover:text-text-secondary transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {!hasChats ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center px-4">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
                <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-text-secondary text-sm font-medium">No chats yet</p>
                <p className="text-text-muted text-xs mt-1">Start a conversation below</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              No chats match &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([label, items]) =>
                items.length === 0 ? null : (
                  <div key={label}>
                    <div className="px-3 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {label}
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {items.map((chat) => (
                        <ChatItemRow
                          key={chat.id}
                          chat={chat}
                          isActive={activeChat?.id === chat.id}
                          onSelect={() => onSelectChat(chat)}
                          onRename={(t) => onRenameChat(chat.id, t)}
                          onDelete={() => handleDelete(chat.id)}
                        />
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* User panel */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-2 transition-colors group">
            {user.profilePicture ? (
              <Image
                src={user.profilePicture}
                alt={user.name}
                width={34}
                height={34}
                className="rounded-full ring-2 ring-border"
              />
            ) : (
              <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">{user.name}</div>
              <div className="text-xs text-text-muted truncate">{user.email}</div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all focus-ring"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Delete confirm modal */}
      {deleteConfirmId && (
        <DeleteModal
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </>
  );
}

function DeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface-2 border border-border-strong rounded-2xl shadow-float p-6 max-w-sm w-full animate-bounce-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Delete chat?</h3>
            <p className="text-text-secondary text-sm">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl bg-surface-3 border border-border text-text-secondary hover:text-text-primary hover:bg-surface-4 transition-all text-sm font-medium focus-ring"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all text-sm font-medium shadow-sm focus-ring"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
```

### `frontend/src/components/ChatWindow.tsx`

```tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChatItem, MessageItem } from "@/hooks/useChat";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

interface ChatWindowProps {
  activeChat: ChatItem | null;
  messages: MessageItem[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  onSendMessage: (content: string) => void;
  onNewChat: () => Promise<ChatItem | null>;
  onDismissError: () => void;
}

const SUGGESTIONS = [
  { icon: "💡", text: "Explain quantum computing in simple terms" },
  { icon: "🐍", text: "Write a Python function to parse JSON" },
  { icon: "⚛️", text: "What are React Server Components?" },
  { icon: "🐛", text: "Help me debug a TypeScript type error" },
  { icon: "✍️", text: "Write a concise executive summary template" },
  { icon: "🔒", text: "Best practices for API authentication" },
];

export default function ChatWindow({
  activeChat,
  messages,
  isLoading,
  isSending,
  error,
  onSendMessage,
  onNewChat,
  onDismissError,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    },
    []
  );

  // Auto-scroll when messages stream in
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && isSending) {
      scrollToBottom("smooth");
    } else if (lastMsg?.role === "user") {
      scrollToBottom("smooth");
    }
  }, [messages, isSending, scrollToBottom]);

  // Show scroll-to-bottom button
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handler = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  // Handle suggestion — create chat first, then send
  const handleSuggestion = useCallback(
    async (text: string) => {
      if (isCreating) return;
      setIsCreating(true);
      try {
        const chat = await onNewChat();
        if (chat) {
          setTimeout(() => onSendMessage(text), 80);
        }
      } finally {
        setIsCreating(false);
      }
    },
    [onNewChat, onSendMessage, isCreating]
  );

  const visibleMessages = messages.filter((m) => m.role !== "system");

  // ─── Empty / Welcome state ──────────────────────────────
  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col bg-surface overflow-hidden">
        <div className="flex-1 flex items-center justify-center overflow-y-auto px-4 py-8">
          <div className="w-full max-w-2xl space-y-10 animate-fade-in">
            {/* Welcome header */}
            <div className="text-center space-y-3">
              <div className="relative inline-flex">
                <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-lg" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-glow">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-text-primary">
                How can I help you?
              </h2>
              <p className="text-text-secondary text-sm">
                Start a conversation or pick a suggestion below.
              </p>
            </div>

            {/* Suggestions grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(s.text)}
                  disabled={isCreating}
                  className="group text-left p-4 rounded-2xl bg-surface-1 border border-border hover:border-accent/30 hover:bg-surface-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{s.icon}</span>
                    <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors leading-relaxed">
                      {s.text}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input always visible even on empty state */}
        <MessageInput
          onSend={handleSuggestion}
          disabled={isSending || isCreating}
        />
      </div>
    );
  }

  // ─── Active chat ────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-surface overflow-hidden relative">
      {/* Chat header */}
      <div className="glass border-b border-border px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-text-primary truncate text-sm">
            {activeChat.title}
          </h1>
        </div>
        {isSending && (
          <div className="flex items-center gap-2 text-xs text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full animate-fade-in">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Generating…
          </div>
        )}
      </div>

      {/* Error bar */}
      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 animate-fade-in">
          <div className="flex items-center gap-2 text-red-400 text-sm min-w-0">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="truncate">{error}</span>
          </div>
          <button
            onClick={onDismissError}
            className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0 text-xs underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {isLoading && visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-text-muted text-sm">
                Loading messages…
              </span>
            </div>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-text-muted text-sm">No messages yet.</p>
              <p className="text-text-muted text-xs">
                Send a message below to start.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-1">
            {visibleMessages.map((message, idx) => (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={
                  isSending &&
                  idx === visibleMessages.length - 1 &&
                  message.role === "assistant"
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-28 right-6 z-20 p-2.5 rounded-full bg-surface-2 border border-border-strong shadow-float hover:bg-surface-3 text-text-secondary hover:text-text-primary transition-all animate-fade-in"
          title="Scroll to bottom"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}

      {/* Input */}
      <MessageInput onSend={onSendMessage} disabled={isSending} />
    </div>
  );
}
```

### `frontend/src/components/MessageBubble.tsx`

```tsx
"use client";

import React, { useState, useCallback } from "react";
import { MessageItem } from "@/hooks/useChat";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MessageBubbleProps {
  message: MessageItem;
  isStreaming?: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-150 text-text-muted hover:text-text-primary hover:bg-surface-3"
      title="Copy code"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function CopyMessageButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {/* ignore */}
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-all focus-ring"
      title="Copy message"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

export default function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isEmpty = !message.content;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={`group flex gap-3 py-4 px-2 rounded-2xl transition-colors hover:bg-surface-1/40 ${isUser ? "flex-row-reverse" : "flex-row"} animate-fade-in`}>
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            U
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Bubble content */}
      <div className={`flex flex-col gap-1.5 max-w-[85%] min-w-0 ${isUser ? "items-end" : "items-start"}`}>
        {/* Sender name + time */}
        <div className={`flex items-center gap-2 px-1 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-xs font-semibold text-text-secondary">
            {isUser ? "You" : "AI Assistant"}
          </span>
          <span className="text-xs text-text-muted">
            {formatTime(message.createdAt)}
          </span>
          {message.modelName && !isUser && (
            <span className="text-xs text-text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-full">
              {message.modelName.replace("ollama/", "")}
            </span>
          )}
        </div>

        {/* Message body */}
        <div
          className={`relative rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-accent/20 border border-accent/25 text-text-primary rounded-tr-sm"
              : "bg-surface-1 border border-border text-text-primary rounded-tl-sm"
          }`}
        >
          {isEmpty ? (
            <LoadingThinking />
          ) : isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="message-content">
              <ReactMarkdown
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeStr = String(children).replace(/\n$/, "");
                    const isBlock = codeStr.includes("\n") || match;

                    if (isBlock) {
                      const lang = match?.[1] || "text";
                      return (
                        <div className="code-block-wrapper my-3 rounded-xl overflow-hidden border border-border">
                          <div className="code-block-header">
                            <span className="text-accent/80 font-mono">{lang}</span>
                            <CopyButton text={codeStr} />
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={lang}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              borderRadius: 0,
                              background: "#12121a",
                              fontSize: "0.83rem",
                              lineHeight: "1.6",
                              padding: "1em 1.25em",
                            }}
                            codeTagProps={{ style: { fontFamily: "JetBrains Mono, monospace" } }}
                          >
                            {codeStr}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }

                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && <span className="typing-cursor" aria-hidden />}
            </div>
          )}
        </div>

        {/* Actions row — shown on hover */}
        {!isEmpty && !isStreaming && (
          <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-1 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
            <CopyMessageButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingThinking() {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-text-muted">Thinking…</span>
    </div>
  );
}
```

### `frontend/src/components/MessageInput.tsx`

```tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [input]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [input, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = !!input.trim() && !disabled;

  return (
    <div className="flex-shrink-0 border-t border-border bg-surface/80 backdrop-blur-sm px-4 py-4">
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Main input container */}
        <div className="relative bg-surface-1 border border-border hover:border-border-strong focus-within:border-accent/50 focus-within:shadow-glow-sm rounded-2xl transition-all duration-200">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled
                ? "AI is responding…"
                : "Message AI (Enter to send, Shift+Enter for newline)"
            }
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent text-text-primary placeholder-text-muted text-sm leading-6 outline-none resize-none px-4 pt-3.5 pb-3 max-h-[220px] disabled:cursor-not-allowed"
          />

          {/* Bottom bar */}
          <div className="flex items-center justify-end px-3 pb-2.5">
            {/* Character count hint */}
            {input.length > 500 && (
              <span
                className={`text-xs mr-3 ${
                  input.length > 3000 ? "text-red-400" : "text-text-muted"
                }`}
              >
                {input.length.toLocaleString()}
              </span>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 focus-ring ${
                canSend
                  ? "bg-accent hover:bg-accent-hover text-white shadow-glow-sm"
                  : "bg-surface-3 text-text-muted cursor-not-allowed"
              }`}
              title="Send (Enter)"
            >
              {disabled ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 12h14m-7-7l7 7-7 7"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-text-muted">
          AI can make mistakes · All data stays on your server · Shift+Enter
          for newlines
        </p>
      </div>
    </div>
  );
}
```

### `frontend/src/components/LoadingDots.tsx`

```tsx
"use client";

export default function LoadingDots() {
  return (
    <div className="flex items-center gap-1" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-accent/60 animate-pulse"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}
```