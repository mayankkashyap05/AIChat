
## Project Structure

```
AIChat/
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
// backend/src/config.ts
import dotenv from "dotenv";
import type { SignOptions } from "jsonwebtoken";

dotenv.config();

export const config = {
  port:             parseInt(process.env.BACKEND_PORT || "4000", 10),
  databaseUrl:      process.env.DATABASE_URL || "postgresql://aichat:aichat@localhost:5432/aichat",
  googleClientId:   process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  jwtSecret:        process.env.JWT_SECRET || "dev-secret-change-me",
  frontendUrl:      process.env.FRONTEND_URL || "http://localhost:3000",
  litellmBaseUrl:   process.env.LITELLM_BASE_URL || "http://litellm:4000",
  litellmMasterKey: process.env.LITELLM_MASTER_KEY || "sk-litellm-master-key-change-me",
  defaultModel:     process.env.DEFAULT_MODEL || "ollama/llama3.2",
  jwtExpiresIn:     "7d" as SignOptions["expiresIn"],   // ← typed correctly
  maxMessagesContext: 50,
  systemPrompt:
    "You are an AI assistant. Answer questions clearly without any hesitation.",
};
```

### `backend/src/database.ts`

```typescript
// backend/src/database.ts
import { Pool, PoolClient } from "pg";
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
  content: string;
  model_name: string | null;
  created_at: Date;
}

export async function getChatMessages(
  chatId: string,
  googleId: string
): Promise<DbMessage[]> {
  const result = await pool.query(
    "SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC",
    [chatId]
  );

  if (result.rows.length === 0) return [];

  const userKey = deriveUserKey(googleId);

  return result.rows.map((row) => {
    // Only attempt decryption if the value looks like a valid encrypted blob.
    // Plain-text legacy messages are short or contain characters not in base64.
    const looksEncrypted =
      row.content &&
      row.content.length >= 44 &&
      /^[A-Za-z0-9+/]+=*$/.test(row.content);

    if (!looksEncrypted) {
      // Legacy plain-text message — return as-is
      return row as DbMessage;
    }

    try {
      return {
        ...row,
        content: decryptMessage(row.content, userKey),
      } as DbMessage;
    } catch (err) {
      // Decryption failed on something that looked encrypted.
      // Log with message_id so it can be investigated, but do NOT
      // return raw ciphertext — return a safe placeholder instead.
      console.error(
        `Decryption failed for message ${row.message_id}:`,
        (err as Error).message
      );
      return {
        ...row,
        content: "[Message could not be decrypted]",
      } as DbMessage;
    }
  });
}

export async function createMessage(
  chatId: string,
  role: "system" | "user" | "assistant",
  content: string,
  googleId: string,
  modelName?: string
): Promise<DbMessage> {
  const userKey = deriveUserKey(googleId);
  const encryptedContent = encryptMessage(content, userKey);

  // Use a transaction so the message insert and chat timestamp update
  // are atomic — if either fails, neither is committed.
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO messages (chat_id, role, content, model_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [chatId, role, encryptedContent, modelName || null]
    );

    // Touch the chat's updated_at so sidebar ordering stays current.
    // The trigger on chats fires on UPDATE and also sets updated_at = NOW(),
    // but explicitly setting it here is harmless and makes intent clear.
    await client.query(
      "UPDATE chats SET updated_at = NOW() WHERE chat_id = $1",
      [chatId]
    );

    await client.query("COMMIT");

    return {
      ...result.rows[0],
      content, // return original plain text to callers
    } as DbMessage;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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
```

### `backend/src/routes/auth.ts`

```typescript
// backend/src/routes/auth.ts
import { Router, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { findUserByGoogleId, createUser, pool } from "../database";
import { authLimiter } from "../middleware/rateLimit";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
const googleClient = new OAuth2Client(config.googleClientId);

// POST /api/auth/google
router.post("/google", authLimiter, async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({ error: "Missing Google credential" });
      return;
    }

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

    const user = await createUser(googleId, email, name, picture || null);

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

// GET /api/auth/me
router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Use the already-imported pool directly — no dynamic require needed
    const result = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [req.user.userId]
    );

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
    "target": "ES2017",
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
    screens: {
      xs:    "360px",
      sm:    "480px",
      md:    "768px",
      lg:    "1024px",
      xl:    "1280px",
      "2xl": "1536px",
    },
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
          strong:  "rgba(255,255,255,0.14)",
        },
        accent: {
          DEFAULT: "#7c6af7",
          hover:   "#6b59e6",
          muted:   "rgba(124,106,247,0.15)",
          glow:    "rgba(124,106,247,0.35)",
        },
        text: {
          primary:   "#f0f0f2",
          secondary: "#9898a6",
          muted:     "#5c5c6b",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-14px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(14px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0" },
        },
        pulse: {
          "0%, 100%": { transform: "scale(1)",   opacity: "0.6" },
          "50%":       { transform: "scale(1.4)", opacity: "1"   },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "bounce-in": {
          "0%":   { transform: "scale(0.85)", opacity: "0" },
          "60%":  { transform: "scale(1.04)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in":        "fade-in 0.2s ease-out forwards",
        "slide-in-left":  "slide-in-left 0.2s ease-out forwards",
        "slide-in-right": "slide-in-right 0.2s ease-out forwards",
        blink:            "blink 1s ease-in-out infinite",
        pulse:            "pulse 1.4s ease-in-out infinite",
        shimmer:          "shimmer 2s linear infinite",
        "spin-slow":      "spin-slow 2s linear infinite",
        "bounce-in":      "bounce-in 0.3s ease-out forwards",
      },
      boxShadow: {
        glow:         "0 0 20px rgba(124,106,247,0.25), 0 0 60px rgba(124,106,247,0.1)",
        "glow-sm":    "0 0 10px rgba(124,106,247,0.2)",
        card:         "0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.3)",
        float:        "0 8px 32px rgba(0,0,0,0.6)",
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
ALLOWED_DEV_ORIGIN=unreversible-helga-supermilitary.ngrok-free.dev
```

### `frontend/src/app/globals.css`

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ─── Reset ──────────────────────────────────────── */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ─── Root sizing ────────────────────────────────── */
html {
  height: 100%;
  height: -webkit-fill-available;
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

/*
 * Body has two modes:
 *  • Login page  → needs overflow-y: auto so the page can scroll on
 *                  short / landscape screens.
 *  • Chat page   → the .chat-layout container locks overflow itself;
 *                  body scroll is irrelevant there.
 *
 * We set overflow-x: hidden always (nothing should spill sideways)
 * and overflow-y: auto so the login page works on every device.
 * The chat page is self-contained inside .chat-layout which sets
 * its own overflow: hidden.
 */
body {
  min-height: 100%;
  min-height: -webkit-fill-available;
  overflow-x: hidden;
  overflow-y: auto;
  background-color: #0f0f10;
  color: #f0f0f2;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/*
 * #__next must stretch to fill the viewport so the login page
 * background covers the screen even when content is shorter than
 * the viewport height.  height: auto + min-height lets it grow
 * beyond the viewport when content is taller (login page on small
 * screens) while still filling the viewport when shorter (chat page).
 */
#__next {
  min-height: 100%;
  min-height: -webkit-fill-available;
  height: auto;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

/* ─── Scrollbars ─────────────────────────────────── */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ─── Selection ──────────────────────────────────── */
::selection {
  background: rgba(124, 106, 247, 0.35);
  color: #fff;
}

/* ─── Tap highlight & touch ──────────────────────── */
* {
  -webkit-tap-highlight-color: transparent;
}
button,
[role="button"] {
  touch-action: manipulation;
  cursor: pointer;
}

/* ─── Markdown content ───────────────────────────── */
.message-content {
  line-height: 1.75;
  font-size: clamp(0.8125rem, 2.2vw, 0.9375rem);
  color: #e8e8ee;
  overflow-wrap: break-word;
  word-break: break-word;
  min-width: 0;
  max-width: 100%;
}

.message-content > *:first-child { margin-top: 0; }
.message-content > *:last-child  { margin-bottom: 0; }

.message-content h1,
.message-content h2,
.message-content h3,
.message-content h4 {
  font-weight: 600;
  margin-top: 1.4em;
  margin-bottom: 0.6em;
  color: #f0f0f2;
  letter-spacing: -0.01em;
  overflow-wrap: break-word;
  word-break: break-word;
}
.message-content h1 {
  font-size: clamp(1.1em, 3vw, 1.4em);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.4em;
}
.message-content h2 { font-size: clamp(1em, 2.5vw, 1.2em); }
.message-content h3 { font-size: clamp(0.95em, 2vw, 1.05em); }

.message-content p {
  margin-bottom: 0.9em;
  overflow-wrap: break-word;
  word-break: break-word;
}

.message-content ul,
.message-content ol {
  margin-left: clamp(1em, 3vw, 1.4em);
  margin-bottom: 0.9em;
  display: flex;
  flex-direction: column;
  gap: 0.25em;
}
.message-content li {
  padding-left: 0.2em;
  overflow-wrap: break-word;
  word-break: break-word;
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
  overflow-wrap: break-word;
  word-break: break-all;
}

.message-content pre {
  margin: 0.8em 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  max-width: 100%;
}

.message-content blockquote {
  border-left: 3px solid rgba(124, 106, 247, 0.6);
  padding: 0.5em 0.75em;
  margin: 0.9em 0;
  background: rgba(124, 106, 247, 0.06);
  border-radius: 0 8px 8px 0;
  color: #9898a6;
  font-style: italic;
  overflow-wrap: break-word;
  word-break: break-word;
}

.message-content a {
  color: #a394ff;
  text-decoration: none;
  border-bottom: 1px solid rgba(163, 148, 255, 0.3);
  transition: border-color 0.15s, color 0.15s;
  overflow-wrap: break-word;
  word-break: break-all;
}
.message-content a:hover {
  color: #c4b8ff;
  border-bottom-color: rgba(196, 184, 255, 0.6);
}

.message-content .table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 1em 0;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.message-content table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9em;
}
.message-content th {
  background: rgba(124, 106, 247, 0.12);
  padding: 0.5em 0.8em;
  text-align: left;
  font-weight: 600;
  font-size: 0.82em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #c4b8ff;
  white-space: nowrap;
}
.message-content td {
  padding: 0.5em 0.8em;
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

/* ─── Code block ─────────────────────────────────── */
.code-block-wrapper {
  position: relative;
  max-width: 100%;
  overflow: hidden;
  border-radius: 10px;
}
.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  padding: 0.4em 0.75em;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.72rem;
  color: #6b6b7e;
}
.code-block-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
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

/* ─── Glass ──────────────────────────────────────── */
.glass {
  background: rgba(26, 26, 29, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

/* ─── Focus ring ─────────────────────────────────── */
.focus-ring:focus-visible {
  outline: 2px solid rgba(124, 106, 247, 0.7);
  outline-offset: 2px;
}

/* ─── Shimmer ─────────────────────────────────────── */
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

/* ─── Sidebar overlay ────────────────────────────── */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  animation: fade-in 0.18s ease-out forwards;
}

/* ─── Sidebar drawer ─────────────────────────────── */
.sidebar-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 50;
  width: min(280px, 85vw);
  transform: translateX(-100%);
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}
.sidebar-drawer.open {
  transform: translateX(0);
}

/* ─── Chat layout root ───────────────────────────── */
/*
 * The chat page lives entirely inside .chat-layout.
 * We lock it to the full viewport so nothing outside it scrolls.
 * 100dvh uses the "dynamic" viewport height on mobile browsers
 * (excludes the address-bar chrome) and falls back to 100vh.
 */
.chat-layout {
  display: flex;
  width: 100%;
  /* dvh is supported in all modern browsers; 100vh is the safe fallback */
  height: 100vh;
  height: 100dvh;
  max-height: 100vh;
  max-height: 100dvh;
  overflow: hidden;
  position: relative;
}

/* ─── Messages scroll container ─────────────────── */
/*
 * Critical: this is the ONLY element that scrolls vertically inside
 * the chat layout.
 *  - overflow-y: auto                → hide bar when not needed
 *  - -webkit-overflow-scrolling: touch → iOS momentum / inertia
 *  - overscroll-behavior-y: contain  → no scroll chaining to body
 *  - touch-action: pan-y             → allow vertical finger pan
 *  - min-height: 0                   → flex child must shrink past content
 *  - flex: 1 1 0%                    → take all remaining vertical space
 */
.messages-scroll {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  touch-action: pan-y;
  min-height: 0;
  flex: 1 1 0%;
}

/* ─── Messages inner list ────────────────────────── */
.messages-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: min(768px, 100%);
  margin: 0 auto;
  padding: clamp(0.75rem, 2vw, 1.5rem) clamp(0.5rem, 2vw, 1rem);
  min-height: 100%;
}

/* ─── Input wrapper ──────────────────────────────── */
.input-wrapper {
  flex-shrink: 0;
  width: 100%;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 15, 16, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: clamp(0.6rem, 1.5vw, 0.875rem) clamp(0.5rem, 2vw, 1rem);
  padding-bottom: calc(
    clamp(0.6rem, 1.5vw, 0.875rem) + env(safe-area-inset-bottom, 0px)
  );
}

.input-inner {
  width: 100%;
  max-width: min(768px, 100%);
  margin: 0 auto;
}

/* ─── Textarea container ─────────────────────────── */
.textarea-container {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #1a1a1d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  min-height: 52px;
}
.textarea-container:hover {
  border-color: rgba(255, 255, 255, 0.14);
}
.textarea-container:focus-within {
  border-color: rgba(124, 106, 247, 0.5);
  box-shadow: 0 0 0 3px rgba(124, 106, 247, 0.1),
              0 0 12px rgba(124, 106, 247, 0.08);
}
.textarea-container.disabled {
  opacity: 0.65;
  pointer-events: none;
}

/* ─── Chat textarea ──────────────────────────────── */
.chat-textarea {
  flex: 1;
  width: 100%;
  background: transparent;
  color: #f0f0f2;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
  /* ≥ 16px prevents iOS auto-zoom on focus */
  font-size: max(16px, clamp(0.875rem, 2.5vw, 0.9375rem));
  line-height: 1.6;
  outline: none;
  resize: none;
  border: none;
  padding: 0.8rem 1rem 0 1rem;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  touch-action: auto;
}
.chat-textarea::placeholder {
  color: #5c5c6b;
}
.chat-textarea:disabled {
  cursor: not-allowed;
  color: #5c5c6b;
}

/* ─── Input bottom bar ───────────────────────────── */
.input-bottom-bar {
  display: flex;
  align-items: center;
  padding: 0.35rem 0.625rem 0.55rem 1rem;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* ─── Send button ────────────────────────────────── */
.send-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  outline: none;
  transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
  touch-action: manipulation;
  cursor: pointer;
}
.send-btn.active {
  background: #7c6af7;
  color: #fff;
  box-shadow: 0 0 12px rgba(124, 106, 247, 0.35);
}
.send-btn.active:hover {
  background: #6b59e6;
  transform: scale(1.05);
}
.send-btn.active:active {
  transform: scale(0.95);
}
.send-btn.inactive {
  background: #2e2e33;
  color: #5c5c6b;
  cursor: not-allowed;
}

/* ─── Disclaimer ─────────────────────────────────── */
.input-disclaimer {
  text-align: center;
  font-size: clamp(0.6rem, 1.5vw, 0.65rem);
  color: #5c5c6b;
  margin-top: 0.35rem;
  line-height: 1.4;
  user-select: none;
}

/* ─── Login page — safe-area bottom padding ──────── */
/*
 * The login <main> uses overflow-y: auto (set inline in page.tsx).
 * On devices with a home indicator (iPhone X+) we need to ensure
 * the last piece of content is not hidden behind it.
 */
.login-safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* ─── Landscape / very short viewport ───────────────
 * On phones rotated to landscape the viewport height can drop to
 * ~320–380 px.  Reduce vertical gaps so the hero + login button
 * remain fully visible without scrolling when possible.
 * ──────────────────────────────────────────────────── */
@media (max-height: 480px) {
  /*
   * Tighten the spacing inside the hero section.
   * These selectors target the inline-style gap values set in
   * page.tsx via the style prop; we override with !important so
   * the media query wins over the inline style.
   */
  .login-hero > .login-logo {
    width: clamp(40px, 8vw, 56px)  !important;
    height: clamp(40px, 8vw, 56px) !important;
  }
}

/* ─── Ultra-narrow screens (< 360 px wide) ──────────
 * Prevent horizontal overflow on very old / small handsets.
 * ──────────────────────────────────────────────────── */
@media (max-width: 359px) {
  /*
   * Scale down the Google sign-in button container slightly so it
   * never bleeds off the right edge on 320-px screens.
   */
  .google-btn-wrapper {
    transform: scale(0.88);
    transform-origin: center top;
  }

  /* Shrink feature card text a touch more */
  .feature-card-title {
    font-size: 0.7rem !important;
  }
  .feature-card-desc {
    font-size: 0.625rem !important;
  }
}

/* ─── Keyframes ──────────────────────────────────── */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slide-in-left {
  from { opacity: 0; transform: translateX(-14px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(14px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
@keyframes pulse-dot {
  0%, 100% { transform: scale(1);   opacity: 0.6; }
  50%       { transform: scale(1.4); opacity: 1;   }
}
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes bounce-in {
  0%   { transform: scale(0.85); opacity: 0; }
  60%  { transform: scale(1.04); opacity: 1; }
  100% { transform: scale(1); }
}
@keyframes modal-pop {
  0% {
    opacity:   0;
    transform: scale(0.88) translateY(8px);
  }
  60% {
    opacity:   1;
    transform: scale(1.02) translateY(-2px);
  }
  100% {
    opacity:   1;
    transform: scale(1) translateY(0);
  }
}
```

### `frontend/src/lib/api.ts`

```typescript
const API_URL = "";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) { this.token = token; }
  getToken(): string | null      { return this.token; }

  private headers(): HeadersInit {
    const h: HeadersInit = { "Content-Type": "application/json" };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }

  /* ── Auth ───────────────────────────────────────── */
  async loginWithGoogle(credential: string) {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ credential }),
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

  /* ── Chats ──────────────────────────────────────── */
  async getChats() {
    const res = await fetch(`${API_URL}/api/chats`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Failed to fetch chats");
    return res.json();
  }

  async createChat(title?: string) {
    const res = await fetch(`${API_URL}/api/chats`, {
      method:  "POST",
      headers: this.headers(),
      body:    JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to create chat");
    return res.json();
  }

  async updateChat(chatId: string, title: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}`, {
      method:  "PATCH",
      headers: this.headers(),
      body:    JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to update chat");
    return res.json();
  }

  async deleteChat(chatId: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}`, {
      method:  "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Failed to delete chat");
    return res.json();
  }

  /* ── Messages ───────────────────────────────────── */
  async getMessages(chatId: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error("Failed to fetch messages");
    return res.json();
  }

  async sendMessage(chatId: string, content: string, model?: string) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method:  "POST",
      headers: this.headers(),
      body:    JSON.stringify({ content, model, stream: false }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
  }

  async sendMessageStream(
    chatId: string,
    content: string,
    onChunk: (text: string) => void,
    onDone:  (messageId: string) => void,
    onError: (error: string) => void,
    model?: string
  ) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method:  "POST",
      headers: this.headers(),
      body:    JSON.stringify({ content, model, stream: true }),
    });

    if (!res.ok) { onError("Failed to send message"); return; }

    const reader = res.body?.getReader();
    if (!reader)  { onError("No response body");      return; }

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
            if (data.content)    onChunk(data.content);
            else if (data.done)  onDone(data.messageId);
            else if (data.error) onError(data.error);
          } catch { /* skip malformed */ }
        }
      }
    }
  }

  /* ── Models ─────────────────────────────────────── */
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

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
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
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* Restore session from localStorage */
  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    const savedUser  = localStorage.getItem("auth_user");
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
    const data = await api.loginWithGoogle(credential);
    setToken(data.token);
    setUser(data.user);
    api.setToken(data.token);
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
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
  const [chats,      setChats]      = useState<ChatItem[]>([]);
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [messages,   setMessages]   = useState<MessageItem[]>([]);
  const [isLoading,  setIsLoading]  = useState(false);
  const [isSending,  setIsSending]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

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
      const data    = await api.createChat();
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

  const sendMessage = useCallback(
    async (content: string) => {
      const chat = activeChatRef.current;
      if (!chat || isSending) return;

      setIsSending(true);
      setError(null);

      const tempUserMsg: MessageItem = {
        id:        `temp-user-${Date.now()}`,
        role:      "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      const tempAssistantId = `temp-assistant-${Date.now()}`;
      const tempAssistantMsg: MessageItem = {
        id:        tempAssistantId,
        role:      "assistant",
        content:   "",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempAssistantMsg]);

      try {
        await api.sendMessageStream(
          chat.id,
          content,
          /* onChunk */
          (chunk: string) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId
                  ? { ...m, content: m.content + chunk }
                  : m
              )
            );
          },
          /* onDone */
          (messageId: string) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId ? { ...m, id: messageId } : m
              )
            );
            fetchChats();
          },
          /* onError */
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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <meta name="theme-color" content="#0f0f10" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="mobile-web-app-capable" content="yes" />
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
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "End-to-end encrypted",
    desc: "All data are encrypted. Only you can read your conversations.",
  },
  {
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Streaming responses",
    desc: "Tokens render in real-time with GPU-accelerated inference.",
  },
  {
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "Persistent history",
    desc: "All conversations saved. Resume any chat from exactly where you left off.",
  },
  {
    icon: (
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="h-screen w-screen flex items-center justify-center bg-surface">
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
    <main
      className="w-full flex flex-col items-center justify-start bg-surface relative"
      style={{
        minHeight: "100dvh",
        overflowX: "hidden",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      } as React.CSSProperties}
    >
      {/* Ambient blobs — clipped so they never cause horizontal scroll */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute rounded-full bg-accent/5 blur-[80px]"
          style={{
            width:  "clamp(160px, 45vw, 500px)",
            height: "clamp(160px, 45vw, 500px)",
            top:    "-10%",
            left:   "-8%",
          }}
        />
        <div
          className="absolute rounded-full bg-blue-500/5 blur-[80px]"
          style={{
            width:  "clamp(140px, 40vw, 420px)",
            height: "clamp(140px, 40vw, 420px)",
            bottom: "-10%",
            right:  "-8%",
          }}
        />
      </div>

      {/* Grid overlay — fixed so it covers viewport regardless of scroll */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.018]"
        aria-hidden
        style={{
          zIndex: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "clamp(28px, 4.5vw, 48px) clamp(28px, 4.5vw, 48px)",
        }}
      />

      {/* Content — always above the decorative layers */}
      <div
        className="relative w-full flex flex-col items-center"
        style={{
          zIndex: 1,
          maxWidth: "768px",
          margin: "0 auto",
          padding:
            "clamp(1.5rem, 5vh, 4rem) clamp(1rem, 4vw, 2rem) clamp(1.5rem, 5vh, 3rem)",
          gap: "clamp(1.75rem, 5vh, 3rem)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div
          className="w-full text-center flex flex-col items-center animate-fade-in"
          style={{ gap: "clamp(0.875rem, 2.5vh, 1.5rem)" }}
        >
          {/* Logo mark */}
          <div className="relative inline-flex">
            <div className="absolute inset-0 rounded-2xl bg-accent/25 blur-xl pointer-events-none" />
            <div
              className="relative rounded-2xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-glow"
              style={{
                width:  "clamp(52px, 10vw, 80px)",
                height: "clamp(52px, 10vw, 80px)",
                minWidth: "52px",
                minHeight: "52px",
              }}
            >
              <svg
                style={{
                  width:  "clamp(26px, 5vw, 40px)",
                  height: "clamp(26px, 5vw, 40px)",
                }}
                className="text-white drop-shadow"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>

          {/* Title + subtitle */}
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.375rem, 1vh, 0.75rem)" }}>
            <h1
              className="font-bold text-text-primary tracking-tight"
              style={{ fontSize: "clamp(1.75rem, 7vw, 3.75rem)", lineHeight: 1.15 }}
            >
              AI{" "}
              <span className="bg-gradient-to-r from-accent to-blue-400 bg-clip-text text-transparent">
                Chat
              </span>
            </h1>
            <p
              className="text-text-secondary leading-relaxed"
              style={{
                fontSize: "clamp(0.8125rem, 2.8vw, 1.125rem)",
                maxWidth: "min(480px, 90vw)",
                margin: "0 auto",
                paddingLeft: "clamp(0.5rem, 2vw, 1rem)",
                paddingRight: "clamp(0.5rem, 2vw, 1rem)",
              }}
            >
              One AI for everything — code, analyze, create, and solve.
              Lightning-fast, secure, and always improving.
            </p>
          </div>

          {/* Login button */}
          <div style={{ paddingTop: "clamp(0.125rem, 0.5vh, 0.375rem)" }}>
            <LoginButton />
          </div>

          <p
            className="text-text-muted"
            style={{ fontSize: "clamp(0.65rem, 1.8vw, 0.75rem)" }}
          >
            Sign in with Google · Your data never leaves our server
          </p>
        </div>

        {/* ── Feature grid ─────────────────────────────────────────── */}
        <div
          className="w-full animate-fade-in"
          style={{
            animationDelay: "0.1s",
            display: "grid",
            gap: "clamp(0.5rem, 1.5vw, 0.75rem)",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
          }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="group relative rounded-2xl bg-surface-1 border border-border hover:border-border-strong transition-all duration-300 hover:shadow-card-hover"
              style={{
                padding: "clamp(0.75rem, 2.5vw, 1rem)",
              }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="relative flex items-start gap-3">
                <div
                  className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20 flex-shrink-0"
                  style={{ marginTop: "0.125rem" }}
                >
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <div
                    className="font-semibold text-text-primary"
                    style={{
                      fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {f.title}
                  </div>
                  <div
                    className="text-text-secondary leading-relaxed"
                    style={{ fontSize: "clamp(0.6875rem, 1.8vw, 0.75rem)" }}
                  >
                    {f.desc}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <p
          className="text-text-muted text-center animate-fade-in"
          style={{
            fontSize: "clamp(0.6rem, 1.6vw, 0.75rem)",
            animationDelay: "0.2s",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
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

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useChat, ChatItem } from "@/hooks/useChat";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";

export default function ChatPage() {
  const { user, loading, logout } = useAuth();
  const router   = useRouter();
  const chatHook = useChat();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollYRef = useRef(0);

  /* Auth guard */
  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  /* Load chats */
  useEffect(() => {
    if (user) chatHook.fetchChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* Lock body scroll while drawer is open (preserves scroll pos) */
  useEffect(() => {
    if (drawerOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.position   = "fixed";
      document.body.style.top        = `-${scrollYRef.current}px`;
      document.body.style.width      = "100%";
      document.body.style.overflowY  = "scroll";
    } else {
      document.body.style.position   = "";
      document.body.style.top        = "";
      document.body.style.width      = "";
      document.body.style.overflowY  = "";
      window.scrollTo(0, scrollYRef.current);
    }
    return () => {
      document.body.style.position   = "";
      document.body.style.top        = "";
      document.body.style.width      = "";
      document.body.style.overflowY  = "";
    };
  }, [drawerOpen]);

  const handleSelectChat = useCallback(
    (chat: ChatItem) => {
      chatHook.loadChat(chat);
      setDrawerOpen(false);
    },
    [chatHook]
  );

  const handleNewChat = useCallback(async (): Promise<ChatItem | null> => {
    const result = await chatHook.createNewChat();
    setDrawerOpen(false);
    return result;
  }, [chatHook]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">Loading workspace…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="chat-layout">
      {/* Mobile overlay */}
      {drawerOpen && (
        <div
          className="sidebar-overlay lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/*
       * Sidebar — fixed off-canvas drawer on mobile,
       * static flex child on desktop (lg+).
       */}
      <div
        className={[
          "sidebar-drawer",
          "lg:!transform-none lg:!transition-none lg:relative lg:z-auto",
          drawerOpen ? "open" : "",
        ].join(" ")}
      >
        <Sidebar
          chats={chatHook.chats}
          activeChat={chatHook.activeChat}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onRenameChat={chatHook.renameChat}
          onDeleteChat={chatHook.deleteChat}
          user={user}
          onLogout={logout}
          onMobileClose={() => setDrawerOpen(false)}
        />
      </div>

      {/* Main chat area */}
      <ChatWindow
        activeChat={chatHook.activeChat}
        messages={chatHook.messages}
        isLoading={chatHook.isLoading}
        isSending={chatHook.isSending}
        error={chatHook.error}
        onSendMessage={chatHook.sendMessage}
        onNewChat={handleNewChat}
        onDismissError={() => chatHook.setError(null)}
        onOpenMobileSidebar={() => setDrawerOpen(true)}
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
import { useState, useEffect } from "react";

export default function LoginButton() {
  const { login }  = useAuth();
  const router     = useRouter();
  const [error,    setError]   = useState<string | null>(null);
  const [loading,  setLoading] = useState(false);
  const [btnWidth, setBtnWidth] = useState(280);

  /* Responsively size the Google button to fit the viewport */
  useEffect(() => {
    const update = () => {
      // leave 32px horizontal margin on each side, cap at 280px
      const available = Math.min(window.innerWidth - 64, 280);
      setBtnWidth(Math.max(200, available));
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

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
    <div
      className="flex flex-col items-center"
      style={{ gap: "clamp(0.5rem, 1.5vh, 0.75rem)" }}
    >
      {loading ? (
        <div
          className="flex items-center gap-2 rounded-full bg-surface-2 border border-border text-text-secondary"
          style={{
            padding: "clamp(0.5rem, 1.5vw, 0.75rem) clamp(1rem, 4vw, 1.5rem)",
            fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
            minWidth: "200px",
            justifyContent: "center",
          }}
        >
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span>Signing in…</span>
        </div>
      ) : (
        /* Key forces re-mount when width changes so Google re-renders correctly */
        <GoogleLogin
          key={btnWidth}
          onSuccess={handleSuccess}
          onError={() => setError("Google sign-in failed.")}
          theme="filled_black"
          size="large"
          shape="pill"
          text="signin_with"
          width={String(btnWidth)}
        />
      )}

      {error && (
        <div
          className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 animate-fade-in text-center"
          style={{
            padding: "clamp(0.375rem, 1.2vw, 0.5rem) clamp(0.75rem, 2.5vw, 1rem)",
            fontSize: "clamp(0.7rem, 1.8vw, 0.875rem)",
            maxWidth: "min(320px, 90vw)",
          }}
        >
          <svg
            className="flex-shrink-0"
            style={{ width: "clamp(14px, 2vw, 16px)", height: "clamp(14px, 2vw, 16px)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
```

### `frontend/src/components/Sidebar.tsx`

```tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChatItem } from "@/hooks/useChat";

// ─── Types ─────────────────────────────────────────────────────────────────

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
  onMobileClose?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupChatsByDate(chats: ChatItem[]) {
  const now       = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const lastWeek  = new Date(today.getTime() - 7 * 86_400_000);

  const groups: Record<string, ChatItem[]> = {
    Today: [], Yesterday: [], "Last 7 days": [], Older: [],
  };

  for (const chat of chats) {
    const d = new Date(chat.updatedAt);
    if      (d >= today)     groups["Today"].push(chat);
    else if (d >= yesterday) groups["Yesterday"].push(chat);
    else if (d >= lastWeek)  groups["Last 7 days"].push(chat);
    else                     groups["Older"].push(chat);
  }
  return groups;
}

// ─── ChatItemRow ────────────────────────────────────────────────────────────

interface ChatItemRowProps {
  chat: ChatItem;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

function ChatItemRow({
  chat, isActive, onSelect, onRename, onDelete,
}: ChatItemRowProps) {
  const [editing,  setEditing]  = useState(false);
  const [title,    setTitle]    = useState(chat.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) setTitle(chat.title);
  }, [chat.title, editing]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close, { passive: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [menuOpen]);

  const confirmRename = useCallback(() => {
    const t = title.trim();
    if (t && t !== chat.title) onRename(t);
    else setTitle(chat.title);
    setEditing(false);
  }, [title, chat.title, onRename]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open chat: ${chat.title}`}
      className={[
        "group relative flex items-center gap-2 px-3 py-2.5 rounded-xl",
        "cursor-pointer select-none transition-colors duration-150",
        isActive
          ? "bg-accent/15 text-text-primary border border-accent/25"
          : "text-text-secondary hover:bg-surface-2 hover:text-text-primary border border-transparent",
      ].join(" ")}
      onClick={() => !editing && onSelect()}
      onKeyDown={(e) => { if (e.key === "Enter" && !editing) onSelect(); }}
    >
      <svg
        className={`w-4 h-4 flex-shrink-0 ${
          isActive ? "text-accent" : "text-text-muted group-hover:text-text-secondary"
        }`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>

      {editing ? (
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter")  confirmRename();
            if (e.key === "Escape") { setTitle(chat.title); setEditing(false); }
          }}
          onBlur={confirmRename}
          autoFocus
          className="flex-1 min-w-0 bg-surface-3 text-text-primary text-sm px-2 py-0.5 rounded-md outline-none border border-accent/40 focus:border-accent"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 min-w-0 truncate text-sm">{chat.title}</span>
      )}

      {!editing && (
        <div
          ref={menuRef}
          className={`relative flex-shrink-0 transition-opacity ${
            menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            aria-label="Chat options"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="p-1.5 rounded-md hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors"
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

// ─── DeleteModal ─────────────────────────────────────────────────────────────

interface DeleteModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({ onConfirm, onCancel }: DeleteModalProps) {
  // Scroll lock
  useEffect(() => {
    const scrollY = window.scrollY;
    const prev = {
      position:  document.body.style.position,
      top:       document.body.style.top,
      width:     document.body.style.width,
      overflowY: document.body.style.overflowY,
    };
    document.body.style.position  = "fixed";
    document.body.style.top       = `-${scrollY}px`;
    document.body.style.width     = "100%";
    document.body.style.overflowY = "scroll";
    return () => {
      document.body.style.position  = prev.position;
      document.body.style.top       = prev.top;
      document.body.style.width     = prev.width;
      document.body.style.overflowY = prev.overflowY;
      window.scrollTo({ top: scrollY, behavior: "instant" });
    };
  }, []);

  // Keyboard handlers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter")  onConfirm();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  // ── The portal content ──────────────────────────────────────────────────
  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-desc"
      style={{
        // Covers the ENTIRE viewport — not just the sidebar
        position: "fixed",
        inset:    0,
        // Grid centering: single atomic operation on both axes
        display:      "grid",
        placeItems:   "center",
        // Breathing room from every edge including notches
        paddingTop:    "calc(env(safe-area-inset-top,    0px) + clamp(1rem, 4vh, 2rem))",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + clamp(1rem, 4vh, 2rem))",
        paddingLeft:   "calc(env(safe-area-inset-left,   0px) + clamp(1rem, 4vw, 2rem))",
        paddingRight:  "calc(env(safe-area-inset-right,  0px) + clamp(1rem, 4vw, 2rem))",
        // Backdrop
        backgroundColor:     "rgba(0, 0, 0, 0.65)",
        backdropFilter:      "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        // Above absolutely everything
        zIndex: 9999,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width:     "min(100%, 400px)",
          maxHeight: "100%",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          background:   "rgb(26, 26, 30)",
          border:       "1px solid rgba(255,255,255,0.12)",
          borderRadius: "1.25rem",
          boxShadow: [
            "0 0 0 1px rgba(255,255,255,0.04)",
            "0 8px 32px rgba(0,0,0,0.6)",
            "0 32px 64px rgba(0,0,0,0.4)",
          ].join(", "),
          padding:   "clamp(1.25rem, 4vw, 1.75rem)",
          animation: "modal-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        }}
      >
        {/* Header */}
        <div
          style={{
            display:      "flex",
            alignItems:   "flex-start",
            gap:          "clamp(0.75rem, 2vw, 1rem)",
            marginBottom: "clamp(1rem, 3vw, 1.25rem)",
          }}
        >
          <div
            style={{
              flexShrink:     0,
              width:          "clamp(36px, 8vw, 44px)",
              height:         "clamp(36px, 8vw, 44px)",
              borderRadius:   "0.75rem",
              background:     "rgba(239, 68, 68, 0.12)",
              border:         "1px solid rgba(239, 68, 68, 0.25)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
            }}
          >
            <svg
              style={{
                width:  "clamp(18px, 4vw, 22px)",
                height: "clamp(18px, 4vw, 22px)",
                color:  "rgb(248, 113, 113)",
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>

          <div style={{ minWidth: 0 }}>
            <h3
              id="delete-modal-title"
              style={{
                fontWeight:   600,
                fontSize:     "clamp(0.9375rem, 2.5vw, 1.0625rem)",
                color:        "rgb(240, 240, 242)",
                lineHeight:   1.3,
                marginBottom: "0.3rem",
              }}
            >
              Delete chat?
            </h3>
            <p
              id="delete-modal-desc"
              style={{
                fontSize:   "clamp(0.8125rem, 2vw, 0.875rem)",
                color:      "rgb(152, 152, 166)",
                lineHeight: 1.5,
              }}
            >
              This conversation will be permanently deleted and cannot be recovered.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "clamp(0.5rem, 2vw, 0.625rem)" }}>
          <button
            onClick={onCancel}
            autoFocus
            style={{
              flex:          1,
              padding:       "clamp(0.6rem, 2vw, 0.7rem) 1rem",
              borderRadius:  "0.75rem",
              border:        "1px solid rgba(255,255,255,0.1)",
              background:    "rgba(255,255,255,0.05)",
              color:         "rgb(152, 152, 166)",
              fontSize:      "clamp(0.8125rem, 2vw, 0.875rem)",
              fontWeight:    500,
              cursor:        "pointer",
              transition:    "background 0.15s, color 0.15s, border-color 0.15s",
              outline:       "none",
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget;
              b.style.background  = "rgba(255,255,255,0.09)";
              b.style.color       = "rgb(240,240,242)";
              b.style.borderColor = "rgba(255,255,255,0.18)";
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget;
              b.style.background  = "rgba(255,255,255,0.05)";
              b.style.color       = "rgb(152,152,166)";
              b.style.borderColor = "rgba(255,255,255,0.1)";
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline      = "2px solid rgba(124,106,247,0.7)";
              e.currentTarget.style.outlineOffset = "2px";
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "none";
            }}
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            style={{
              flex:          1,
              padding:       "clamp(0.6rem, 2vw, 0.7rem) 1rem",
              borderRadius:  "0.75rem",
              border:        "1px solid rgba(239,68,68,0.4)",
              background:    "rgb(220, 38, 38)",
              color:         "rgb(255, 255, 255)",
              fontSize:      "clamp(0.8125rem, 2vw, 0.875rem)",
              fontWeight:    600,
              cursor:        "pointer",
              transition:    "background 0.15s, box-shadow 0.15s",
              outline:       "none",
              boxShadow:     "0 2px 8px rgba(220,38,38,0.3)",
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget;
              b.style.background = "rgb(185, 28, 28)";
              b.style.boxShadow  = "0 4px 16px rgba(220,38,38,0.45)";
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget;
              b.style.background = "rgb(220, 38, 38)";
              b.style.boxShadow  = "0 2px 8px rgba(220,38,38,0.3)";
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline      = "2px solid rgba(248,113,113,0.7)";
              e.currentTarget.style.outlineOffset = "2px";
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "none";
            }}
          >
            Delete
          </button>
        </div>

        {/* Keyboard hint */}
        <p
          style={{
            marginTop:  "clamp(0.625rem, 2vw, 0.875rem)",
            textAlign:  "center",
            fontSize:   "0.6875rem",
            color:      "rgba(152,152,166,0.5)",
            userSelect: "none",
          }}
          aria-hidden="true"
        >
          Press{" "}
          <kbd
            style={{
              fontFamily:   "monospace",
              background:   "rgba(255,255,255,0.07)",
              padding:      "0.1em 0.35em",
              borderRadius: "4px",
              fontSize:     "0.9em",
            }}
          >
            Esc
          </kbd>{" "}
          to cancel
        </p>
      </div>
    </div>
  );

  // ── Mount on document.body via portal ───────────────────────────────────
  // This escapes overflow:hidden, z-index stacking contexts, and any
  // transform on ancestor elements — the modal always covers the full screen.
  return createPortal(modal, document.body);
}

// ─── Sidebar (main export) ───────────────────────────────────────────────────

export default function Sidebar({
  chats, activeChat, onSelectChat, onNewChat,
  onRenameChat, onDeleteChat, user, onLogout, onMobileClose,
}: SidebarProps) {
  const [isCollapsed,     setIsCollapsed]     = useState(false);
  const [search,          setSearch]          = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filtered = search.trim()
    ? chats.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : chats;

  const grouped  = groupChatsByDate(filtered);
  const hasChats = chats.length > 0;

  const confirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      onDeleteChat(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, onDeleteChat]);

  /* Collapsed sidebar — desktop only */
  if (isCollapsed) {
    return (
      <>
        <aside className="hidden lg:flex flex-col items-center py-3 px-2 gap-3 bg-surface-1 border-r border-border h-full w-14 flex-shrink-0">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-2.5 rounded-xl hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors focus-ring"
            aria-label="Expand sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="h-px w-full bg-border" />
          <button
            onClick={onNewChat}
            className="p-2.5 rounded-xl hover:bg-accent/15 text-text-muted hover:text-accent transition-colors focus-ring"
            aria-label="New chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </aside>

        {deleteConfirmId && (
          <DeleteModal
            onConfirm={confirmDelete}
            onCancel={() => setDeleteConfirmId(null)}
          />
        )}
      </>
    );
  }

  /* Full sidebar */
  return (
    <>
      <aside className="w-full h-full bg-surface-1 border-r border-border flex flex-col overflow-hidden lg:w-[272px] lg:min-w-[272px] lg:flex-shrink-0">

        {/* Top bar */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-border flex-shrink-0">
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
            className="p-2 rounded-lg hover:bg-accent/15 text-text-muted hover:text-accent transition-colors focus-ring flex-shrink-0"
            aria-label="New chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <button
            onClick={() => setIsCollapsed(true)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors focus-ring flex-shrink-0"
            aria-label="Collapse sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="flex lg:hidden p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors focus-ring flex-shrink-0"
              aria-label="Close sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search */}
        {hasChats && (
          <div className="px-3 pt-2 pb-1 flex-shrink-0">
            <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-3 py-1.5">
              <svg className="w-3.5 h-3.5 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats…"
                className="flex-1 min-w-0 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="flex-shrink-0 text-text-muted hover:text-text-secondary transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Chat list */}
        <div
          className="flex-1 min-h-0 px-2 py-2"
          style={{
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          } as React.CSSProperties}
        >
          {!hasChats ? (
            <div className="flex flex-col items-center justify-center h-36 gap-3 text-center px-4">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
                <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-text-secondary text-sm font-medium">No chats yet</p>
                <p className="text-text-muted text-xs mt-1">Start a conversation</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm px-3">
              No chats match &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([label, items]) =>
                items.length === 0 ? null : (
                  <div key={label}>
                    <p className="px-3 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      {label}
                    </p>
                    <div className="space-y-0.5 mt-1">
                      {items.map((chat) => (
                        <ChatItemRow
                          key={chat.id}
                          chat={chat}
                          isActive={activeChat?.id === chat.id}
                          onSelect={() => onSelectChat(chat)}
                          onRename={(t) => onRenameChat(chat.id, t)}
                          onDelete={() => setDeleteConfirmId(chat.id)}
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
        <div
          className="border-t border-border p-3 flex-shrink-0"
          style={{
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-2 transition-colors group">
            {user.profilePicture ? (
              <Image
                src={user.profilePicture}
                alt={user.name}
                width={34}
                height={34}
                className="rounded-full ring-2 ring-border flex-shrink-0"
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
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all focus-ring flex-shrink-0"
              aria-label="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Portal renders directly on document.body — always full-screen centered */}
      {deleteConfirmId && (
        <DeleteModal
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </>
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
  onOpenMobileSidebar: () => void;
}

const SUGGESTIONS = [
  { icon: "💡", text: "Explain quantum computing in simple terms" },
  { icon: "🐍", text: "Write a Python function to parse JSON" },
  { icon: "⚛️", text: "What are React Server Components?" },
  { icon: "🐛", text: "Help me debug a TypeScript type error" },
  { icon: "✍️", text: "Write a concise executive summary template" },
  { icon: "🔒", text: "Best practices for API authentication" },
];

/* ── Shared top bar ─────────────────────────────────────────────────── */
function TopBar({
  title,
  isSending,
  onOpenMobileSidebar,
}: {
  title?: string;
  isSending: boolean;
  onOpenMobileSidebar: () => void;
}) {
  return (
    <div className="glass border-b border-border flex items-center gap-2 flex-shrink-0 px-3 py-2.5 min-h-[48px]">
      <button
        onClick={onOpenMobileSidebar}
        className="flex lg:hidden flex-shrink-0 p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors focus-ring"
        aria-label="Open sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        {title ? (
          <h1 className="font-semibold text-text-primary truncate text-sm leading-tight">
            {title}
          </h1>
        ) : (
          <span className="font-semibold text-sm text-text-primary lg:hidden">
            AI Chat
          </span>
        )}
      </div>

      {isSending && (
        <div className="flex items-center gap-1.5 text-xs text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-full animate-fade-in flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="hidden xs:inline">Generating…</span>
        </div>
      )}
    </div>
  );
}

export default function ChatWindow({
  activeChat,
  messages,
  isLoading,
  isSending,
  error,
  onSendMessage,
  onNewChat,
  onDismissError,
  onOpenMobileSidebar,
}: ChatWindowProps) {
  const messagesEndRef     = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isCreating,    setIsCreating]    = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  /* Auto-scroll on new messages */
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    if ((last.role === "assistant" && isSending) || last.role === "user") {
      scrollToBottom("smooth");
    }
  }, [messages, isSending, scrollToBottom]);

  /* Show / hide scroll-to-bottom FAB */
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 180);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* Suggestion tap — create chat then send */
  const handleSuggestion = useCallback(
    async (text: string) => {
      if (isCreating) return;
      setIsCreating(true);
      try {
        const chat = await onNewChat();
        if (chat) setTimeout(() => onSendMessage(text), 80);
      } finally {
        setIsCreating(false);
      }
    },
    [isCreating, onNewChat, onSendMessage]
  );

  const visibleMessages = messages.filter((m) => m.role !== "system");

  /* ── Welcome / empty state ──────────────────────────────────────── */
  if (!activeChat) {
    return (
      <div
        className="flex-1 flex flex-col min-w-0 bg-surface"
        style={{ minHeight: 0, overflow: "hidden" }}
      >
        <TopBar isSending={isSending} onOpenMobileSidebar={onOpenMobileSidebar} />

        {/* Scrollable area */}
        <div className="messages-scroll">
          <div className="min-h-full flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-2xl flex flex-col items-center gap-8 animate-fade-in">

              {/* Header */}
              <div className="text-center flex flex-col items-center gap-3">
                <div className="relative inline-flex">
                  <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-lg pointer-events-none" />
                  <div
                    className="relative rounded-2xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-glow"
                    style={{
                      width:  "clamp(52px, 8vw, 64px)",
                      height: "clamp(52px, 8vw, 64px)",
                    }}
                  >
                    <svg
                      style={{
                        width:  "clamp(26px, 4vw, 32px)",
                        height: "clamp(26px, 4vw, 32px)",
                      }}
                      className="text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>
                <h2
                  className="font-bold text-text-primary"
                  style={{ fontSize: "clamp(1.125rem, 4vw, 1.5rem)" }}
                >
                  How can I help you?
                </h2>
                <p className="text-text-secondary text-sm text-center px-2">
                  Start a conversation or pick a suggestion below.
                </p>
              </div>

              {/* Suggestions */}
              <div
                className="w-full grid gap-2"
                style={{
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                }}
              >
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(s.text)}
                    disabled={isCreating}
                    className="group text-left p-3.5 rounded-2xl bg-surface-1 border border-border hover:border-accent/30 hover:bg-surface-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg flex-shrink-0 leading-snug">{s.icon}</span>
                      <span className="text-xs sm:text-sm text-text-secondary group-hover:text-text-primary transition-colors leading-relaxed">
                        {s.text}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <MessageInput
          onSend={handleSuggestion}
          disabled={isSending || isCreating}
        />
      </div>
    );
  }

  /* ── Active chat ────────────────────────────────────────────────── */
  return (
    <div
      className="flex-1 flex flex-col min-w-0 bg-surface relative"
      style={{ minHeight: 0, overflow: "hidden" }}
    >
      <TopBar
        title={activeChat.title}
        isSending={isSending}
        onOpenMobileSidebar={onOpenMobileSidebar}
      />

      {/* Error bar */}
      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-red-500/10 border-b border-red-500/20 animate-fade-in flex-shrink-0">
          <div className="flex items-center gap-2 text-red-400 min-w-0">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="truncate text-xs sm:text-sm">{error}</span>
          </div>
          <button
            onClick={onDismissError}
            className="flex-shrink-0 text-red-400 hover:text-red-300 text-xs underline underline-offset-2 whitespace-nowrap transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/*
       * THE scroll container.
       * .messages-scroll class sets:
       *   overflow-y: auto
       *   -webkit-overflow-scrolling: touch
       *   overscroll-behavior-y: contain
       *   touch-action: pan-y
       *   flex: 1 1 0%
       *   min-height: 0
       */}
      <div ref={scrollContainerRef} className="messages-scroll">
        {isLoading && visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-text-muted text-sm">Loading messages…</span>
            </div>
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px] px-4">
            <div className="text-center space-y-1">
              <p className="text-text-muted text-sm">No messages yet.</p>
              <p className="text-text-muted text-xs">Send a message below to start.</p>
            </div>
          </div>
        ) : (
          <div className="messages-list">
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
            <div ref={messagesEndRef} aria-hidden style={{ height: 1 }} />
          </div>
        )}
      </div>

      {/* Scroll-to-bottom FAB */}
      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute z-20 p-2.5 rounded-full bg-surface-2 border border-border-strong shadow-float hover:bg-surface-3 text-text-secondary hover:text-text-primary transition-all animate-fade-in"
          style={{
            bottom: "calc(var(--input-height, 80px) + 12px)",
            right:  "clamp(0.75rem, 2vw, 1.25rem)",
          }}
          aria-label="Scroll to bottom"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

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
    } catch { /* ignore */ }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md text-2xs transition-colors text-text-muted hover:text-text-primary hover:bg-surface-3"
      aria-label="Copy code"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400">Copied</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="hidden xs:inline">Copy</span>
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
    } catch { /* ignore */ }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors focus-ring"
      aria-label="Copy message"
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

export default function MessageBubble({
  message,
  isStreaming = false,
}: MessageBubbleProps) {
  const isUser  = message.role === "user";
  const isEmpty = !message.content;

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className={`group flex gap-2 py-3 rounded-xl transition-colors hover:bg-surface-1/30 animate-fade-in ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div
            className="rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-sm"
            style={{
              width:    "clamp(26px, 4vw, 32px)",
              height:   "clamp(26px, 4vw, 32px)",
              fontSize: "clamp(9px, 1.5vw, 11px)",
            }}
          >
            U
          </div>
        ) : (
          <div
            className="rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-sm"
            style={{
              width:  "clamp(26px, 4vw, 32px)",
              height: "clamp(26px, 4vw, 32px)",
            }}
          >
            <svg
              style={{
                width:  "clamp(13px, 2vw, 16px)",
                height: "clamp(13px, 2vw, 16px)",
              }}
              className="text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content column */}
      <div
        className={`flex flex-col gap-1 min-w-0 ${isUser ? "items-end" : "items-start"}`}
        style={{ maxWidth: "min(85%, 680px)" }}
      >
        {/* Meta row */}
        <div
          className={`flex items-center gap-1.5 px-0.5 flex-wrap ${
            isUser ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <span className="text-2xs font-semibold text-text-secondary whitespace-nowrap">
            {isUser ? "You" : "AI Assistant"}
          </span>
          <span className="text-2xs text-text-muted whitespace-nowrap">
            {formatTime(message.createdAt)}
          </span>
          {message.modelName && !isUser && (
            <span className="text-2xs text-text-muted bg-surface-2 border border-border px-1.5 py-0.5 rounded-full whitespace-nowrap">
              {message.modelName.replace("ollama/", "")}
            </span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`relative rounded-2xl min-w-0 w-full overflow-hidden ${
            isUser
              ? "bg-accent/20 border border-accent/25 rounded-tr-sm"
              : "bg-surface-1 border border-border rounded-tl-sm"
          }`}
          style={{
            padding:
              "clamp(0.5rem, 2vw, 0.75rem) clamp(0.625rem, 2.5vw, 1rem)",
          }}
        >
          {isEmpty ? (
            <LoadingThinking />
          ) : isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-text-primary">
              {message.content}
            </p>
          ) : (
            <div className="message-content">
              <ReactMarkdown
                components={{
                  table: ({ children }) => (
                    <div className="table-wrapper">
                      <table>{children}</table>
                    </div>
                  ),
                  code({ className, children }) {
                    const match   = /language-(\w+)/.exec(className || "");
                    const codeStr = String(children).replace(/\n$/, "");
                    const isBlock = codeStr.includes("\n") || !!match;

                    if (isBlock) {
                      const lang = match?.[1] || "text";
                      return (
                        <div className="code-block-wrapper my-2 border border-border">
                          <div className="code-block-header">
                            <span className="text-accent/80 font-mono">{lang}</span>
                            <CopyButton text={codeStr} />
                          </div>
                          <div className="code-block-scroll">
                            <SyntaxHighlighter
                              style={oneDark}
                              language={lang}
                              PreTag="div"
                              customStyle={{
                                margin:       0,
                                borderRadius: 0,
                                background:   "#12121a",
                                fontSize:     "clamp(0.7rem, 1.8vw, 0.82rem)",
                                lineHeight:   "1.6",
                                padding:      "0.75em 1em",
                              }}
                              codeTagProps={{
                                style: { fontFamily: "JetBrains Mono, monospace" },
                              }}
                            >
                              {codeStr}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      );
                    }
                    return <code className={className}>{children}</code>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && <span className="typing-cursor" aria-hidden />}
            </div>
          )}
        </div>

        {/* Copy action */}
        {!isEmpty && !isStreaming && (
          <div
            className={`flex items-center gap-1 px-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
              isUser ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <CopyMessageButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingThinking() {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-accent"
            style={{
              animation:      "pulse-dot 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
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

import {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useCallback,
} from "react";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

const LINE_HEIGHT = 24;   // px — must match .chat-textarea line-height (1.6 × 15px ≈ 24px)
const MAX_HEIGHT  = 160;  // px — ~6 lines before textarea scrolls internally
const PADDING_TOP = 13;   // px — top padding inside textarea

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [input, setInput] = useState("");
  const textareaRef       = useRef<HTMLTextAreaElement>(null);

  /* ── Auto-resize ─────────────────────────────────────────────────── */
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, []);

  /* After every input change — useLayoutEffect avoids a visible jump */
  useLayoutEffect(() => {
    resize();
  }, [input, resize]);

  /* Also handle orientation / window resize */
  useEffect(() => {
    window.addEventListener("resize", resize, { passive: true });
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  /* ── Send ────────────────────────────────────────────────────────── */
  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
    const el = textareaRef.current;
    if (el) {
      el.style.height = `${LINE_HEIGHT + PADDING_TOP}px`;
      el.style.overflowY = "hidden";
    }
  }, [input, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const canSend  = input.trim().length > 0 && !disabled;
  const showCount = input.length > 500;
  const overLimit = input.length > 3000;

  return (
    <div className="input-wrapper">
      <div className="input-inner">

        {/* Textarea + action bar container */}
        <div className={`textarea-container${disabled ? " disabled" : ""}`}>

          {/*
           * The textarea:
           *  - font-size is max(16px, ...) → prevents iOS auto-zoom on focus
           *  - overflow-y starts hidden; switches to auto when > MAX_HEIGHT
           *  - touch-action: auto → lets the finger scroll inside when tall
           *  - resize: none → we handle it manually
           */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "AI is responding…" : "Message AI…"}
            disabled={disabled}
            rows={1}
            aria-label="Message input"
            className="chat-textarea"
            style={{
              height:     `${LINE_HEIGHT + PADDING_TOP}px`,
              overflowY:  "hidden",
              touchAction: "auto",
            }}
          />

          {/* Bottom action bar */}
          <div className="input-bottom-bar">
            {/* Hint */}
            <span
              className="text-2xs text-text-muted truncate hidden xs:block select-none"
              aria-hidden
            >
              {disabled ? "Generating…" : "Shift + Enter for new line"}
            </span>

            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              {/* Character count */}
              {showCount && (
                <span
                  className={`text-2xs tabular-nums select-none ${
                    overLimit ? "text-red-400" : "text-text-muted"
                  }`}
                  aria-live="polite"
                  aria-label={`${input.length} characters`}
                >
                  {input.length.toLocaleString()}
                  {overLimit && " — too long"}
                </span>
              )}

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!canSend}
                aria-label="Send message"
                className={`send-btn${canSend ? " active" : " inactive"}`}
              >
                {disabled ? (
                  /* Spinner */
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <circle
                      className="opacity-25"
                      cx="12" cy="12" r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                ) : (
                  /* Arrow */
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 12h14m-7-7l7 7-7 7"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="input-disclaimer">
          AI can make mistakes · All data stays on your server
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
          className="w-2 h-2 rounded-full bg-accent/60"
          style={{
            animation:      "pulse-dot 1.4s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}
```