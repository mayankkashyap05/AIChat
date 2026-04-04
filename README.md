```markdown
<div align="center">

<img src="https://img.shields.io/badge/AChat-AI%20Chat%20Application-7c6af7?style=for-the-badge&logoColor=white" alt="AChat" />

<br />
<br />

<img src="https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js&logoColor=white" />
<img src="https://img.shields.io/badge/TypeScript-5.6-3178c6?style=flat-square&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Express.js-4.21-000000?style=flat-square&logo=express&logoColor=white" />
<img src="https://img.shields.io/badge/PostgreSQL-18-336791?style=flat-square&logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/Ollama-Local%20LLM-ff6b35?style=flat-square&logoColor=white" />
<img src="https://img.shields.io/badge/LiteLLM-Proxy-7c6af7?style=flat-square&logoColor=white" />
<img src="https://img.shields.io/badge/Tailwind%20CSS-3.4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white" />
<img src="https://img.shields.io/badge/AES--256--GCM-Encrypted-22c55e?style=flat-square&logo=shield&logoColor=white" />

<br />
<br />

```
 █████╗  ██████╗██╗  ██╗ █████╗ ████████╗
██╔══██╗██╔════╝██║  ██║██╔══██╗╚══██╔══╝
███████║██║     ███████║███████║   ██║   
██╔══██║██║     ██╔══██║██╔══██║   ██║   
██║  ██║╚██████╗██║  ██║██║  ██║   ██║   
╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝  
```

### **Private · Encrypted · Local AI Chat**
*Chat with local LLMs. Your data never leaves your server.*

<br />

[**→ View Full Source Code**](./PROJECT-CODE.md) · [**→ Read Technical Report**](./PROJECT-REPORT.md) · [**→ Setup & Run Guide**](./RUN.md)

</div>

---

<br />

## What is AChat?

**AChat** is a self-hosted AI chat application that runs entirely on your own machine. It connects to locally running Large Language Models through [Ollama](https://ollama.com), routes them through a [LiteLLM](https://github.com/BerriAI/litellm) proxy, and stores all your conversations in a local [PostgreSQL](https://www.postgresql.org) database — **fully encrypted**.

No cloud. No subscriptions. No data sent to third parties. Every message you send is encrypted with **AES-256-GCM** before it touches the database.

<br />

---

## ✨ Core Features

<table>
<tr>
<td width="50%">

**🔒 End-to-End Encrypted Storage**
Every message is encrypted with AES-256-GCM using a per-user key derived via PBKDF2 (100,000 iterations) before being written to PostgreSQL. Only you can decrypt your own conversations.

</td>
<td width="50%">

**⚡ Real-Time Streaming**
AI responses stream token-by-token using Server-Sent Events (SSE). A keepalive ping system prevents timeouts while Ollama is thinking — you see output the moment inference begins.

</td>
</tr>
<tr>
<td width="50%">

**🧠 Multiple Local Models**
Switch between `llama3.2`, `llama3.1`, `mistral`, and `gemma2` — all running locally through Ollama. LiteLLM proxies all models under a single OpenAI-compatible endpoint.

</td>
<td width="50%">

**💬 Persistent Chat History**
All conversations are saved with full message history. Chats are grouped by date in the sidebar (Today / Yesterday / Last 7 Days / Older) and can be renamed or deleted.

</td>
</tr>
<tr>
<td width="50%">

**🔐 Google OAuth 2.0**
Sign in with your Google account. Backend verifies the ID token server-side using the official Google Auth Library and issues a 7-day JWT — no passwords stored anywhere.

</td>
<td width="50%">

**📝 Markdown + Syntax Highlighting**
AI responses render full Markdown — headers, lists, blockquotes, tables, inline code — with syntax-highlighted code blocks powered by `react-syntax-highlighter` and a copy button per block.

</td>
</tr>
</table>

<br />

---

## 🏗️ Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Browser                            │
│            Next.js 16  ·  React 18  ·  Tailwind             │
│         Google OAuth  ·  SSE Streaming  ·  JWT Auth         │
└─────────────────────────┬───────────────────────────────────┘
                          │  HTTP / SSE (port 3000)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express.js Backend                         │
│                    TypeScript 5.6                           │
│   JWT Auth  ·  Rate Limiting  ·  AES-256-GCM Encryption    │
│         Helmet  ·  CORS  ·  Winston Logging                 │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐    ┌─────────────────────────────────┐
│     PostgreSQL 18    │    │          LiteLLM Proxy          │
│                      │    │           (port 4001)           │
│  users  ·  chats     │    │   OpenAI-compatible gateway     │
│  messages  ·  models │    └─────────────────┬───────────────┘
│  (encrypted content) │                      │
└──────────────────────┘                      ▼
                             ┌─────────────────────────────────┐
                             │         Ollama Engine           │
                             │          (port 11434)           │
                             │  llama3.2  ·  llama3.1          │
                             │  mistral   ·  gemma2            │
                             └─────────────────────────────────┘
```

<br />

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend** | Next.js | 16.2 | SSR, routing, API proxy rewrites |
| **UI Library** | React | 18.3 | Component model, concurrent rendering |
| **Styling** | Tailwind CSS | 3.4 | Utility-first dark-mode UI |
| **Backend** | Express.js | 4.21 | REST API + SSE streaming server |
| **Language** | TypeScript | 5.6 | Full-stack type safety |
| **Database** | PostgreSQL | 18 | Persistent encrypted storage |
| **Auth** | Google OAuth 2.0 + JWT | — | Passwordless authentication |
| **Encryption** | AES-256-GCM + PBKDF2 | Node crypto | Message encryption at rest |
| **AI Proxy** | LiteLLM | Latest | OpenAI-compatible model gateway |
| **LLM Runtime** | Ollama | Latest | Local model inference |
| **AI SDK** | OpenAI Node SDK | 4.67 | API client targeting LiteLLM |
| **Markdown** | react-markdown | 9.0 | AI response rendering |
| **Security** | Helmet + express-rate-limit | — | HTTP headers + DoS protection |
| **Logging** | Winston | 3.14 | Structured JSON logging |

<br />

---

## 📁 Repository Structure

```
AChat/
│
├── 📄 README.md                 ← You are here
├── 📄 PROJECT-CODE.md           ← Complete source code of every file
├── 📄 PROJECT-REPORT.md         ← Full technical report, ER diagram, DFD
├── 📄 RUN.md                    ← Step-by-step dev & production run guide
│
├── ⚙️  litellm-config.yaml      ← LiteLLM model routing configuration
│
├── 🗄️  database/
│   └── init.sql                 ← PostgreSQL schema (tables, indexes, triggers)
│
├── 🖥️  backend/
│   ├── .env                     ← Backend environment variables
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             ← Express app entry point
│       ├── config.ts            ← Centralised configuration
│       ├── database.ts          ← PostgreSQL pool + all DB queries
│       ├── middleware/
│       │   ├── auth.ts          ← JWT verification middleware
│       │   └── rateLimit.ts     ← Three-tier rate limiting
│       ├── routes/
│       │   ├── auth.ts          ← Google OAuth + JWT issuance
│       │   ├── chats.ts         ← Chat CRUD routes
│       │   └── messages.ts      ← Message send + SSE streaming
│       └── services/
│           ├── encryption.ts    ← AES-256-GCM encrypt/decrypt
│           └── ai.ts            ← LiteLLM/Ollama integration
│
└── 🌐  frontend/
    ├── .env.local               ← Frontend environment variables
    ├── next.config.js           ← Next.js + API proxy rewrites
    ├── tailwind.config.js       ← Custom design tokens
    └── src/
        ├── app/
        │   ├── layout.tsx       ← Root layout + providers
        │   ├── page.tsx         ← Landing / login page
        │   └── chat/page.tsx    ← Main chat interface
        ├── components/
        │   ├── Sidebar.tsx      ← Chat list + user profile
        │   ├── ChatWindow.tsx   ← Message area + scroll
        │   ├── MessageBubble.tsx← Markdown rendering + copy
        │   ├── MessageInput.tsx ← Auto-resize textarea + send
        │   ├── LoginButton.tsx  ← Google OAuth button
        │   └── LoadingDots.tsx  ← Animated loading indicator
        ├── contexts/
        │   └── AuthContext.tsx  ← Global auth state + localStorage
        ├── hooks/
        │   └── useChat.ts       ← All chat state management
        └── lib/
            └── api.ts           ← Typed API client singleton
```

<br />

---

## ⚡ Quick Start

> **Full detailed instructions with every command, error fix, and verification step are in [`RUN.md`](./RUN.md)**

### Prerequisites

You need these installed before anything else:

```
Node.js ≥ 18    →  node --version
Python ≥ 3.10   →  python --version
PostgreSQL 18   →  psql --version
Ollama          →  ollama --version
ngrok           →  ngrok version  (optional)
```

### Five Terminals, Five Commands

Open **5 separate PowerShell windows** and run one command in each:

```powershell
# ── Terminal 1: Verify PostgreSQL is running ──────────────────────────
Get-Service -Name "postgresql*"
# If Stopped:  Start-Service -Name "postgresql-x64-18"
```

```powershell
# ── Terminal 2: Start Ollama ──────────────────────────────────────────
ollama serve
```

```powershell
# ── Terminal 3: Start LiteLLM Proxy ──────────────────────────────────
cd "C:\path\to\AChat"
.\venv\Scripts\Activate
litellm --config litellm-config.yaml --port 4001
```

```powershell
# ── Terminal 4: Start Backend ─────────────────────────────────────────
cd "C:\path\to\AChat\backend"
npm install        # first time only
npm run dev
```

```powershell
# ── Terminal 5: Start Frontend ────────────────────────────────────────
cd "C:\path\to\AChat\frontend"
npm install        # first time only
npm run dev
```

Then open **http://localhost:3000** in your browser.

> **→ For the complete setup guide including database initialization, first-time model downloads, production builds, ngrok tunnel setup, health checks, and all error fixes — see [`RUN.md`](./RUN.md)**

<br />

---

## 🔐 Security Model

```
User Message Flow:
  plaintext → PBKDF2 key derivation (100k iterations) →
  AES-256-GCM encrypt (random IV per message) →
  base64(IV ‖ AuthTag ‖ Ciphertext) → PostgreSQL

  PostgreSQL → base64 decode → AES-256-GCM decrypt
  (auth tag verified) → plaintext returned to caller
```

- **Per-user encryption keys** — derived from `ENCRYPTION_MASTER_SECRET` + user's Google ID
- **Authenticated encryption** — GCM auth tag detects any tampering
- **Random IV per message** — identical plaintexts produce different ciphertexts
- **JWT authentication** — 7-day expiry, signed with `HS256`, verified on every protected request
- **Rate limiting** — three tiers: general (300/15min), auth (30/15min), messages (20/min)
- **Helmet.js** — sets `X-Frame-Options`, `X-Content-Type-Options`, HSTS, and more
- **CORS** — locked to frontend origin only

> **→ For full security architecture diagrams and encryption flow — see [`PROJECT-REPORT.md`](./PROJECT-REPORT.md)**

<br />

---

## 🗄️ Database Schema

```
users          chats              messages         models
──────────     ──────────         ──────────       ──────────
user_id (PK)   chat_id (PK)       message_id (PK)  model_id (PK)
google_id      user_id (FK)  ──►  chat_id (FK) ──► name
email          model_id (FK) ──►  role
name           title              content          ← AES-256-GCM
profile_pic    is_deleted         model_name           encrypted
created_at     created_at         created_at
updated_at     updated_at
```

- Cascade deletes: `users → chats → messages`
- Soft delete on chats (`is_deleted = TRUE`)
- Auto-updated `updated_at` via PostgreSQL triggers
- Composite indexes optimized for sidebar listing and message retrieval

> **→ For the full ER diagram, DFD Level 0, DFD Level 1, DFD Level 2, and complete schema documentation — see [`PROJECT-REPORT.md`](./PROJECT-REPORT.md)**

<br />

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/google` | ✗ | Verify Google token, issue JWT |
| `GET` | `/api/auth/me` | ✓ | Get current user profile |
| `GET` | `/api/chats` | ✓ | List all user chats |
| `POST` | `/api/chats` | ✓ | Create new chat |
| `PATCH` | `/api/chats/:id` | ✓ | Rename chat |
| `DELETE` | `/api/chats/:id` | ✓ | Soft-delete chat |
| `GET` | `/api/chats/:id/messages` | ✓ | Get decrypted messages |
| `POST` | `/api/chats/:id/messages` | ✓ | Send message + get AI response (stream or JSON) |
| `GET` | `/api/models` | ✓ | List available AI models |
| `GET` | `/api/health` | ✗ | Database health check |

**Streaming:** Pass `"stream": true` in the POST body to receive a `text/event-stream` response with real-time token chunks.

<br />

---

## 🌐 Service Ports

| Service | Port | URL |
|---|---|---|
| **Frontend** (Next.js) | `3000` | http://localhost:3000 |
| **Backend** (Express.js) | `4000` | http://localhost:4000 |
| **LiteLLM Proxy** | `4001` | http://localhost:4001 |
| **PostgreSQL** | `5432` | `postgresql://aichat:***@localhost:5432/aichat` |
| **Ollama** | `11434` | http://localhost:11434 |
| **Ngrok Dashboard** | `4040` | http://localhost:4040 |

<br />

---

## 📚 Documentation

<table>
<tr>
<td align="center" width="33%">

### [`PROJECT-CODE.md`](./PROJECT-CODE.md)

Complete source code for every file in the project — backend, frontend, database schema, configuration files, and environment templates.

**Read this if you want to:**
understand exactly what each file does, review the implementation, or copy specific logic.

</td>
<td align="center" width="33%">

### [`PROJECT-REPORT.md`](./PROJECT-REPORT.md)

Full technical report including technology stack analysis, architecture diagrams, ER diagram, DFD Level 0, DFD Level 1, DFD Level 2, security architecture, API design, and performance notes.

**Read this if you want to:**
understand the system design, present the project, or study the data flows.

</td>
<td align="center" width="33%">

### [`RUN.md`](./RUN.md)

Step-by-step guide for every terminal command needed to run the project in both development and production modes — including first-time database setup, model downloads, ngrok tunnel, health checks, and all common error fixes.

**Read this if you want to:**
set up and run the project on your machine.

</td>
</tr>
</table>

<br />

---

## 📋 Environment Variables

### Backend (`backend/.env`)

```env
GOOGLE_CLIENT_ID=           # From Google Cloud Console
GOOGLE_CLIENT_SECRET=       # From Google Cloud Console
DATABASE_URL=               # postgresql://aichat:password@localhost:5432/aichat
JWT_SECRET=                 # 64-char hex string
BACKEND_PORT=4000
FRONTEND_URL=               # http://localhost:3000
LITELLM_BASE_URL=           # http://localhost:4001
LITELLM_MASTER_KEY=         # Must match litellm-config.yaml master_key
OLLAMA_HOST=                # http://localhost:11434
DEFAULT_MODEL=              # ollama/llama3.2
ENCRYPTION_MASTER_SECRET=   # 64-char hex — generate with node crypto
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=    # Same as backend GOOGLE_CLIENT_ID
NEXT_PUBLIC_API_URL=             # http://localhost:4000
```

> **→ See [`RUN.md`](./RUN.md) for how to generate secrets and configure all values correctly.**

<br />

---

## 🖼️ Application Screens

```
┌─────────────────────────────────────────────────────────────┐
│                    Landing Page (/)                          │
│                                                             │
│   🤖  AI Chat                                               │
│                                                             │
│   One AI for everything — code, analyze, create, and solve  │
│                                                             │
│         [ Sign in with Google ]                             │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 🔒 Encrypted │  │ ⚡ Streaming  │  │ 📅 Persistent│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Chat Page (/chat)                               │
│  ┌────────────────┬────────────────────────────────────┐    │
│  │  AI Chat    ✏️  │                                    │    │
│  ├────────────────│  How can I help you?               │    │
│  │ 🔍 Search...   │                                    │    │
│  ├────────────────│  ┌──────────────┐ ┌─────────────┐ │    │
│  │ Today          │  │ 💡 Explain   │ │ 🐍 Write a  │ │    │
│  │  Chat title    │  │    quantum   │ │    Python   │ │    │
│  │  Chat title    │  │    computing │ │    function │ │    │
│  ├────────────────│  └──────────────┘ └─────────────┘ │    │
│  │ Yesterday      │                                    │    │
│  │  Chat title    │  ┌──────────────────────────────┐  │    │
│  ├────────────────│  │ Message AI (Enter to send)   │  │    │
│  │ 👤 User Name   │  └──────────────────────────────┘  │    │
│  └────────────────┴────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

<br />

---

<div align="center">

**Built with TypeScript · Powered by Ollama · Secured with AES-256-GCM**

<br />

[`PROJECT-CODE.md`](./PROJECT-CODE.md) · [`PROJECT-REPORT.md`](./PROJECT-REPORT.md) · [`RUN.md`](./RUN.md)

</div>
```