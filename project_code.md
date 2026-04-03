
## Project Structure

```
ai-chat/
├── docker-compose.yml
├── .env
├── litellm-config.yaml
├── database/
│   └── init.sql
├── backend/
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
│           └── ai.ts
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── next.config.js
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
    "You are a helpful, harmless, and honest AI assistant. Answer questions clearly and concisely.",
};
```

### `backend/src/database.ts`

```typescript
import { Pool, PoolClient } from "pg";
import { config } from "./config";
import { logger } from "./index";

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

// ─── User queries ──────────────────────────────────────────

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
  const result = await pool.query("SELECT * FROM users WHERE google_id = $1", [googleId]);
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

// ─── Chat queries ──────────────────────────────────────────

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

export async function getChatById(chatId: string, userId: string): Promise<DbChat | null> {
  const result = await pool.query(
    "SELECT * FROM chats WHERE chat_id = $1 AND user_id = $2 AND is_deleted = FALSE",
    [chatId, userId]
  );
  return result.rows[0] || null;
}

export async function createChat(userId: string, title?: string): Promise<DbChat> {
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
    "UPDATE chats SET title = $1 WHERE chat_id = $2 AND user_id = $3 AND is_deleted = FALSE RETURNING *",
    [title, chatId, userId]
  );
  return result.rows[0] || null;
}

export async function softDeleteChat(chatId: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    "UPDATE chats SET is_deleted = TRUE WHERE chat_id = $1 AND user_id = $2",
    [chatId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

// ─── Message queries ───────────────────────────────────────

export interface DbMessage {
  message_id: string;
  chat_id: string;
  role: "system" | "user" | "assistant";
  content: string;
  model_name: string | null;
  created_at: Date;
}

export async function getChatMessages(chatId: string): Promise<DbMessage[]> {
  const result = await pool.query(
    "SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC",
    [chatId]
  );
  return result.rows;
}

export async function createMessage(
  chatId: string,
  role: "system" | "user" | "assistant",
  content: string,
  modelName?: string
): Promise<DbMessage> {
  const result = await pool.query(
    `INSERT INTO messages (chat_id, role, content, model_name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [chatId, role, content, modelName || null]
  );

  // Touch the chat's updated_at
  await pool.query("UPDATE chats SET updated_at = NOW() WHERE chat_id = $1", [chatId]);

  return result.rows[0];
}

// ─── Model queries ─────────────────────────────────────────

export async function getAvailableModels(): Promise<{ model_id: string; name: string }[]> {
  const result = await pool.query("SELECT model_id, name FROM models ORDER BY name");
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
import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { messageLimiter } from "../middleware/rateLimit";
import { getChatById, getChatMessages, createMessage } from "../database";
import { getAIResponse, getAIResponseStream, ChatMessage } from "../services/ai";

const router = Router();

router.use(authMiddleware);

// GET /api/chats/:chatId/messages — list messages in a chat
router.get("/:chatId/messages", async (req: AuthRequest, res: Response) => {
  try {
    // Verify chat belongs to user
    const chat = await getChatById(req.params.chatId, req.user!.userId);
    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    const messages = await getChatMessages(req.params.chatId);
    res.json({
      messages: messages.map((m) => ({
        id: m.message_id,
        role: m.role,
        content: m.content,
        modelName: m.model_name,
        createdAt: m.created_at,
      })),
    });
  } catch (error: any) {
    console.error("List messages error:", error.message);
    res.status(500).json({ error: "Failed to list messages" });
  }
});

// POST /api/chats/:chatId/messages — send a message and get AI response
router.post("/:chatId/messages", messageLimiter, async (req: AuthRequest, res: Response) => {
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

    // Save user message
    const userMessage = await createMessage(req.params.chatId, "user", content.trim());

    // Get chat history for context
    const history = await getChatMessages(req.params.chatId);
    const contextMessages: ChatMessage[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // ─── Streaming response ────────────────────────────────
    if (useStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      try {
        const stream = await getAIResponseStream(contextMessages, model);
        let fullResponse = "";

        for await (const chunk of stream) {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }

        // Save assistant message
        const assistantMessage = await createMessage(
          req.params.chatId,
          "assistant",
          fullResponse,
          model
        );

        // Auto-title on first exchange
        if (history.length <= 1) {
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
        res.write(
          `data: ${JSON.stringify({ error: aiError.message || "AI request failed" })}\n\n`
        );
        res.end();
      }
      return;
    }

    // ─── Non-streaming response ────────────────────────────
    const aiResponse = await getAIResponse(contextMessages, model);

    // Save assistant message
    const assistantMessage = await createMessage(
      req.params.chatId,
      "assistant",
      aiResponse,
      model
    );

    // Auto-title on first exchange
    if (history.length <= 1) {
      await autoTitleChat(req.params.chatId, content.trim());
    }

    res.json({
      userMessage: {
        id: userMessage.message_id,
        role: userMessage.role,
        content: userMessage.content,
        createdAt: userMessage.created_at,
      },
      assistantMessage: {
        id: assistantMessage.message_id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        modelName: assistantMessage.model_name,
        createdAt: assistantMessage.created_at,
      },
    });
  } catch (error: any) {
    console.error("Send message error:", error.message);
    res.status(500).json({ error: "Failed to process message" });
  }
});

// Auto-generate a chat title from the first user message
async function autoTitleChat(chatId: string, firstMessage: string): Promise<void> {
  try {
    const title =
      firstMessage.length > 60 ? firstMessage.substring(0, 57) + "..." : firstMessage;

    const { pool } = require("../database");
    await pool.query("UPDATE chats SET title = $1 WHERE chat_id = $2", [title, chatId]);
  } catch (error) {
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
    "next": "^14.2.13",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^9.0.1",
    "react-syntax-highlighter": "^15.5.0"
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
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `frontend/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

module.exports = nextConfig;
```

### `frontend/tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        'chat-bg': '#343541',
        'chat-sidebar': '#202123',
        'chat-input': '#40414f',
        'chat-border': '#4d4d4f',
        'chat-hover': '#2A2B32',
        'chat-user': '#343541',
        'chat-assistant': '#444654',
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
}

body {
  background-color: #343541;
  color: #ececf1;
  font-family: 'Söhne', 'ui-sans-serif', 'system-ui', -apple-system, 'Segoe UI', Roboto,
    Ubuntu, Cantarell, 'Noto Sans', sans-serif;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(217, 217, 227, 0.2);
  border-radius: 3px;
}

/* Markdown styles */
.message-content h1,
.message-content h2,
.message-content h3 {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.message-content p {
  margin-bottom: 0.75em;
  line-height: 1.7;
}

.message-content ul,
.message-content ol {
  margin-left: 1.5em;
  margin-bottom: 0.75em;
}

.message-content li {
  margin-bottom: 0.25em;
}

.message-content code {
  background-color: rgba(0, 0, 0, 0.3);
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-size: 0.9em;
}

.message-content pre {
  background-color: #1e1e2e;
  border-radius: 8px;
  padding: 1em;
  overflow-x: auto;
  margin-bottom: 1em;
}

.message-content pre code {
  background: none;
  padding: 0;
  font-size: 0.85em;
}

.message-content blockquote {
  border-left: 3px solid #565869;
  padding-left: 1em;
  margin-left: 0;
  margin-bottom: 0.75em;
  color: #a1a1aa;
}

.message-content a {
  color: #7c9bf5;
  text-decoration: underline;
}

.message-content table {
  border-collapse: collapse;
  margin-bottom: 1em;
}

.message-content th,
.message-content td {
  border: 1px solid #565869;
  padding: 0.5em 0.75em;
}
```

### `frontend/src/lib/api.ts`

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
  const abortRef = useRef(false);

  // Fetch all chats
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

  // Load messages for a chat
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

  // Create new chat
  const createNewChat = useCallback(async () => {
    try {
      const data = await api.createChat();
      const newChat = data.chat;
      setChats((prev) => [newChat, ...prev]);
      setActiveChat(newChat);
      setMessages([]);
      return newChat;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, []);

  // Send message (streaming)
  const sendMessage = useCallback(
    async (content: string, model?: string) => {
      if (!activeChat || isSending) return;

      setIsSending(true);
      setError(null);
      abortRef.current = false;

      // Optimistic: add user message
      const tempUserMsg: MessageItem = {
        id: `temp-user-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      // Placeholder for assistant message
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
          activeChat.id,
          content,
          // onChunk
          (chunk: string) => {
            if (abortRef.current) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId ? { ...m, content: m.content + chunk } : m
              )
            );
          },
          // onDone
          (messageId: string) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempAssistantId ? { ...m, id: messageId } : m))
            );
            // Refresh chat list for title updates
            fetchChats();
          },
          // onError
          (errorMsg: string) => {
            setError(errorMsg);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId
                  ? { ...m, content: "⚠️ Error: " + errorMsg }
                  : m
              )
            );
          },
          model
        );
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsSending(false);
      }
    },
    [activeChat, isSending, fetchChats]
  );

  // Rename chat
  const renameChat = useCallback(
    async (chatId: string, title: string) => {
      try {
        await api.updateChat(chatId, title);
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, title } : c))
        );
        if (activeChat?.id === chatId) {
          setActiveChat((prev) => (prev ? { ...prev, title } : null));
        }
      } catch (err: any) {
        setError(err.message);
      }
    },
    [activeChat]
  );

  // Delete chat
  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        await api.deleteChat(chatId);
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (activeChat?.id === chatId) {
          setActiveChat(null);
          setMessages([]);
        }
      } catch (err: any) {
        setError(err.message);
      }
    },
    [activeChat]
  );

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
  description: "AI Chat powered by local models",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LoginButton from "@/components/LoginButton";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/chat");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-chat-bg">
        <div className="animate-pulse text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-chat-bg">
      <div className="text-center space-y-8">
        {/* Logo/Title */}
        <div className="space-y-3">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-teal-400 to-blue-500 rounded-2xl flex items-center justify-center">
            <svg
              className="w-9 h-9 text-white"
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
          <h1 className="text-4xl font-semibold text-white">AI Chat</h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Chat with AI models running locally on your infrastructure.
            Fast, private, and under your control.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-sm">
          <div className="bg-chat-hover rounded-xl p-4 space-y-2">
            <div className="text-teal-400 font-medium">🔒 Private</div>
            <div className="text-gray-400">
              Your data stays on your server. No third-party model APIs.
            </div>
          </div>
          <div className="bg-chat-hover rounded-xl p-4 space-y-2">
            <div className="text-teal-400 font-medium">⚡ Fast</div>
            <div className="text-gray-400">
              Streaming responses with local GPU acceleration.
            </div>
          </div>
          <div className="bg-chat-hover rounded-xl p-4 space-y-2">
            <div className="text-teal-400 font-medium">💬 Persistent</div>
            <div className="text-gray-400">
              All chats saved. Pick up any conversation where you left off.
            </div>
          </div>
        </div>

        {/* Login */}
        <div className="pt-4">
          <LoginButton />
        </div>

        <p className="text-gray-600 text-xs">
          Sign in with your Google account to get started
        </p>
      </div>
    </div>
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
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      chatHook.fetchChats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-chat-bg">
        <div className="animate-pulse text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex overflow-hidden">
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

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setError("No credential received from Google");
      return;
    }

    try {
      setError(null);
      await login(response.credential);
      router.push("/chat");
    } catch (err) {
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => setError("Google sign-in failed")}
        theme="filled_black"
        size="large"
        shape="pill"
        text="signin_with"
        width="280"
      />
      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
```

### `frontend/src/components/Sidebar.tsx`

```tsx
"use client";

import { useState } from "react";
import { ChatItem } from "@/hooks/useChat";
import Image from "next/image";

interface SidebarProps {
  chats: ChatItem[];
  activeChat: ChatItem | null;
  onSelectChat: (chat: ChatItem) => void;
  onNewChat: () => void;
  onRenameChat: (chatId: string, title: string) => void;
  onDeleteChat: (chatId: string) => void;
  user: { id: string; name: string; email: string; profilePicture: string | null };
  onLogout: () => void;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const startRename = (chat: ChatItem) => {
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const confirmRename = (chatId: string) => {
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
    }
    setEditingId(null);
  };

  if (!sidebarOpen) {
    return (
      <div className="w-0 relative">
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-3 left-3 z-50 p-2 bg-chat-sidebar rounded-lg hover:bg-chat-hover transition-colors"
          title="Open sidebar"
        >
          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-[280px] min-w-[280px] bg-chat-sidebar flex flex-col h-full">
      {/* Header */}
      <div className="p-3 flex gap-2">
        <button
          onClick={onNewChat}
          className="flex-1 flex items-center gap-2 px-3 py-3 border border-chat-border rounded-lg hover:bg-chat-hover transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-3 border border-chat-border rounded-lg hover:bg-chat-hover transition-colors"
          title="Close sidebar"
        >
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {chats.length === 0 && (
          <div className="text-gray-500 text-sm text-center py-8">
            No chats yet. Start a new one!
          </div>
        )}
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
              activeChat?.id === chat.id
                ? "bg-chat-hover text-white"
                : "text-gray-300 hover:bg-chat-hover/50"
            }`}
            onClick={() => onSelectChat(chat)}
          >
            <svg className="w-4 h-4 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>

            {editingId === chat.id ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmRename(chat.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                onBlur={() => confirmRename(chat.id)}
                autoFocus
                className="flex-1 bg-chat-input text-white text-sm px-2 py-0.5 rounded outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate">{chat.title}</span>
            )}

            {/* Action buttons (visible on hover) */}
            {activeChat?.id === chat.id && editingId !== chat.id && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(chat);
                  }}
                  className="p-1 hover:text-white text-gray-500 transition-colors"
                  title="Rename"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this chat?")) onDeleteChat(chat.id);
                  }}
                  className="p-1 hover:text-red-400 text-gray-500 transition-colors"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* User info */}
      <div className="p-3 border-t border-chat-border">
        <div className="flex items-center gap-3 px-2 py-2">
          {user.profilePicture ? (
            <Image
              src={user.profilePicture}
              alt={user.name}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs text-gray-500 truncate">{user.email}</div>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 hover:bg-chat-hover rounded-lg transition-colors text-gray-500 hover:text-white"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
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

import { useEffect, useRef } from "react";
import { ChatItem, MessageItem } from "@/hooks/useChat";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import LoadingDots from "./LoadingDots";

interface ChatWindowProps {
  activeChat: ChatItem | null;
  messages: MessageItem[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  onSendMessage: (content: string, model?: string) => void;
  onNewChat: () => void;
  onDismissError: () => void;
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
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Empty state
  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-chat-bg">
        <div className="text-center space-y-6 max-w-lg px-4">
          <div className="w-14 h-14 mx-auto bg-gradient-to-br from-teal-400 to-blue-500 rounded-2xl flex items-center justify-center">
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
          <div>
            <h2 className="text-2xl font-medium text-white mb-2">AI Chat</h2>
            <p className="text-gray-400">
              Start a new conversation or select an existing one from the sidebar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              "Explain quantum computing in simple terms",
              "Write a Python function to sort a list",
              "What are the pros and cons of TypeScript?",
              "Help me debug my React component",
            ].map((suggestion, i) => (
              <button
                key={i}
                onClick={async () => {
                  await onNewChat();
                  // Small delay to ensure chat is created before sending
                  setTimeout(() => onSendMessage(suggestion), 100);
                }}
                className="text-left px-4 py-3 bg-chat-hover rounded-xl border border-chat-border hover:border-gray-500 transition-colors text-gray-300"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-chat-bg overflow-hidden">
      {/* Error bar */}
      {error && (
        <div className="bg-red-900/40 border-b border-red-800 px-4 py-2 flex items-center justify-between">
          <span className="text-red-300 text-sm">⚠️ {error}</span>
          <button
            onClick={onDismissError}
            className="text-red-400 hover:text-red-200 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <LoadingDots />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Send a message to start the conversation
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-6 px-4">
            {messages
              .filter((m) => m.role !== "system")
              .map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            {isSending && messages[messages.length - 1]?.content === "" && (
              <div className="py-4 flex justify-start">
                <LoadingDots />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput onSend={onSendMessage} disabled={isSending} />
    </div>
  );
}
```

### `frontend/src/components/MessageBubble.tsx`

```tsx
"use client";

import { MessageItem } from "@/hooks/useChat";
import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  message: MessageItem;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`py-5 ${
        isUser ? "bg-transparent" : "bg-transparent"
      }`}
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
              U
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center text-white text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-400 mb-1.5">
            {isUser ? "You" : "AI Assistant"}
          </div>
          <div className="message-content text-gray-200 leading-relaxed">
            {message.content ? (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            ) : (
              <span className="text-gray-500 italic">Thinking...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### `frontend/src/components/MessageInput.tsx`

```tsx
"use client";

import { useState, useRef, useEffect } from "react";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-chat-border bg-chat-bg p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-3 bg-chat-input rounded-xl border border-chat-border focus-within:border-gray-500 transition-colors px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none resize-none text-sm leading-6 max-h-[200px]"
          />
          <button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className={`p-1.5 rounded-lg transition-all ${
              input.trim() && !disabled
                ? "bg-teal-500 hover:bg-teal-600 text-white"
                : "text-gray-600 cursor-not-allowed"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19V5m0 0l-7 7m7-7l7 7"
              />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-600 text-center mt-2">
          AI can make mistakes. Verify important information.
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
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
    </div>
  );
}
```

---


---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/google` | No | Exchange Google credential for JWT |
| `GET` | `/api/auth/me` | Yes | Get current user info |
| `GET` | `/api/chats` | Yes | List user's chats |
| `POST` | `/api/chats` | Yes | Create new chat |
| `GET` | `/api/chats/:id` | Yes | Get specific chat |
| `PATCH` | `/api/chats/:id` | Yes | Rename chat |
| `DELETE` | `/api/chats/:id` | Yes | Soft-delete chat |
| `GET` | `/api/chats/:id/messages` | Yes | Get messages in chat |
| `POST` | `/api/chats/:id/messages` | Yes | Send message + get AI response |
| `GET` | `/api/models` | Yes | List available models |
| `GET` | `/api/health` | No | Health check |

### Message Request Body

```json
{
  "content": "Hello, how are you?",
  "model": "ollama/llama3.2",
  "stream": true
}
```

### Streaming Response (SSE)

```
data: {"content": "Hello"}
data: {"content": "! I'm"}
data: {"content": " doing well"}
data: {"done": true, "messageId": "uuid-here"}
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser (User)                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Next.js Frontend (:3000)                      │  │
│  │  ┌─────────┐  ┌──────────────┐  ┌─────────────────────┐   │  │
│  │  │ Google  │  │   Sidebar    │  │   Chat Window       │   │  │
│  │  │ Sign-In │  │  (chat list) │  │  (messages + input) │   │  │
│  │  └────┬────┘  └──────┬───────┘  └──────────┬──────────┘   │  │
│  └───────┼──────────────┼─────────────────────┼──────────────┘  │
│          │              │                     │                  │
└──────────┼──────────────┼─────────────────────┼──────────────────┘
           │              │                     │
           ▼              ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Express Backend (:4000)                        │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────────┐   │
│  │ Auth     │  │ Chat CRUD    │  │ Message Handler         │   │
│  │ (Google  │  │              │  │ (save → AI call → save) │   │
│  │  verify) │  │              │  │                         │   │
│  └────┬─────┘  └──────┬───────┘  └──────────┬──────────────┘   │
│       │               │                     │                   │
│       ▼               ▼                     ▼                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   PostgreSQL (:5432)                     │    │
│  │   users │ chats │ messages │ models                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                              │                   │
│                                              ▼                   │
│                                    ┌──────────────────┐          │
│                                    │ LiteLLM Proxy    │          │
│                                    │ (:4001)          │          │
│                                    │ OpenAI-compat    │          │
│                                    └────────┬─────────┘          │
│                                             │                    │
└─────────────────────────────────────────────┼────────────────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │     Ollama       │
                                    │   (:11434)       │
                                    │                  │
                                    │  llama3.2        │
                                    │  mistral         │
                                    │  gemma2          │
                                    └──────────────────┘
```