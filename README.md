# AIChat 🤖

> A full-stack, privacy-first AI chat application powered by local LLMs — no data leaves your server.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Ollama](https://img.shields.io/badge/Ollama-Local_LLM-FF6B35?style=flat-square)](https://ollama.ai/)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)

---

## What is AIChat?

AIChat is a self-hosted, privacy-first conversational AI platform. It lets authenticated users have multi-turn conversations with locally hosted Large Language Models (LLMs). Every message is encrypted at rest using **AES-256-GCM** with per-user keys derived via **PBKDF2**, and no conversation data ever leaves your own infrastructure.

---

## ✨ Key Highlights

| Pillar | What We Do |
|---|---|
| 🔒 **Privacy** | AES-256-GCM per-user encryption on every message at rest |
| ⚡ **Performance** | SSE-based streaming for real-time token delivery |
| 🛡️ **Security** | Google OAuth 2.0 + JWT, Helmet.js, three-tier rate limiting |
| 🔄 **Flexibility** | LiteLLM proxy routes between llama3.2, llama3.1, mistral, gemma2 |
| 💾 **Persistence** | PostgreSQL stores full chat history with soft-delete |
| 🎨 **UX** | Next.js 16 + Tailwind CSS, markdown rendering, syntax highlighting |

---

## 🗂️ Documentation

This repository ships with dedicated documentation files. **Read these for full details:**

| Document | Description |
|---|---|
| 📋 **[PROJECT-REPORT.md](./PROJECT-REPORT.md)** | Full technical report — architecture, security, database design, API design, ER diagrams, DFD Level 0/1/2, data flow, performance analysis, and future scope |
| 💻 **[PROJECT-CODE.md](./PROJECT-CODE.md)** | Complete annotated source code for every file in the project — frontend, backend, services, and configuration |
| 🚀 **[RUN.md](./RUN.md)** | Step-by-step instructions to run the project in **development** and **production** modes, including environment setup and dependency installation |

> 💡 **New here?** Start with [`RUN.md`](./RUN.md) to get the app running, then read [`PROJECT-REPORT.md`](./PROJECT-REPORT.md) to understand how it all works.

---

## 🏗️ Architecture at a Glance

```
Browser (Next.js :3000)
        │
        │  HTTP / SSE
        ▼
Express Backend (:4000)
  ├── Google OAuth 2.0  →  JWT Auth
  ├── AES-256-GCM Encryption
  ├── Rate Limiting (3 tiers)
  └── PostgreSQL (:5432)
        │
        │  OpenAI-compatible API
        ▼
LiteLLM Proxy (:4001)
        │
        ▼
Ollama LLM Engine (:11434)
  ├── llama3.2  (default)
  ├── llama3.1
  ├── mistral
  └── gemma2
```

> See the full layered architecture diagram in [`PROJECT-REPORT.md → Section 3`](./PROJECT-REPORT.md#3-architecture-overview)

---

## 🛠️ Tech Stack

### Frontend
| | Package | Version |
|---|---|---|
| ⚛️ | Next.js + React | 16.2 / 18.3 |
| 🎨 | Tailwind CSS | 3.4 |
| 🔐 | @react-oauth/google | 0.12.1 |
| 📝 | react-markdown + syntax-highlighter | 9.0.1 / 16.1.1 |

### Backend
| | Package | Version |
|---|---|---|
| 🚂 | Express.js | 4.21 |
| 🔑 | jsonwebtoken | 9.0.2 |
| 🗄️ | node-postgres (pg) | 8.13 |
| 🤖 | OpenAI Node SDK | 4.67.1 |
| 🛡️ | Helmet + express-rate-limit | 7.1 / 7.4 |
| 📋 | Winston | 3.14.2 |

### Infrastructure
| | Component | Role |
|---|---|---|
| 🐘 | PostgreSQL | Primary data store |
| 🦙 | Ollama | Local LLM inference |
| 🔀 | LiteLLM | OpenAI-compatible model proxy |
| 🔑 | Google Cloud OAuth 2.0 | Identity provider |

> Full dependency rationale in [`PROJECT-REPORT.md → Section 2`](./PROJECT-REPORT.md#2-technology-stack-deep-dive)

---

## 🔐 Security Overview

- **Authentication** — Google OAuth 2.0 ID tokens verified server-side; JWT issued with 7-day expiry
- **Encryption** — Every message encrypted with AES-256-GCM before database write; keys derived per-user via PBKDF2 (100,000 iterations)
- **Transport** — CORS restricted to frontend origin; Helmet.js sets CSP, HSTS, X-Frame-Options
- **Rate Limiting** — Three independent tiers: general (300/15 min), auth (30/15 min), messages (20/1 min)

> Full security architecture, auth flow diagrams, and encryption lifecycle in [`PROJECT-REPORT.md → Section 4`](./PROJECT-REPORT.md#4-security-architecture)

---

## 🗄️ Database Design

Four tables — `users`, `chats`, `messages`, `models` — with cascade deletes, composite indexes for fast sidebar queries, and automatic `updated_at` triggers.

```
USERS ──< CHATS ──< MESSAGES
             └──── MODELS
```

> Full schema, column definitions, index strategy, and ER diagram in [`PROJECT-REPORT.md → Sections 5 & 9`](./PROJECT-REPORT.md#5-database-design)

---

## ⚡ Streaming API

Messages are delivered via **Server-Sent Events (SSE)** for real-time token streaming:

```
POST /api/chats/:chatId/messages
Content-Type: text/event-stream

: ping
data: {"content": "Hello"}
data: {"content": " there"}
data: {"done": true, "messageId": "<uuid>"}
```

> Full API reference and all endpoints in [`PROJECT-REPORT.md → Section 6`](./PROJECT-REPORT.md#6-api-design)

---

## 🚀 Quick Start

**Prerequisites:** Node.js 18+, PostgreSQL, Ollama, LiteLLM, Google OAuth credentials

```bash
# Clone the repository
git clone https://github.com/your-username/aichat.git
cd aichat

# Follow the full setup guide
cat RUN.md
```

> 📖 **All environment variables, dependency installation, dev mode, and production build steps are in [`RUN.md`](./RUN.md)**

---

## 📊 Data Flow Diagrams

The project includes full DFD documentation:

| Diagram | Location |
|---|---|
| DFD Level 0 — Context Diagram | [`PROJECT-REPORT.md → Section 10`](./PROJECT-REPORT.md#10-dfd-level-0--context-diagram) |
| DFD Level 1 — System Decomposition | [`PROJECT-REPORT.md → Section 11`](./PROJECT-REPORT.md#11-dfd-level-1--system-decomposition) |
| DFD Level 2 — Process Decomposition | [`PROJECT-REPORT.md → Section 12`](./PROJECT-REPORT.md#12-dfd-level-2--process-decomposition) |
| Component Interaction Map | [`PROJECT-REPORT.md → Section 14`](./PROJECT-REPORT.md#14-component-interaction-map) |

---

## 📈 Performance Notes

- **Connection pooling** — pg Pool (max 20) eliminates per-request overhead
- **Optimistic UI** — User messages appear instantly before server confirmation
- **Context trimming** — Last 50 messages sent to LLM to prevent token overflow
- **Composite indexes** — Sub-millisecond sidebar listing queries
- **Keepalive pings** — 3-second SSE pings prevent proxy timeouts during inference

> Full performance and scalability analysis in [`PROJECT-REPORT.md → Section 15`](./PROJECT-REPORT.md#15-performance--scalability)

---

## 🗺️ Roadmap

```
Priority 1 — Security    → httpOnly cookies, token revocation, key rotation
Priority 2 — Features    → per-chat model selection, message search, file uploads
Priority 3 — Infra       → Docker Compose, DB migrations, Prometheus metrics
Priority 4 — UX          → mobile layout, dark/light toggle, regenerate response
```

> Full limitations and future scope in [`PROJECT-REPORT.md → Section 16`](./PROJECT-REPORT.md#16-limitations--future-scope)

---

## 📁 Repository Structure

```
aichat/
├── README.md              ← You are here
├── RUN.md                 ← Dev & production run instructions
├── PROJECT-REPORT.md      ← Full technical report
├── PROJECT-CODE.md        ← Complete annotated source code
├── backend/               ← Express.js API server (TypeScript)
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── services/
│   │   └── middleware/
│   └── package.json
└── frontend/              ← Next.js application (TypeScript)
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── context/
    │   └── lib/
    └── package.json
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with privacy in mind. Your conversations stay on your server.**

[📋 Report](./PROJECT-REPORT.md) · [💻 Code](./PROJECT-CODE.md) · [🚀 Run](./RUN.md)

</div>