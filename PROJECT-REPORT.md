# AIChat – Comprehensive Technical Report

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack Deep Dive](#2-technology-stack-deep-dive)
3. [Architecture Overview](#3-architecture-overview)
4. [Security Architecture](#4-security-architecture)
5. [Database Design](#5-database-design)
6. [API Design](#6-api-design)
7. [Frontend Architecture](#7-frontend-architecture)
8. [AI Integration Layer](#8-ai-integration-layer)
9. [ER Diagram](#9-er-diagram)
10. [DFD Level 0 – Context Diagram](#10-dfd-level-0--context-diagram)
11. [DFD Level 1 – System Decomposition](#11-dfd-level-1--system-decomposition)
12. [DFD Level 2 – Process Decomposition](#12-dfd-level-2--process-decomposition)
13. [Data Flow & State Management](#13-data-flow--state-management)
14. [Component Interaction Map](#14-component-interaction-map)
15. [Performance & Scalability](#15-performance--scalability)
16. [Limitations & Future Scope](#16-limitations--future-scope)

---

## 1. Executive Summary

**AIChat** is a full-stack, privacy-first AI chat application that runs entirely on local infrastructure. It enables authenticated users to have multi-turn conversations with locally hosted Large Language Models (LLMs), with all message data stored in encrypted form in a relational database. No conversation data leaves the user's own server.

### Core Value Propositions

| Pillar | Implementation |
|---|---|
| **Privacy** | AES-256-GCM per-user encryption of all messages at rest |
| **Performance** | SSE-based streaming responses with real-time token delivery |
| **Security** | Google OAuth 2.0 + JWT, Helmet.js, Rate Limiting |
| **Flexibility** | LiteLLM proxy supports multiple Ollama models interchangeably |
| **Persistence** | PostgreSQL stores full chat history with soft-delete |
| **UX** | Next.js 16 with Tailwind CSS, markdown rendering, syntax highlighting |

---

## 2. Technology Stack Deep Dive

### 2.1 Backend Stack

```
Backend Runtime Environment
├── Runtime:        Node.js (ES2022 target)
├── Language:       TypeScript 5.6
├── Framework:      Express.js 4.21
├── Transpiler:     tsx (development hot-reload)
├── Compiler:       tsc (production build)
└── Process Mgr:    node dist/index.js (production)
```

#### Backend Dependencies Explained

| Package | Version | Purpose | Why Chosen |
|---|---|---|---|
| `express` | 4.21 | HTTP server framework | Mature, minimal, extensive middleware ecosystem |
| `cors` | 2.8.5 | Cross-Origin Resource Sharing | Restricts frontend origin, prevents CSRF-like issues |
| `helmet` | 7.1 | Security HTTP headers | Sets CSP, HSTS, X-Frame-Options automatically |
| `jsonwebtoken` | 9.0.2 | JWT sign/verify | Stateless auth tokens, no server-side session store needed |
| `google-auth-library` | 9.14.1 | Google OAuth2 token verification | Official Google SDK, prevents token forgery |
| `pg` | 8.13 | PostgreSQL client | Native PG driver with connection pooling |
| `openai` | 4.67.1 | OpenAI-compatible API client | LiteLLM exposes OpenAI-compatible endpoints |
| `express-rate-limit` | 7.4 | Request throttling | Prevents brute-force and DoS attacks |
| `winston` | 3.14.2 | Structured logging | JSON logs with timestamps for production observability |
| `uuid` | 10.0 | UUID generation | Used for temporary IDs if needed |
| `dotenv` | 16.4.5 | Environment variable loading | Keeps secrets out of source code |

#### Backend Dev Dependencies

| Package | Purpose |
|---|---|
| `tsx` | Hot-reload TypeScript execution without pre-compilation |
| `typescript` | Static type checking |
| `@types/*` | Type definitions for JavaScript libraries |

---

### 2.2 Frontend Stack

```
Frontend Runtime Environment
├── Framework:      Next.js 16.2 (App Router)
├── Language:       TypeScript 5.6
├── UI Library:     React 18.3
├── Styling:        Tailwind CSS 3.4
├── CSS Processing: PostCSS + Autoprefixer
└── Fonts:          Inter + JetBrains Mono (Google Fonts)
```

#### Frontend Dependencies Explained

| Package | Version | Purpose | Why Chosen |
|---|---|---|---|
| `next` | 16.2.2 | React meta-framework | SSR, routing, image optimization, API rewrites |
| `react` | 18.3.1 | UI component library | Concurrent rendering, hooks, virtual DOM |
| `react-dom` | 18.3.1 | DOM renderer | Required companion to React |
| `@react-oauth/google` | 0.12.1 | Google OAuth component | Pre-built Google Sign-In button with credential handling |
| `jwt-decode` | 4.0 | Client-side JWT decoding | Decodes token payload without verification (for display) |
| `react-markdown` | 9.0.1 | Markdown → HTML rendering | Renders AI markdown responses with proper formatting |
| `react-syntax-highlighter` | 16.1.1 | Code block highlighting | Syntax highlighting for code in AI responses |
| `tailwindcss` | 3.4.13 | Utility-first CSS | Rapid UI development, dark mode, custom design tokens |
| `autoprefixer` | 10.4.20 | CSS vendor prefixes | Cross-browser CSS compatibility |
| `postcss` | 8.4.47 | CSS transformation pipeline | Required by Tailwind |

---

### 2.3 Infrastructure Stack

```
Infrastructure Components
├── Database:       PostgreSQL (with uuid-ossp, pgcrypto extensions)
├── AI Runtime:     Ollama (local LLM server)
├── AI Proxy:       LiteLLM (OpenAI-compatible gateway)
└── Auth Provider:  Google OAuth 2.0
```

#### Infrastructure Component Details

| Component | Role | Configuration |
|---|---|---|
| **PostgreSQL** | Primary data store | Connection pool of 20, 5s timeout, cascade deletes |
| **Ollama** | LLM inference engine | Runs at localhost:11434, serves llama3.2, llama3.1, mistral, gemma2 |
| **LiteLLM** | Model routing proxy | Runs at localhost:4001, exposes OpenAI-compatible /v1 endpoints |
| **Google Cloud** | OAuth2 identity provider | Issues ID tokens verified server-side |

---

### 2.4 Cryptography Stack

```
Encryption Subsystem
├── Algorithm:      AES-256-GCM (authenticated encryption)
├── IV Size:        16 bytes (random per message)
├── Auth Tag:       16 bytes (GCM integrity tag)
├── Key Size:       32 bytes (256-bit)
├── KDF:            PBKDF2-SHA256
├── KDF Iterations: 100,000
└── Storage Format: base64(IV || AuthTag || Ciphertext)
```

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Next.js App (Port 3000)                   │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│  │  │ AuthContext   │  │  useChat     │  │   API Client     │  │   │
│  │  │ (Google OAuth)│  │  (State Mgmt)│  │   (lib/api.ts)   │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │   │
│  │                                                              │   │
│  │  ┌──────────┐  ┌─────────────┐  ┌──────────┐  ┌────────┐  │   │
│  │  │ Sidebar  │  │ ChatWindow  │  │ Message  │  │ Login  │  │   │
│  │  │          │  │             │  │ Bubble   │  │ Button │  │   │
│  │  └──────────┘  └─────────────┘  └──────────┘  └────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                          HTTP / SSE │ (rewrites via next.config.js)
                                    │
┌───────────────────────────────────▼─────────────────────────────────┐
│                     Express.js Backend (Port 4000)                   │
│                                                                      │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────────┐   │
│  │ Helmet  │  │   CORS   │  │Rate Limit │  │  JWT Auth MW     │   │
│  │ (Security│  │(Origin   │  │(3 tiers) │  │  (authMiddleware) │   │
│  │ Headers)│  │ Control) │  │           │  │                  │   │
│  └─────────┘  └──────────┘  └───────────┘  └──────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                         Routes Layer                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐ │   │
│  │  │ /api/auth   │  │ /api/chats  │  │ /api/chats/:id/msgs   │ │   │
│  │  │ (Google +   │  │ (CRUD ops)  │  │ (Stream + Encrypt)    │ │   │
│  │  │  JWT issue) │  │             │  │                        │ │   │
│  │  └─────────────┘  └─────────────┘  └──────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                       Services Layer                          │   │
│  │  ┌─────────────────────────┐  ┌──────────────────────────┐  │   │
│  │  │    encryption.ts         │  │         ai.ts             │  │   │
│  │  │  (AES-256-GCM + PBKDF2) │  │  (OpenAI SDK → LiteLLM)  │  │   │
│  │  └─────────────────────────┘  └──────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      database.ts (pg Pool)                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────┬──────────────────────┬───────────────────────┘
                        │                      │
               ┌────────▼───────┐    ┌─────────▼──────────┐
               │  PostgreSQL    │    │      LiteLLM        │
               │  (Port 5432)   │    │    (Port 4001)       │
               │                │    │                      │
               │  users         │    │  /v1/chat/completions│
               │  chats         │    │  (OpenAI-compatible) │
               │  messages      │    └─────────┬────────────┘
               │  models        │              │
               └────────────────┘    ┌─────────▼────────────┐
                                     │       Ollama           │
                                     │    (Port 11434)        │
                                     │                        │
                                     │  llama3.2 (default)   │
                                     │  llama3.1             │
                                     │  mistral              │
                                     │  gemma2               │
                                     └────────────────────────┘
```

---

## 4. Security Architecture

### 4.1 Authentication Flow

```
User                Browser              Backend              Google
 │                     │                    │                    │
 │  Click Sign In      │                    │                    │
 │────────────────────>│                    │                    │
 │                     │  Google OAuth Popup│                    │
 │                     │────────────────────────────────────────>│
 │                     │                    │    ID Token (JWT)  │
 │                     │<────────────────────────────────────────│
 │                     │                    │                    │
 │                     │  POST /api/auth/google                  │
 │                     │  { credential: "<google-id-token>" }    │
 │                     │───────────────────>│                    │
 │                     │                    │  verifyIdToken()   │
 │                     │                    │───────────────────>│
 │                     │                    │  Verified Payload  │
 │                     │                    │<───────────────────│
 │                     │                    │                    │
 │                     │                    │ createUser() in DB │
 │                     │                    │ Sign JWT (7d expiry)│
 │                     │  { token, user }   │                    │
 │                     │<───────────────────│                    │
 │                     │                    │                    │
 │  Store in           │                    │                    │
 │  localStorage       │                    │                    │
```

### 4.2 Request Authorization Flow

```
Every Protected Request:

Client                           Backend
  │                                 │
  │  GET /api/chats                 │
  │  Authorization: Bearer <JWT>    │
  │────────────────────────────────>│
  │                                 │
  │                          authMiddleware
  │                          jwt.verify(token, secret)
  │                          Attach req.user = { userId, email, name }
  │                                 │
  │                          Route Handler
  │                          Uses req.user.userId for DB queries
  │                          (User can only access own data)
  │                                 │
  │  200 OK { data }                │
  │<────────────────────────────────│
```

### 4.3 Encryption Architecture

```
Message Lifecycle:

WRITE PATH:
  plaintext
      │
      ▼
  deriveUserKey(googleId)
      │  PBKDF2(masterSecret, salt="aichat-user-key-v1:"+googleId, 100k iterations)
      ▼
  userKey (32 bytes)
      │
      ▼
  encryptMessage(plaintext, userKey)
      │  AES-256-GCM
      │  Random IV (16 bytes)
      │  Auth Tag (16 bytes)
      │  Ciphertext
      ▼
  base64(IV || AuthTag || Ciphertext)
      │
      ▼
  Stored in PostgreSQL messages.content

READ PATH:
  base64 blob from PostgreSQL
      │
      ▼
  decryptMessage(blob, userKey)
      │  Extract IV (bytes 0-15)
      │  Extract AuthTag (bytes 16-31)
      │  Extract Ciphertext (bytes 32+)
      │  AES-256-GCM Decrypt + Auth Verify
      ▼
  plaintext returned to caller
```

### 4.4 Rate Limiting Tiers

```
┌─────────────────────────────────────────────────────────────┐
│                     Rate Limit Tiers                         │
├──────────────────┬──────────────────┬───────────────────────┤
│  generalLimiter  │   authLimiter    │   messageLimiter      │
│                  │                  │                        │
│  ALL endpoints   │  /api/auth/*     │  POST messages         │
│                  │                  │                        │
│  300 req/15 min  │  30 req/15 min   │  20 req/1 min          │
│  (20 req/min)    │  (2 req/min)     │  (20 req/min)          │
└──────────────────┴──────────────────┴───────────────────────┘
```

---

## 5. Database Design

### 5.1 Schema Details

#### Table: `users`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Internal unique identifier |
| `google_id` | VARCHAR(255) | UNIQUE, NOT NULL | Google's sub claim (stable identifier) |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User's Google email |
| `name` | VARCHAR(255) | NOT NULL | User's display name |
| `profile_picture` | TEXT | NULLABLE | Google profile picture URL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update (trigger-managed) |

**Indexes:** `idx_users_google_id` (B-tree), `idx_users_email` (B-tree)

---

#### Table: `models`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `model_id` | UUID | PRIMARY KEY | Unique model identifier |
| `name` | VARCHAR(255) | UNIQUE, NOT NULL | Model name (e.g., "ollama/llama3.2") |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Registration timestamp |

**Seed Data:** ollama/llama3.2, ollama/llama3.1, ollama/mistral, ollama/gemma2

---

#### Table: `chats`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `chat_id` | UUID | PRIMARY KEY | Unique conversation identifier |
| `user_id` | UUID | NOT NULL, FK→users(user_id) ON DELETE CASCADE | Owner |
| `model_id` | UUID | FK→models(model_id), NULLABLE | Associated model |
| `title` | VARCHAR(500) | NOT NULL, DEFAULT 'New Chat' | Conversation title |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT FALSE | Soft-delete flag |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last message timestamp |

**Indexes:** `idx_chats_user_active` on (user_id, is_deleted, updated_at DESC)

---

#### Table: `messages`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `message_id` | UUID | PRIMARY KEY | Unique message identifier |
| `chat_id` | UUID | NOT NULL, FK→chats(chat_id) ON DELETE CASCADE | Parent conversation |
| `role` | VARCHAR(20) | NOT NULL, CHECK IN ('system','user','assistant') | Message author role |
| `content` | TEXT | NOT NULL | AES-256-GCM encrypted ciphertext |
| `model_name` | VARCHAR(255) | NULLABLE | Model used for assistant messages |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Message timestamp |

**Indexes:** `idx_messages_chat_created` on (chat_id, created_at ASC)

---

### 5.2 Database Triggers

```sql
-- Automatically updates updated_at on row change
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 6. API Design

### 6.1 REST Endpoints

```
┌────────────────────────────────────────────────────────────────────┐
│                        API ENDPOINTS                                │
├────────────────────────────────────────────────────────────────────┤
│  AUTH                                                               │
│  POST   /api/auth/google          Verify Google token, issue JWT   │
│  GET    /api/auth/me              Get current user profile         │
├────────────────────────────────────────────────────────────────────┤
│  CHATS  (requires: Authorization: Bearer <JWT>)                     │
│  GET    /api/chats                List user's active chats         │
│  POST   /api/chats                Create new chat                  │
│  GET    /api/chats/:chatId        Get chat details                 │
│  PATCH  /api/chats/:chatId        Rename chat                      │
│  DELETE /api/chats/:chatId        Soft-delete chat                 │
├────────────────────────────────────────────────────────────────────┤
│  MESSAGES  (requires: Authorization: Bearer <JWT>)                  │
│  GET    /api/chats/:chatId/messages    List decrypted messages     │
│  POST   /api/chats/:chatId/messages    Send message + get AI resp  │
├────────────────────────────────────────────────────────────────────┤
│  SYSTEM                                                             │
│  GET    /api/models               List available AI models         │
│  GET    /api/health               Database connectivity check      │
└────────────────────────────────────────────────────────────────────┘
```

### 6.2 Streaming Message Protocol (SSE)

```
POST /api/chats/:chatId/messages
Body: { content: "user message", model: "ollama/llama3.2", stream: true }

Response Headers:
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive
  X-Accel-Buffering: no

Stream Events:
  : ping                              ← Keep-alive (every 3s while thinking)

  data: {"content": "Hello"}          ← Token chunk
  data: {"content": " there"}         ← Token chunk
  data: {"content": "!"}              ← Token chunk

  data: {"done": true, "messageId": "<uuid>"}   ← Completion

  data: {"error": "AI request failed"}           ← Error case
```

---

## 7. Frontend Architecture

### 7.1 Page Structure

```
Next.js App Router
├── / (page.tsx)
│   └── Public landing page
│       ├── Feature grid
│       ├── LoginButton (Google OAuth)
│       └── Redirect to /chat if authenticated
│
└── /chat (chat/page.tsx)
    └── Protected chat page
        ├── Sidebar (chat list, user profile)
        └── ChatWindow (messages, input)
```

### 7.2 State Management Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    State Architecture                         │
│                                                              │
│  AuthContext (React Context)                                 │
│  ├── user: User | null                                      │
│  ├── token: string | null                                   │
│  ├── loading: boolean                                       │
│  ├── login(credential): Promise<void>                       │
│  └── logout(): void                                         │
│       │                                                     │
│       │ Persisted in localStorage                           │
│       │ (auth_token, auth_user)                             │
│                                                              │
│  useChat (Custom Hook)                                       │
│  ├── chats: ChatItem[]           ← All user chats           │
│  ├── activeChat: ChatItem|null   ← Selected conversation    │
│  ├── messages: MessageItem[]     ← Current chat messages    │
│  ├── isLoading: boolean          ← Data fetching state      │
│  ├── isSending: boolean          ← Message sending state    │
│  ├── error: string|null          ← Error state              │
│  └── activeChatRef: Ref          ← Stable ref for callbacks │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 API Client (Singleton Pattern)

```typescript
class ApiClient {
  private token: string | null = null;

  // Token management
  setToken(token) / getToken()

  // Auth endpoints
  loginWithGoogle(credential)
  getMe()

  // Chat CRUD
  getChats()
  createChat(title?)
  updateChat(chatId, title)
  deleteChat(chatId)

  // Messages
  getMessages(chatId)
  sendMessage(chatId, content, model?)         // Non-streaming
  sendMessageStream(                           // SSE streaming
    chatId, content,
    onChunk, onDone, onError, model?
  )

  // Models
  getModels()
}

export const api = new ApiClient();  // Singleton
```

### 7.4 Component Tree

```
ChatPage
├── Sidebar
│   ├── SearchInput
│   ├── ChatItemRow (×N)
│   │   └── ContextMenu (Rename | Delete)
│   ├── DeleteModal (conditional)
│   └── UserPanel (avatar, name, logout)
│
└── ChatWindow
    ├── ChatHeader (title, streaming indicator)
    ├── ErrorBar (conditional)
    ├── MessagesArea
    │   └── MessageBubble (×N)
    │       ├── Avatar
    │       ├── SenderInfo (name, time, model badge)
    │       ├── MessageBody
    │       │   ├── ReactMarkdown (assistant)
    │       │   │   └── SyntaxHighlighter (code blocks)
    │       │   └── PlainText (user)
    │       ├── TypingCursor (streaming only)
    │       └── CopyMessageButton
    ├── ScrollToBottomButton (conditional)
    └── MessageInput
        ├── AutoResizeTextarea
        ├── CharacterCounter (>500 chars)
        └── SendButton (with loading spinner)
```

---

## 8. AI Integration Layer

### 8.1 LiteLLM as OpenAI-Compatible Proxy

```
Backend (OpenAI SDK)
        │
        │ POST /v1/chat/completions
        │ { model: "ollama/llama3.2", messages: [...] }
        │
        ▼
  LiteLLM (Port 4001)
        │
        │ Routes to appropriate Ollama model
        │ Handles retries (2 retries)
        │ 300s timeout
        │
        ▼
  Ollama (Port 11434)
        │
        │ Runs inference locally on GPU/CPU
        │
        ▼
  Token stream returned
```

### 8.2 Context Management

```
trimMessages algorithm:

Input: all chat messages (up to unlimited)
Config: maxMessagesContext = 50

Logic:
  1. Separate system messages from non-system messages
  2. Keep ALL system messages
  3. Take last (50 - count(system)) non-system messages
  4. Concatenate: [system messages] + [recent messages]

Output: Trimmed context ≤ 50 messages

Purpose: Prevent exceeding model context windows
```

### 8.3 Message Processing Pipeline

```
User sends message
        │
        ▼
Validate content (non-empty string)
        │
        ▼
Verify chat ownership (getChatById)
        │
        ▼
Get user's Google ID (for encryption key)
        │
        ▼
Save user message (encrypted → DB)
        │
        ▼
Load full chat history (decrypt all messages)
        │
        ▼
Trim to context window (max 50 messages)
        │
        ▼
Add system prompt if not present
        │
        ▼
Send to LiteLLM → Ollama
        │
        ├──── STREAMING ────────────────────────────────────┐
        │   Set SSE headers                                  │
        │   Start keepalive ping (3s interval)              │
        │   Iterate AsyncGenerator chunks                   │
        │   Write "data: {content}" for each chunk          │
        │   Clear keepalive on first chunk                  │
        │   Accumulate fullResponse                         │
        │   Save assistant message (encrypted)              │
        │   Auto-title chat if first message                │
        │   Write "data: {done, messageId}"                 │
        │   res.end()                                       │
        │                                                   │
        └──── NON-STREAMING ────────────────────────────────┘
            Await complete response
            Save assistant message (encrypted)
            Auto-title chat if first message
            Return JSON { userMessage, assistantMessage }
```

---

## 9. ER Diagram

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                        ENTITY-RELATIONSHIP DIAGRAM                        ║
║                               AIChat Database                              ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────┐
│            USERS                │
├─────────────────────────────────┤
│ PK  user_id       UUID          │
│     google_id     VARCHAR(255)  │◄─── UNIQUE (from Google OAuth sub)
│     email         VARCHAR(255)  │◄─── UNIQUE
│     name          VARCHAR(255)  │
│     profile_picture TEXT        │
│     created_at    TIMESTAMPTZ   │
│     updated_at    TIMESTAMPTZ   │
└──────────────┬──────────────────┘
               │
               │ 1 (one user)
               │
               │ has many
               │
               ▼ N (many chats)
┌─────────────────────────────────┐        ┌─────────────────────────────┐
│            CHATS                │        │           MODELS             │
├─────────────────────────────────┤        ├─────────────────────────────┤
│ PK  chat_id       UUID          │        │ PK  model_id    UUID        │
│ FK  user_id       UUID ─────────┼──────► │     name        VARCHAR(255)│
│ FK  model_id      UUID ─────────┼──────► │     created_at  TIMESTAMPTZ │
│     title         VARCHAR(500)  │        └─────────────────────────────┘
│     is_deleted    BOOLEAN       │
│     created_at    TIMESTAMPTZ   │
│     updated_at    TIMESTAMPTZ   │
└──────────────┬──────────────────┘
               │
               │ 1 (one chat)
               │
               │ has many
               │
               ▼ N (many messages)
┌─────────────────────────────────┐
│          MESSAGES               │
├─────────────────────────────────┤
│ PK  message_id    UUID          │
│ FK  chat_id       UUID ─────────┼──────► (back to CHATS)
│     role          VARCHAR(20)   │◄─── CHECK: 'system'|'user'|'assistant'
│     content       TEXT          │◄─── AES-256-GCM encrypted ciphertext
│     model_name    VARCHAR(255)  │◄─── Which Ollama model responded
│     created_at    TIMESTAMPTZ   │
└─────────────────────────────────┘

CARDINALITIES:
  USERS    ──< CHATS     : One user has zero-or-many chats
  CHATS    ──< MESSAGES  : One chat has zero-or-many messages
  MODELS   ─── CHATS     : One model can be referenced by many chats (optional)

CASCADE RULES:
  DELETE USERS  → CASCADE DELETE CHATS
  DELETE CHATS  → CASCADE DELETE MESSAGES
  (Soft-delete on CHATS via is_deleted flag before hard delete)

INDEXES:
  users.google_id           B-tree (auth lookup)
  users.email               B-tree (unique constraint)
  chats(user_id,            Composite B-tree
        is_deleted,         (sidebar listing - most common query)
        updated_at DESC)
  messages(chat_id,         Composite B-tree
           created_at ASC)  (chat history retrieval)
```

---

## 10. DFD Level 0 – Context Diagram

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    DFD LEVEL 0 – CONTEXT DIAGRAM                          ║
║                         AIChat System                                       ╚═══════════════════════════════════════════════════════════════════════════╝


                    ┌─────────────────┐
                    │                 │
                    │   END USER      │
                    │  (Web Browser)  │
                    │                 │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         │ Google Credential │ Chat Requests     │ View Responses
         │ (ID Token)        │ (Messages, CRUD)  │ (Messages, History)
         │                   │                   │
         ▼                   ▼                   │
╔════════════════════════════════════════════╗   │
║                                            ║   │
║           AIChat Application System         ║───┘
║                                            ║
║   (Next.js Frontend + Express Backend      ║
║    + PostgreSQL + LiteLLM + Ollama)        ║
║                                            ║
╚════════════════════════════════════════════╝
         │                   │                   ▲
         │                   │                   │
         │ Identity Verify   │ Model Inference   │ AI Response
         │ Request           │ Request           │ (Tokens/Text)
         ▼                   ▼                   │
┌─────────────────┐ ┌────────────────────────────┴──┐
│                 │ │                                │
│  Google OAuth   │ │   Ollama LLM Engine            │
│  2.0 Server     │ │   (via LiteLLM Proxy)          │
│                 │ │   llama3.2 / mistral / gemma2  │
│ (External Auth  │ │                                │
│  Identity       │ │   (Local Infrastructure)       │
│  Provider)      │ │                                │
└─────────────────┘ └────────────────────────────────┘

═══════════════════════════════════════════════════════
EXTERNAL ENTITIES:
  1. End User        – Initiates all interactions
  2. Google OAuth    – Verifies user identity
  3. Ollama Engine   – Performs LLM inference

SYSTEM BOUNDARY:
  The AChat Application System processes all data flows
  between these three external entities.
═══════════════════════════════════════════════════════
```

---

## 11. DFD Level 1 – System Decomposition

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    DFD LEVEL 1 – SYSTEM PROCESSES                         ║
╚═══════════════════════════════════════════════════════════════════════════╝

┌──────────┐                                              ┌──────────────┐
│          │                                              │              │
│  USER    │                                              │ Google OAuth │
│          │                                              │   Server     │
└────┬─────┘                                              └──────┬───────┘
     │                                                           │
     │ Google ID Token                                           │
     │─────────────────────────────────────────────────────────>│
     │                                                           │
     │         ┌─────────────────────────────────────┐          │
     │         │                                     │          │
     │         │   PROCESS 1                         │          │
     │─────────┤   AUTHENTICATE USER                 │          │
     │         │                                     │<─────────│
     │         │   • Receive Google credential        │  Token   │
     │         │   • Call googleClient.verifyIdToken  │  Verified│
     │         │   • Extract (sub, email, name, pic)  │  Payload │
     │         │   • createUser() / upsert in DB      │          │
     │         │   • Sign JWT (7-day expiry)           │          │
     │         │   • Return { token, user }            │          │
     │         └────────────────┬────────────────────┘          │
     │<────────────────────────┘│                               │
     │  JWT Token + User Object  │                               │
     │                           │ Write/Read User Record        │
     │                           ▼                               │
     │                    ┌─────────────┐                        │
     │                    │  D1: USERS  │                        │
     │                    │  (Database) │                        │
     │                    └─────────────┘                        │
     │                                                           │
     │ JWT in Authorization Header                               │
     │─────────────────────────────────────────────────────────┐ │
     │         ┌───────────────────────────────────────────────┘ │
     │         │                                                  │
     │         │   PROCESS 2                                      │
     │         │   MANAGE CHATS                                   │
     │         │                                                  │
     │         │   • Validate JWT (authMiddleware)                │
     │         │   • List / Create / Rename / Delete chats        │
     │         │   • Soft-delete (is_deleted=TRUE)                │
     │         │   • Group by date for sidebar display            │
     │         └────────────────┬─────────────────────────────┐  │
     │<────────────────────────┘│                             │  │
     │  Chat List / Chat Object  │ Write/Read Chat Records     │  │
     │                           ▼                             │  │
     │                    ┌─────────────┐                      │  │
     │                    │  D2: CHATS  │                      │  │
     │                    │  (Database) │                      │  │
     │                    └─────────────┘                      │  │
     │                                                         │  │
     │ Message Content + Chat ID                               │  │
     │─────────────────────────────────────────────────────┐  │  │
     │         ┌───────────────────────────────────────────┘  │  │
     │         │                                               │  │
     │         │   PROCESS 3                                   │  │
     │         │   PROCESS MESSAGE                             │  │
     │         │                                               │  │
     │         │   3a. Validate content                        │  │
     │         │   3b. Verify chat ownership                   │  │
     │         │   3c. Get googleId for key derivation         │  │
     │         │   3d. Encrypt user message → store in DB      │  │
     │         │   3e. Load+decrypt history for AI context     │  │
     │         │   3f. Call AI service (stream/non-stream)     │  │
     │         │   3g. Encrypt AI response → store in DB       │  │
     │         │   3h. Auto-title chat (first message)         │  │
     │         │   3i. Return decrypted content to user        │  │
     │         └──────────┬────────────────────┬──────────────┘  │
     │                    │                    │                  │
     │  Encrypted msgs     ▼                   │                  │
     │  written to DB ┌──────────────┐         │                  │
     │                │ D3: MESSAGES │         │                  │
     │                │  (Database)  │         │                  │
     │                └──────────────┘         │                  │
     │                                         │ Model Inference   │
     │                                         │ Request           │
     │                                         ▼                  │
     │                              ┌─────────────────────┐       │
     │                              │   PROCESS 4          │       │
     │                              │   AI INFERENCE        │       │
     │                              │                      │       │
     │                              │   • Build message    │       │
     │                              │     array w/ system  │       │
     │                              │     prompt           │       │
     │                              │   • Trim to 50 msgs  │       │
     │                              │   • POST to LiteLLM  │       │
     │                              │   • Stream tokens or │       │
     │                              │     await full resp  │       │
     │                              └──────────────────────┘       │
     │                                         │                  │
     │                                         │ /v1/chat/completions
     │                                         ▼                  │
     │                              ┌─────────────────────┐       │
     │                              │   LiteLLM Proxy      │       │
     │                              │   (Port 4001)        │       │
     │                              └──────────────────────┘       │
     │                                         │                  │
     │                                         ▼                  │
     │                              ┌─────────────────────┐       │
     │                              │   Ollama Engine      │       │
     │                              │   (Port 11434)       │       │
     │                              │   D4: MODELS         │       │
     │                              └──────────────────────┘       │
     │                                                             │
     │  SSE Stream / JSON Response                                  │
     │<────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
DATA STORES:
  D1: USERS    – PostgreSQL users table
  D2: CHATS    – PostgreSQL chats table
  D3: MESSAGES – PostgreSQL messages table (encrypted content)
  D4: MODELS   – PostgreSQL models table + Ollama model files

PROCESSES:
  P1: Authenticate User
  P2: Manage Chats
  P3: Process Message
  P4: AI Inference
═══════════════════════════════════════════════════════════════
```

---

## 12. DFD Level 2 – Process Decomposition

### 12.1 P3 Expanded: Process Message

```
╔═══════════════════════════════════════════════════════════════════════════╗
║              DFD LEVEL 2 – PROCESS 3: PROCESS MESSAGE                     ║
╚═══════════════════════════════════════════════════════════════════════════╝

   User Input (content, chatId)
              │
              ▼
     ┌────────────────────┐
     │  P3.1              │
     │  VALIDATE INPUT    │
     │                    │
     │  • content non-    │
     │    empty string    │
     │  • chatId present  │
     └────────┬───────────┘
              │ Valid input
              ▼
     ┌────────────────────┐
     │  P3.2              │
     │  VERIFY OWNERSHIP  │◄──── D2: CHATS (getChatById)
     │                    │
     │  • getChatById()   │
     │  • user_id matches │
     │  • is_deleted=FALSE│
     └────────┬───────────┘
              │ Authorized
              ▼
     ┌────────────────────┐
     │  P3.3              │
     │  DERIVE ENC KEY    │◄──── D1: USERS (google_id lookup)
     │                    │
     │  • getGoogleId()   │
     │  • deriveUserKey() │
     │    PBKDF2(master,  │
     │    salt+googleId)  │
     └────────┬───────────┘
              │ userKey (32 bytes)
              ▼
     ┌────────────────────┐
     │  P3.4              │
     │  ENCRYPT & STORE   │───► D3: MESSAGES (INSERT encrypted)
     │  USER MESSAGE      │
     │                    │
     │  • AES-256-GCM     │
     │  • Random IV       │
     │  • base64 encode   │
     │  • INSERT to DB    │
     │  • Touch chat      │
     │    updated_at      │
     └────────┬───────────┘
              │
              ▼
     ┌────────────────────┐
     │  P3.5              │
     │  LOAD & DECRYPT    │◄──── D3: MESSAGES (SELECT all for chat)
     │  HISTORY           │
     │                    │
     │  • SELECT messages │
     │  • For each msg:   │
     │    detect encrypted│
     │    decryptMessage()│
     │  • Return plaintext│
     └────────┬───────────┘
              │ Decrypted message array
              ▼
     ┌────────────────────┐
     │  P3.6              │
     │  BUILD AI CONTEXT  │
     │                    │
     │  • Add system      │
     │    prompt if absent│
     │  • trimMessages()  │
     │    keep last 50    │
     └────────┬───────────┘
              │ Context messages[]
              ▼
     ┌────────────────────────────────────────────┐
     │  P3.7 CALL AI SERVICE                       │
     │                                             │
     │  ┌──────────────────┐  ┌─────────────────┐ │
     │  │ STREAMING (SSE)  │  │  NON-STREAMING  │ │
     │  │                  │  │                 │ │
     │  │ Set SSE headers  │  │ getAIResponse() │ │
     │  │ Start keepalive  │  │ await full resp │ │
     │  │ getAIResponseStr │  │                 │ │
     │  │ Iterate chunks   │  │                 │ │
     │  │ Write SSE events │  │                 │ │
     │  │ Clear keepalive  │  │                 │ │
     │  └──────────────────┘  └─────────────────┘ │
     └────────────────────────────────────────────┘
              │ AI response text
              ▼
     ┌────────────────────┐
     │  P3.8              │
     │  ENCRYPT & STORE   │───► D3: MESSAGES (INSERT encrypted)
     │  AI RESPONSE       │
     │                    │
     │  • AES-256-GCM     │
     │  • Atomic txn with │
     │    chat touch      │
     └────────┬───────────┘
              │
              ▼
     ┌────────────────────┐
     │  P3.9              │
     │  AUTO-TITLE CHAT   │───► D2: CHATS (UPDATE title)
     │  (if first msg)    │
     │                    │
     │  • Count user msgs │
     │  • If count ≤ 1:   │
     │    title = first   │
     │    60 chars of msg │
     └────────┬───────────┘
              │
              ▼
     Return decrypted response to User
```

### 12.2 P1 Expanded: Authentication

```
╔═══════════════════════════════════════════════════════════════════════════╗
║           DFD LEVEL 2 – PROCESS 1: AUTHENTICATE USER                      ║
╚═══════════════════════════════════════════════════════════════════════════╝

   Google ID Token (from browser)
              │
              ▼
     ┌────────────────────┐
     │  P1.1              │
     │  VERIFY GOOGLE     │──────────────────► Google OAuth Server
     │  TOKEN             │◄────────────────── Verified Payload
     │                    │                   (sub, email, name, picture)
     │  googleClient.     │
     │  verifyIdToken()   │
     └────────┬───────────┘
              │ Valid payload
              ▼
     ┌────────────────────┐
     │  P1.2              │
     │  UPSERT USER       │◄──► D1: USERS
     │                    │
     │  • ON CONFLICT     │     INSERT new user
     │    (google_id)     │     OR UPDATE existing
     │    DO UPDATE email,│     (email/name/pic may
     │    name, pic       │      have changed)
     └────────┬───────────┘
              │ User record
              ▼
     ┌────────────────────┐
     │  P1.3              │
     │  ISSUE JWT         │
     │                    │
     │  jwt.sign({        │
     │    userId,         │
     │    email,          │
     │    name            │
     │  }, secret,        │
     │  { expiresIn: '7d'}│
     │  )                 │
     └────────┬───────────┘
              │ JWT Token
              ▼
     ┌────────────────────┐
     │  P1.4              │
     │  SEND RESPONSE     │
     │                    │
     │  { token, user }   │
     │  → Browser stores  │
     │    in localStorage │
     └────────────────────┘
```

### 12.3 P4 Expanded: AI Inference

```
╔═══════════════════════════════════════════════════════════════════════════╗
║           DFD LEVEL 2 – PROCESS 4: AI INFERENCE                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

   Context Messages[] + Model Name
              │
              ▼
     ┌────────────────────┐
     │  P4.1              │
     │  PREPARE REQUEST   │
     │                    │
     │  • Add system      │
     │    prompt if needed│
     │  • Trim to 50 msgs │
     │  • Set temperature │
     │    0.7             │
     │  • Set max_tokens  │
     │    4096            │
     └────────┬───────────┘
              │ Prepared request body
              ▼
     ┌────────────────────┐
     │  P4.2              │
     │  CALL LiteLLM      │
     │                    │──► POST http://localhost:4001/v1/chat/completions
     │  openai.chat.      │    Authorization: Bearer sk-litellm-xxx
     │  completions.      │    { model, messages, temperature, max_tokens }
     │  create()          │
     └────────┬───────────┘
              │
              ▼
     ┌────────────────────┐
     │  P4.3              │
     │  LiteLLM ROUTING   │
     │                    │
     │  • Match model name│──► POST http://localhost:11434/api/chat
     │    in config.yaml  │    { model: "llama3.2", messages: [...] }
     │  • Forward to      │
     │    Ollama endpoint │
     │  • Handle retries  │
     │    (max 2)         │
     └────────┬───────────┘
              │
              ▼
     ┌────────────────────┐
     │  P4.4              │
     │  OLLAMA INFERENCE  │
     │                    │
     │  • Load model      │
     │  • Run inference   │
     │  • Stream tokens   │
     └────────┬───────────┘
              │ Token stream / complete response
              ▼
     ┌────────────────────────────────────────────┐
     │  P4.5 STREAM HANDLING                       │
     │                                             │
     │  STREAMING:                NON-STREAMING:   │
     │  for await (chunk of       completion =     │
     │    stream) {               await create()   │
     │    yield chunk.            return content   │
     │    choices[0].             from choices[0]  │
     │    delta.content           .message.content │
     │  }                                          │
     └────────────────────────────────────────────┘
              │ AsyncGenerator<string> OR string
              ▼
     Return to P3.7 (Process Message)
```
### 12.4 P3 Expanded:  MANAGE CHATS 

```
╔═══════════════════════════════════════════════════════════════════════════╗
║              DFD LEVEL 2 – PROCESS 2: MANAGE CHATS                        ║
╚═══════════════════════════════════════════════════════════════════════════╝

   JWT Token (Authorization Header)
              │
              ▼
     ┌────────────────────┐
     │  P2.1              │
     │  VALIDATE JWT      │
     │                    │
     │  • verifyToken()   │
     │  • extract user_id │
     │  • check expiry    │
     └────────┬───────────┘
              │ Authenticated user
              ▼
     ┌────────────────────┐
     │  P2.2              │
     │  FETCH USER CHATS  │◄──── D2: CHATS (SELECT)
     │                    │
     │  • WHERE user_id   │
     │  • is_deleted=FALSE│
     │  • ORDER BY        │
     │    updated_at DESC │
     └────────┬───────────┘
              │ Chat list
              ▼
     ┌────────────────────┐
     │  P2.3              │
     │  FORMAT CHAT LIST  │
     │                    │
     │  • Group by date   │
     │  • Sort for UI     │
     │  • Sidebar format  │
     └────────┬───────────┘
              │ Formatted chats
              ▼
     Return Chat List to User


═══════════════════════════════════════════════════════════════
   CREATE CHAT FLOW
═══════════════════════════════════════════════════════════════

   New Chat Data (title, model_id)
              │
              ▼
     ┌────────────────────┐
     │  P2.4              │
     │  CREATE CHAT       │◄──── D4: MODELS (validate model)
     │                    │
     │  • validate model  │
     │  • INSERT chat     │
     │  • set user_id     │
     │  • is_deleted=FALSE│
     │  • timestamps      │
     └────────┬───────────┘
              │
              ▼
     ┌───────────────┐
     │ D2: CHATS     │
     │ (INSERT)      │
     └───────────────┘
              │
              ▼
     Return New Chat to User


═══════════════════════════════════════════════════════════════
   RENAME CHAT FLOW
═══════════════════════════════════════════════════════════════

   Chat ID + New Title
              │
              ▼
     ┌────────────────────┐
     │  P2.5              │
     │  VERIFY OWNERSHIP  │◄──── D2: CHATS (SELECT)
     │                    │
     │  • getChatById()   │
     │  • user_id match   │
     └────────┬───────────┘
              │ Authorized
              ▼
     ┌────────────────────┐
     │  P2.6              │
     │  UPDATE TITLE      │───► D2: CHATS (UPDATE)
     │                    │
     │  • update title    │
     │  • touch updated_at│
     └────────┬───────────┘
              │
              ▼
     Return Updated Chat


═══════════════════════════════════════════════════════════════
   DELETE CHAT (SOFT DELETE)
═══════════════════════════════════════════════════════════════

   Chat ID
              │
              ▼
     ┌────────────────────┐
     │  P2.7              │
     │  VERIFY OWNERSHIP  │◄──── D2: CHATS (SELECT)
     │                    │
     │  • ensure user_id  │
     │  • check exists    │
     └────────┬───────────┘
              │ Authorized
              ▼
     ┌────────────────────┐
     │  P2.8              │
     │  SOFT DELETE CHAT  │───► D2: CHATS (UPDATE)
     │                    │
     │  • is_deleted=TRUE │
     │  • preserve data   │
     └────────┬───────────┘
              │
              ▼
     Return Deletion Status


═══════════════════════════════════════════════════════════════
DATA STORES:
  D2: CHATS   – PostgreSQL chats table
  D4: MODELS  – Model reference validation

PROCESS SUMMARY:
  P2.1: Validate JWT
  P2.2: Fetch User Chats
  P2.3: Format Chat List
  P2.4: Create Chat
  P2.5: Verify Ownership
  P2.6: Update Title
  P2.7: Verify Ownership (Delete)
  P2.8: Soft Delete Chat
═══════════════════════════════════════════════════════════════
```
---

## 13. Data Flow & State Management

### 13.1 Streaming Message Data Flow

```
Browser (React)                 Next.js         Express Backend
      │                                              │
      │  User types message                          │
      │  Clicks Send (Enter)                         │
      │                                              │
      │  useChat.sendMessage(content)                │
      │                                              │
      │  1. Optimistic UI update:                    │
      │     setMessages([...prev,                    │
      │       tempUserMsg,   ← immediate             │
      │       tempAssistantMsg {content:""}          │
      │     ])                                       │
      │                                              │
      │  2. api.sendMessageStream(chatId, content)   │
      │─────────────────────────────────────────────>│
      │  POST /api/chats/:id/messages                │
      │  { content, stream: true }                   │
      │                                              │
      │                                   Validate + Auth
      │                                   Encrypt user msg → DB
      │                                   Load history (decrypt)
      │                                   Call LiteLLM stream
      │                                              │
      │  Response: text/event-stream                 │
      │<─────────────────────────────────────────────│
      │                                              │
      │  : ping\n\n          ← keepalive             │
      │<─────────────────────────────────────────────│
      │                                              │
      │  data: {"content":"Hello"}\n\n               │
      │<─────────────────────────────────────────────│
      │  onChunk("Hello")                            │
      │  setMessages: update tempAssistantMsg        │
      │  content += "Hello"                          │
      │                                              │
      │  data: {"content":" world"}\n\n              │
      │<─────────────────────────────────────────────│
      │  content += " world"                         │
      │                                              │
      │  data: {"done":true,"messageId":"uuid"}\n\n  │
      │<─────────────────────────────────────────────│
      │  onDone("uuid")                              │
      │  Replace tempAssistantId with real uuid      │
      │  fetchChats() to refresh sidebar titles      │
      │                                              │
```

### 13.2 Authentication State Flow

```
App Startup
     │
     ▼
useEffect in AuthContext
     │
     │  localStorage.getItem("auth_token")
     │  localStorage.getItem("auth_user")
     │
     ├── Token Found ──►  api.setToken(savedToken)
     │                    setUser(parsedUser)
     │                    setLoading(false)
     │                         │
     │                         ▼
     │                    Protected routes accessible
     │
     └── No Token ──────► setLoading(false)
                           user = null
                                │
                                ▼
                           Redirect to / (login page)

Login Event:
     │
     ▼
Google OAuth credential received
     │
     ▼
api.loginWithGoogle(credential)
     │
     ▼
Backend: verify → upsert → JWT
     │
     ▼
AuthContext: setUser + setToken
localStorage: save token + user
api.setToken(token)
     │
     ▼
router.push("/chat")

Logout Event:
     │
     ▼
AuthContext: clear user + token
localStorage: removeItem × 2
api.setToken(null)
     │
     ▼
All subsequent API calls fail (401)
User stays on/redirects to / page
```

---

## 14. Component Interaction Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND COMPONENT INTERACTIONS                   │
└─────────────────────────────────────────────────────────────────────┘

GoogleOAuthProvider (wraps entire app)
└── AuthProvider (React Context)
    │
    ├── layout.tsx (RootLayout)
    │   ├── page.tsx (HomePage - public)
    │   │   └── LoginButton
    │   │       └── GoogleLogin (from @react-oauth/google)
    │   │           └── onSuccess → AuthContext.login()
    │   │
    │   └── chat/page.tsx (ChatPage - protected)
    │       │
    │       ├── useAuth() ← reads AuthContext
    │       │   (user, loading, logout)
    │       │
    │       ├── useChat() ← custom hook
    │       │   ├── State: chats, activeChat, messages, isLoading, isSending, error
    │       │   ├── fetchChats() → api.getChats()
    │       │   ├── loadChat() → api.getMessages()
    │       │   ├── createNewChat() → api.createChat()
    │       │   ├── sendMessage() → api.sendMessageStream()
    │       │   ├── renameChat() → api.updateChat()
    │       │   └── deleteChat() → api.deleteChat()
    │       │
    │       ├── Sidebar (receives: chats, activeChat, user, callbacks)
    │       │   ├── Reads: useChat state via props
    │       │   ├── Emits: onSelectChat, onNewChat, onRenameChat, onDeleteChat, onLogout
    │       │   ├── Internal State: isOpen, search, deleteConfirmId
    │       │   ├── groupChatsByDate() utility
    │       │   ├── ChatItemRow × N
    │       │   │   ├── Internal State: editing, title, menuOpen
    │       │   │   ├── Emits: onSelect, onRename, onDelete
    │       │   │   └── ContextMenu (Rename | Delete)
    │       │   ├── DeleteModal (conditional)
    │       │   └── UserPanel (Image/Avatar, name, email, logout btn)
    │       │
    │       └── ChatWindow (receives: activeChat, messages, states, callbacks)
    │           ├── Reads: useChat state via props
    │           ├── Emits: onSendMessage, onNewChat, onDismissError
    │           ├── Internal State: showScrollBtn, isCreating
    │           ├── ChatHeader (title, streaming indicator)
    │           ├── ErrorBar (conditional)
    │           ├── MessagesArea (scrollable)
    │           │   └── MessageBubble × N
    │           │       ├── Props: message, isStreaming
    │           │       ├── Avatar (user/assistant differentiated)
    │           │       ├── SenderInfo (name, timestamp, model badge)
    │           │       ├── ReactMarkdown (assistant messages)
    │           │       │   └── SyntaxHighlighter (code blocks)
    │           │       │       └── CopyButton (per code block)
    │           │       ├── TypingCursor (isStreaming=true)
    │           │       ├── LoadingThinking (empty content)
    │           │       └── CopyMessageButton (hover action)
    │           ├── ScrollToBottomButton (conditional)
    │           └── MessageInput
    │               ├── Internal State: input string
    │               ├── AutoResize textarea (useEffect on input)
    │               ├── CharacterCounter (>500 chars)
    │               └── SendButton → emits onSend
    │
    └── api (singleton ApiClient)
        ├── Stores: token (in-memory)
        ├── Reads: process.env.NEXT_PUBLIC_API_URL (empty → relative URLs)
        └── All methods: fetch() with Authorization header
```

---

## 15. Performance & Scalability

### 15.1 Performance Optimizations Implemented

| Optimization | Implementation | Impact |
|---|---|---|
| **Connection Pool** | pg Pool with max=20 connections | Eliminates per-request connection overhead |
| **Streaming SSE** | AsyncGenerator + SSE | User sees first token in ~100ms vs waiting for full response |
| **Keepalive Pings** | 3-second SSE comment pings | Prevents proxy/browser timeout during Ollama thinking |
| **Context Trimming** | Last 50 messages only | Prevents token overflow and reduces inference time |
| **Optimistic UI** | Immediate temp message insertion | Zero perceived latency for user message display |
| **Composite Indexes** | (user_id, is_deleted, updated_at DESC) | Sub-millisecond sidebar listing queries |
| **Message Index** | (chat_id, created_at ASC) | Fast ordered message retrieval |
| **compress: false** | Next.js config | Prevents Next.js buffering SSE streams |
| **Soft Delete** | is_deleted flag | O(1) delete vs cascade recalculation |
| **Auto-title** | First 60 chars of first message | Avoids extra LLM call for title generation |

### 15.2 Scalability Constraints

| Constraint | Current Limitation | Mitigation Path |
|---|---|---|
| **Ollama is single-node** | One GPU/CPU, no horizontal scale | Use multiple Ollama instances behind LiteLLM load balancing |
| **No Redis session store** | JWT stateless (can't revoke early) | Add Redis blacklist for logout invalidation |
| **localStorage auth** | XSS risk on token theft | Move to httpOnly cookies with CSRF protection |
| **No message pagination** | Loads all messages per chat | Add cursor-based pagination (LIMIT/OFFSET) |
| **Single PostgreSQL** | No read replicas | Add pgBouncer + read replicas for scale |
| **In-memory rate limit** | Lost on restart, not distributed | Use Redis-backed rate limiter for multi-instance |
| **No CDN** | Static assets served by Next.js | Add Vercel/Cloudflare CDN for frontend |
| **PBKDF2 on every decrypt** | Computed per-request from googleId | Cache derived keys in Redis with TTL |

---

## 16. Limitations & Future Scope

### 16.1 Current Limitations

```
Security:
  ✗ JWT stored in localStorage (XSS vulnerability)
  ✗ No token revocation mechanism on logout
  ✗ ENCRYPTION_MASTER_SECRET rotation not implemented
  ✗ No audit logging for message access

Features:
  ✗ No message pagination (can slow with large history)
  ✗ No file/image upload support
  ✗ No conversation export (PDF/Markdown)
  ✗ No user-selectable model per chat (backend uses DEFAULT_MODEL)
  ✗ Auto-title uses user's text, not AI-generated title
  ✗ No message search capability
  ✗ No conversation sharing

Infrastructure:
  ✗ No Docker Compose for easy deployment
  ✗ No health check for Ollama/LiteLLM
  ✗ No graceful shutdown handling
  ✗ No database migration system (Flyway/Prisma Migrate)
```

### 16.2 Recommended Future Enhancements

```
Priority 1 (Security):
  → Move JWT to httpOnly SameSite cookies
  → Add token revocation via Redis blacklist
  → Implement key rotation for ENCRYPTION_MASTER_SECRET
  → Add rate limiting per user (not just IP)

Priority 2 (Features):
  → Per-chat model selection stored in chats.model_id
  → AI-generated chat titles (single LLM call)
  → Message pagination with infinite scroll
  → Full-text search on decrypted messages
  → File attachment support (images, PDFs)
  → Conversation export to Markdown/PDF

Priority 3 (Infrastructure):
  → Docker Compose (postgres + ollama + litellm + backend + frontend)
  → Database migrations with Prisma or golang-migrate
  → Prometheus metrics + Grafana dashboard
  → Graceful shutdown (SIGTERM handling, drain connections)
  → Multi-user model isolation (separate Ollama contexts)

Priority 4 (UX):
  → Mobile responsive layout
  → Keyboard shortcut system (Cmd+K command palette)
  → Dark/Light theme toggle
  → Message reactions
  → Regenerate response button
  → Edit user message + regenerate
```

---

## Summary Table

| Category | Technology | Version | Role |
|---|---|---|---|
| Frontend Framework | Next.js | 16.2 | SSR, routing, API proxy |
| UI Library | React | 18.3 | Component model |
| Styling | Tailwind CSS | 3.4 | Utility-first CSS |
| Backend Framework | Express.js | 4.21 | REST API server |
| Language | TypeScript | 5.6 | Both frontend & backend |
| Database | PostgreSQL | Latest | Persistent storage |
| ORM/Driver | node-postgres (pg) | 8.13 | DB connection pool |
| Authentication | Google OAuth 2.0 | — | Identity provider |
| Auth Tokens | JWT (jsonwebtoken) | 9.0.2 | Stateless session |
| AI Proxy | LiteLLM | Latest | OpenAI-compatible gateway |
| LLM Runtime | Ollama | Latest | Local model inference |
| LLM Models | llama3.2/3.1, mistral, gemma2 | — | Conversational AI |
| AI SDK | OpenAI Node SDK | 4.67.1 | API client for LiteLLM |
| Encryption | AES-256-GCM + PBKDF2 | Node.js crypto | Message encryption at rest |
| Security Headers | Helmet.js | 7.1 | HTTP security headers |
| Rate Limiting | express-rate-limit | 7.4 | DoS protection |
| CORS | cors | 2.8.5 | Cross-origin control |
| Logging | Winston | 3.14.2 | Structured JSON logs |
| Markdown | react-markdown | 9.0.1 | AI response rendering |
| Syntax Highlight | react-syntax-highlighter | 16.1.1 | Code block rendering |
| Streaming | Server-Sent Events (SSE) | Web Standard | Real-time token delivery |