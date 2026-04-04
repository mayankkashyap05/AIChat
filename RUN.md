# AIChat – Complete Professional Development & Production Run Guide

## (Windows PowerShell | No Docker | Existing Features Only)

---

## Table of Contents

1. [Prerequisites & One-Time Setup](#1-prerequisites--one-time-setup)
2. [Project Directory Structure Verification](#2-project-directory-structure-verification)
3. [Environment Configuration](#3-environment-configuration)
4. [Service Startup Order](#4-service-startup-order)
5. [Terminal 1 – PostgreSQL Setup & Verification](#5-terminal-1--postgresql-setup--verification)
6. [Terminal 2 – Ollama LLM Server](#6-terminal-2--ollama-llm-server)
7. [Terminal 3 – LiteLLM Proxy](#7-terminal-3--litellm-proxy)
8. [Terminal 4 – Backend (Express.js)](#8-terminal-4--backendexpressjs)
9. [Terminal 5 – Frontend (Next.js)](#9-terminal-5--frontendnextjs)
10. [Terminal 6 – Ngrok Tunnel (Optional/Remote Access)](#10-terminal-6--ngrok-tunnel-optionalremote-access)
11. [Health Verification Checklist](#11-health-verification-checklist)
12. [Production Build & Run](#12-production-build--run)
13. [Development vs Production Comparison](#13-development-vs-production-comparison)
14. [Common Errors & Fixes](#14-common-errors--fixes)
15. [Graceful Shutdown Order](#15-graceful-shutdown-order)
16. [Quick Reference Cheat Sheet](#16-quick-reference-cheat-sheet)

---

## 1. Prerequisites & One-Time Setup

### 1.1 Required Software Checklist

```
Verify every tool is installed before proceeding:

┌─────────────────────────────────────────────────────────────┐
│              REQUIRED SOFTWARE                               │
├──────────────────────┬──────────────────────────────────────┤
│  Software            │  Verify Command                      │
├──────────────────────┼──────────────────────────────────────┤
│  Node.js ≥ 18        │  node --version                      │
│  npm ≥ 9             │  npm --version                       │
│  Python ≥ 3.10       │  python --version                    │
│  PostgreSQL 18       │  psql --version                      │
│  Ollama              │  ollama --version                    │
│  ngrok               │  ngrok version                       │
│  Git                 │  git --version                       │
└──────────────────────┴──────────────────────────────────────┘
```

### 1.2 Verify All Tools (Run Once)

```powershell
# ── Open ANY PowerShell window and run ALL of these ──

node --version
# Expected: v18.x.x or v20.x.x or v22.x.x

npm --version
# Expected: 9.x.x or 10.x.x

python --version
# Expected: Python 3.10.x or higher

psql --version
# Expected: psql (PostgreSQL) 18.x

ollama --version
# Expected: ollama version 0.x.x

ngrok version
# Expected: ngrok version 3.x.x

git --version
# Expected: git version 2.x.x
```

---

## 2. Project Directory Structure Verification

```powershell
# ── Verify your project root exists correctly ──

# Navigate to project root
cd "C:\Users\kashy\OneDrive\Documents\AIChat"

# List top-level structure
Get-ChildItem -Name

# Expected output:
# backend
# database
# frontend
# litellm-config.yaml
# venv

# Verify critical files exist
Test-Path ".\litellm-config.yaml"          # Should be: True
Test-Path ".\database\init.sql"            # Should be: True
Test-Path ".\backend\src\index.ts"         # Should be: True
Test-Path ".\backend\.env"                 # Should be: True
Test-Path ".\frontend\src\app\layout.tsx"  # Should be: True
Test-Path ".\frontend\.env.local"          # Should be: True
Test-Path ".\venv\Scripts\Activate.ps1"    # Should be: True
```

---

## 3. Environment Configuration

### 3.1 Backend `.env` File Verification

```powershell
# Verify backend .env exists and has all required keys
cd "C:\Users\kashy\OneDrive\Documents\AIChat\backend"

Get-Content .env

# Every line below must be present and non-empty:
# GOOGLE_CLIENT_ID=...apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=...
# POSTGRES_USER=aichat
# POSTGRES_PASSWORD=aichatbymayank
# POSTGRES_DB=aichat
# DATABASE_URL=postgresql://aichat:aichatbymayank@localhost:5432/aichat
# JWT_SECRET=6aa25657d7e64c4ba5bccecaa32b24d6facf4e52d22b407bad2f96a58d9e170a
# BACKEND_PORT=4000
# FRONTEND_URL=http://localhost:3000
# LITELLM_BASE_URL=http://localhost:4001
# LITELLM_MASTER_KEY=sk-litellm-9f8d7c6b5a4xyz
# OLLAMA_HOST=http://localhost:11434
# DEFAULT_MODEL=ollama/llama3.2
# ENCRYPTION_MASTER_SECRET=ba8136e05daec9e549d85c5ec4ab07f4e1c42b9bf5a78d3a460bb58f5b47ed46
```

### 3.2 Frontend `.env.local` File Verification

```powershell
# Verify frontend .env.local exists and has required keys
cd "C:\Users\kashy\OneDrive\Documents\AIChat\frontend"

Get-Content .env.local

# Every line below must be present:
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
# NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3.3 LiteLLM Config Verification

```powershell
# Verify litellm-config.yaml at project root
cd "C:\Users\kashy\OneDrive\Documents\AIChat"

Get-Content .\litellm-config.yaml

# Must contain: ollama/llama3.2 model entry
# Must contain: master_key: sk-litellm-9f8d7c6b5a4xyz
# Must contain: api_base: http://localhost:11434
```

---

## 4. Service Startup Order

```
┌─────────────────────────────────────────────────────────────────────┐
│                  MANDATORY STARTUP SEQUENCE                          │
│                                                                      │
│  You MUST start services in this exact order.                        │
│  Each service depends on the one before it.                          │
│                                                                      │
│  1. PostgreSQL  ──► Must be running BEFORE backend starts           │
│  2. Ollama      ──► Must be running BEFORE LiteLLM starts           │
│  3. LiteLLM     ──► Must be running BEFORE backend starts           │
│  4. Backend     ──► Must be running BEFORE frontend can use API     │
│  5. Frontend    ──► Start last, proxies to backend                  │
│  6. Ngrok       ──► Optional, start anytime after frontend          │
│                                                                      │
│  DEPENDENCY CHAIN:                                                   │
│  PostgreSQL → Backend                                                │
│  Ollama → LiteLLM → Backend → Frontend → (Ngrok)                    │
│                                                                      │
│  Open 5 separate PowerShell windows (6 if using ngrok)              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Terminal 1 – PostgreSQL Setup & Verification

```
PURPOSE: Verify PostgreSQL is running and database is initialized
WINDOW:  PowerShell Terminal 1
KEEP:    This terminal can be CLOSED after verification
         PostgreSQL runs as a Windows Service automatically
```

### 5.1 Check PostgreSQL Windows Service Status

```powershell
# ══════════════════════════════════════════════════════
# TERMINAL 1 – PostgreSQL Verification
# ══════════════════════════════════════════════════════

# Check if PostgreSQL service is running
Get-Service -Name "postgresql*"

# Expected output:
# Status   Name               DisplayName
# ------   ----               -----------
# Running  postgresql-x64-18  postgresql-x64-18 - PostgreSQL...

# If Status shows "Stopped", start it:
Start-Service -Name "postgresql-x64-18"

# Wait 3 seconds then verify again
Start-Sleep -Seconds 3
Get-Service -Name "postgresql*"
```

### 5.2 Navigate to PostgreSQL Bin Directory

```powershell
# Navigate to PostgreSQL bin (where psql.exe lives)
cd "C:\Program Files\PostgreSQL\18\bin"

# Verify psql exists
Test-Path ".\psql.exe"
# Expected: True
```

### 5.3 First-Time Database Initialization (Run ONCE ever)

```powershell
# ─────────────────────────────────────────────────────
# SKIP THIS SECTION if you already ran it once before
# Run only on first setup
# ─────────────────────────────────────────────────────

# Step 1: Create the application user
.\psql -U postgres -c "CREATE USER aichat WITH PASSWORD 'aichatbymayank';"
# Password prompt: enter your postgres superuser password
# Expected: CREATE ROLE

# Step 2: Create the application database owned by aichat user
.\psql -U postgres -c "CREATE DATABASE aichat OWNER aichat;"
# Password prompt: enter your postgres superuser password
# Expected: CREATE DATABASE

# Step 3: Run the schema initialization SQL file
.\psql -U aichat -d aichat -f "C:\Users\kashy\OneDrive\Documents\AIChat\database\init.sql"
# Password prompt: aichatbymayank
# Expected output (in order):
# CREATE EXTENSION    ← uuid-ossp
# CREATE EXTENSION    ← pgcrypto
# CREATE TABLE        ← users table
# CREATE INDEX        ← idx_users_google_id
# CREATE INDEX        ← idx_users_email
# CREATE TABLE        ← models table
# INSERT 0 4          ← 4 model records seeded
# CREATE TABLE        ← chats table
# CREATE INDEX        ← idx_chats_user_active
# CREATE TABLE        ← messages table
# CREATE INDEX        ← idx_messages_chat_created
# CREATE FUNCTION     ← update_updated_at_column
# CREATE TRIGGER      ← update_users_updated_at
# CREATE TRIGGER      ← update_chats_updated_at
```

### 5.4 Verify Database Schema (Every Run)

```powershell
# Connect to the aichat database and verify all tables exist
.\psql -U aichat -d aichat -c "\dt"
# Password: aichatbymayank
# Expected:
#          List of relations
#  Schema |   Name   | Type  | Owner
# --------+----------+-------+-------
#  public | chats    | table | aichat
#  public | messages | table | aichat
#  public | models   | table | aichat
#  public | users    | table | aichat

# Verify models are seeded
.\psql -U aichat -d aichat -c "SELECT name FROM models ORDER BY name;"
# Password: aichatbymayank
# Expected:
#         name
# --------------------
#  ollama/gemma2
#  ollama/llama3.1
#  ollama/llama3.2
#  ollama/mistral

# Verify database connection string works
.\psql "postgresql://aichat:aichatbymayank@localhost:5432/aichat" -c "SELECT version();"
# Expected: PostgreSQL 18.x.x ...
```

### 5.5 PostgreSQL Service Management (Reference)

```powershell
# Start PostgreSQL service
Start-Service -Name "postgresql-x64-18"

# Stop PostgreSQL service
Stop-Service -Name "postgresql-x64-18"

# Restart PostgreSQL service
Restart-Service -Name "postgresql-x64-18"

# Check service status
Get-Service -Name "postgresql-x64-18"

# Set to auto-start on Windows boot (run as Administrator)
Set-Service -Name "postgresql-x64-18" -StartupType Automatic

# Set to manual start (run as Administrator)
Set-Service -Name "postgresql-x64-18" -StartupType Manual
```

---

## 6. Terminal 2 – Ollama LLM Server

```
PURPOSE: Run the local LLM inference engine
WINDOW:  PowerShell Terminal 2
KEEP:    MUST stay open for entire session
PORT:    11434
```

### 6.1 Verify Ollama Installation

```powershell
# ══════════════════════════════════════════════════════
# TERMINAL 2 – Ollama Server
# ══════════════════════════════════════════════════════

# Check ollama is installed and in PATH
ollama --version
# Expected: ollama version 0.x.x

# List all downloaded models
ollama list
# Expected (at minimum):
# NAME                    ID              SIZE    MODIFIED
# llama3.2:latest         ...             2.0 GB  ...
```

### 6.2 Download Required Models (First Time Only)

```powershell
# ─────────────────────────────────────────────────────
# SKIP if models already downloaded (ollama list shows them)
# Each download may take 5-30 minutes depending on internet speed
# ─────────────────────────────────────────────────────

# Pull the default model (REQUIRED - used by backend DEFAULT_MODEL)
ollama pull llama3.2
# Expected: pulling manifest → downloading layers → verifying → success

# Pull additional models (OPTIONAL - based on litellm-config.yaml)
ollama pull llama3.1
ollama pull mistral
ollama pull gemma2

# Verify all models downloaded successfully
ollama list
# Expected: All pulled models appear with SIZE > 0
```

### 6.3 Start Ollama Server

```powershell
# Start Ollama in serve mode (listens on port 11434)
ollama serve

# Expected output:
# time=... level=INFO source=... msg="inference compute"
# time=... level=INFO source=... msg="no log file" ...
# time=... level=INFO source=... msg="Dynamic LLM loading enabled"
# Ollama is running on http://127.0.0.1:11434

# ─────────────────────────────────────────────────────
# KEEP THIS TERMINAL OPEN
# Ollama must stay running for AI responses to work
# ─────────────────────────────────────────────────────
```

### 6.4 Verify Ollama is Responding (Run in a SEPARATE quick test terminal)

```powershell
# Open a new temporary PowerShell window to test
# (Do NOT run in Terminal 2 - that's blocked by ollama serve)

# Test Ollama HTTP API directly
Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method GET

# Expected: JSON with models list
# {"models":[{"name":"llama3.2:latest","model":"llama3.2:latest",...}]}

# Alternative quick test
curl http://localhost:11434
# Expected: "Ollama is running"
```

---

## 7. Terminal 3 – LiteLLM Proxy

```
PURPOSE: OpenAI-compatible proxy that routes to Ollama
WINDOW:  PowerShell Terminal 3
KEEP:    MUST stay open for entire session
PORT:    4001
```

### 7.1 Activate Python Virtual Environment

```powershell
# ══════════════════════════════════════════════════════
# TERMINAL 3 – LiteLLM Proxy
# ══════════════════════════════════════════════════════

# Navigate to project root (where venv folder lives)
cd "C:\Users\kashy\OneDrive\Documents\AIChat"

# Verify venv exists
Test-Path ".\venv\Scripts\Activate.ps1"
# Expected: True

# Activate the Python virtual environment
.\venv\Scripts\Activate

# Prompt should change to show (venv):
# (venv) (base) PS C:\Users\kashy\OneDrive\Documents\AIChat>

# Verify Python and pip are from the venv
python --version
# Expected: Python 3.10.x or higher

pip --version
# Expected: pip x.x.x from ...AIChat\venv\lib...
```

### 7.2 First-Time LiteLLM Installation (Run ONCE)

```powershell
# ─────────────────────────────────────────────────────
# SKIP if litellm already installed
# Check: pip show litellm
# ─────────────────────────────────────────────────────

# Install LiteLLM with proxy extras
pip install "litellm[proxy]"

# Verify installation
pip show litellm
# Expected: Name: litellm, Version: x.x.x, ...

# Verify litellm command is available
litellm --version
# Expected: x.x.x
```

### 7.3 Start LiteLLM Proxy

```powershell
# Verify config file exists before starting
Test-Path ".\litellm-config.yaml"
# Expected: True

# View config to confirm it's correct
Get-Content .\litellm-config.yaml

# Start LiteLLM proxy with the config file on port 4001
litellm --config litellm-config.yaml --port 4001

# Expected startup output:
# INFO:     Started server process [XXXXX]
# INFO:     Waiting for application startup.
#
#    ██╗     ██╗████████╗███████╗██╗     ██╗     ███╗   ███╗
#    ... (LiteLLM ASCII art banner) ...
#
# LiteLLM: Proxy initialized with Config, Set models:
#     ollama/llama3.2
#     ollama/llama3.1
#     ollama/mistral
#     ollama/gemma2
#
# INFO:     Application startup complete.
# INFO:     Uvicorn running on http://0.0.0.0:4001 (Press CTRL+C to quit)

# ─────────────────────────────────────────────────────
# KEEP THIS TERMINAL OPEN
# LiteLLM must stay running for backend AI calls to work
# ─────────────────────────────────────────────────────
```

### 7.4 Verify LiteLLM is Responding (Run in a SEPARATE quick test terminal)

```powershell
# Open a new temporary PowerShell window to test

# Test LiteLLM health endpoint
Invoke-RestMethod -Uri "http://localhost:4001/health" -Method GET
# Expected: {"status":"healthy",...}

# Test LiteLLM models endpoint (with master key)
$headers = @{ "Authorization" = "Bearer sk-litellm-9f8d7c6b5a4xyz" }
Invoke-RestMethod -Uri "http://localhost:4001/v1/models" `
  -Method GET `
  -Headers $headers
# Expected: JSON with model list including ollama/llama3.2
```

---

## 8. Terminal 4 – Backend (Express.js)

```
PURPOSE: REST API server + AI orchestration + encryption layer
WINDOW:  PowerShell Terminal 4
KEEP:    MUST stay open for entire session
PORT:    4000
```

### 8.1 Navigate and Install Dependencies (First Time)

```powershell
# ══════════════════════════════════════════════════════
# TERMINAL 4 – Backend (Express.js / TypeScript)
# ══════════════════════════════════════════════════════

# Navigate to backend directory
cd "C:\Users\kashy\OneDrive\Documents\AIChat\backend"

# Verify package.json exists
Test-Path ".\package.json"
# Expected: True

# Verify .env exists
Test-Path ".\.env"
# Expected: True

# Install all dependencies (first time or after package.json changes)
npm install

# Expected output:
# added 214 packages, and audited 215 packages in Xs
# found 0 vulnerabilities
```

### 8.2 Verify Backend Configuration

```powershell
# Verify all required source files exist
Test-Path ".\src\index.ts"           # True
Test-Path ".\src\config.ts"          # True
Test-Path ".\src\database.ts"        # True
Test-Path ".\src\middleware\auth.ts" # True
Test-Path ".\src\routes\auth.ts"     # True
Test-Path ".\src\routes\chats.ts"    # True
Test-Path ".\src\routes\messages.ts" # True
Test-Path ".\src\services\ai.ts"     # True
Test-Path ".\src\services\encryption.ts" # True

# Verify tsconfig.json exists
Test-Path ".\tsconfig.json"
# Expected: True
```

### 8.3 Start Backend – Development Mode

```powershell
# ─────────────────────────────────────────────────────
# DEVELOPMENT MODE
# Uses tsx watch for hot-reload on file changes
# ─────────────────────────────────────────────────────

npm run dev

# Expected output (all 4 lines must appear):
# {"level":"info","message":"Backend server running on port 4000","timestamp":"..."}
# {"level":"info","message":"Frontend URL: http://localhost:3000","timestamp":"..."}
# {"level":"info","message":"LiteLLM URL: http://localhost:4001","timestamp":"..."}
# {"level":"info","message":"Default model: ollama/llama3.2","timestamp":"..."}

# ─────────────────────────────────────────────────────
# KEEP THIS TERMINAL OPEN
# Backend must stay running for all API calls
# tsx watch will auto-restart when .ts files change
# ─────────────────────────────────────────────────────
```

### 8.4 Verify Backend is Responding (Run in a SEPARATE quick test terminal)

```powershell
# Open a new temporary PowerShell window

# Test health endpoint (no auth required)
Invoke-RestMethod -Uri "http://localhost:4000/api/health" -Method GET
# Expected:
# status    timestamp
# ------    ---------
# ok        2026-xx-xxTxx:xx:xx.xxxZ

# Test models endpoint (auth required - will return 401 without token)
Invoke-RestMethod -Uri "http://localhost:4000/api/models" -Method GET
# Expected: 401 error (correct - auth is working)

# Full health check with JSON output
$response = Invoke-RestMethod -Uri "http://localhost:4000/api/health"
Write-Host "Backend Status: $($response.status)"
Write-Host "Timestamp: $($response.timestamp)"
```

---

## 9. Terminal 5 – Frontend (Next.js)

```
PURPOSE: React/Next.js user interface
WINDOW:  PowerShell Terminal 5
KEEP:    MUST stay open for entire session
PORT:    3000
```

### 9.1 Navigate and Install Dependencies (First Time)

```powershell
# ══════════════════════════════════════════════════════
# TERMINAL 5 – Frontend (Next.js / React / TypeScript)
# ══════════════════════════════════════════════════════

# Navigate to frontend directory
cd "C:\Users\kashy\OneDrive\Documents\AIChat\frontend"

# Verify package.json exists
Test-Path ".\package.json"
# Expected: True

# Verify .env.local exists
Test-Path ".\.env.local"
# Expected: True

# Verify next.config.js exists
Test-Path ".\next.config.js"
# Expected: True

# Install all dependencies (first time or after package.json changes)
npm install

# Expected output:
# added 235 packages, and audited 236 packages in Xm
# found 0 vulnerabilities
```

### 9.2 Verify Frontend Configuration

```powershell
# Verify all source files exist
Test-Path ".\src\app\layout.tsx"              # True
Test-Path ".\src\app\page.tsx"                # True
Test-Path ".\src\app\chat\page.tsx"           # True
Test-Path ".\src\components\Sidebar.tsx"      # True
Test-Path ".\src\components\ChatWindow.tsx"   # True
Test-Path ".\src\components\MessageBubble.tsx"# True
Test-Path ".\src\components\MessageInput.tsx" # True
Test-Path ".\src\components\LoginButton.tsx"  # True
Test-Path ".\src\components\LoadingDots.tsx"  # True
Test-Path ".\src\contexts\AuthContext.tsx"    # True
Test-Path ".\src\hooks\useChat.ts"            # True
Test-Path ".\src\lib\api.ts"                  # True

# Check tailwind and postcss configs
Test-Path ".\tailwind.config.js"  # True
Test-Path ".\postcss.config.js"   # True
```

### 9.3 Start Frontend – Development Mode

```powershell
# ─────────────────────────────────────────────────────
# DEVELOPMENT MODE
# Uses Next.js dev server with Turbopack for fast HMR
# ─────────────────────────────────────────────────────

npm run dev

# Expected output:
# ▲ Next.js 16.2.2 (Turbopack)
# - Local:         http://localhost:3000
# - Network:       http://172.xx.xxx.x:3000
# - Environments: .env.local
# ✓ Ready in XXXXms

# First page load will show additional lines:
# ○ Compiling / ...
# ✓ Compiled / in XXms
#  GET / 200 in X.Xs

# ─────────────────────────────────────────────────────
# KEEP THIS TERMINAL OPEN
# Access the app at: http://localhost:3000
# Hot Module Replacement (HMR) enabled automatically
# ─────────────────────────────────────────────────────
```

### 9.4 Open Application in Browser

```powershell
# Open the application in your default browser
Start-Process "http://localhost:3000"

# The login page should appear with:
# - AI Chat logo and branding
# - Google Sign-In button
# - Feature cards (encrypted, streaming, persistent, multi-domain)
# - "Powered by Ollama · LiteLLM · PostgreSQL" footer
```

---

## 10. Terminal 6 – Ngrok Tunnel (Optional/Remote Access)

```
PURPOSE: Expose local app to internet via HTTPS tunnel
WINDOW:  PowerShell Terminal 6 (optional)
KEEP:    MUST stay open while remote access needed
NOTE:    Only needed for accessing from outside your network
```

### 10.1 One-Time Ngrok Authentication (Run ONCE ever)

```powershell
# ══════════════════════════════════════════════════════
# TERMINAL 6 – Ngrok Tunnel (Optional)
# ══════════════════════════════════════════════════════

# Authenticate ngrok with your authtoken (one-time setup)
ngrok config add-authtoken 3BtAxJhuF6CUr88GBdRziBrKzMj_4uVXSKgp6fXmFiCPJWV3J

# Expected output:
# Authtoken saved to configuration file: C:\Users\kashy\AppData\Local\ngrok\ngrok.yml

# Verify ngrok config
ngrok config check
# Expected: Valid configuration file at ...
```

### 10.2 Update Environment Files for Ngrok Domain

```powershell
# ─────────────────────────────────────────────────────
# IMPORTANT: Before starting ngrok, update .env files
# to use your static ngrok domain
# ─────────────────────────────────────────────────────

# Your static ngrok domain is:
# unreversible-helga-supermilitary.ngrok-free.dev

# Update frontend .env.local to add ngrok config:
# Open in Notepad
notepad "C:\Users\kashy\OneDrive\Documents\AIChat\frontend\.env.local"

# The file should contain:
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com
# NEXT_PUBLIC_API_URL=http://localhost:4000
# ALLOWED_DEV_ORIGIN=https://unreversible-helga-supermilitary.ngrok-free.dev

# Save and close notepad

# ALSO: Update backend .env FRONTEND_URL for ngrok access:
notepad "C:\Users\kashy\OneDrive\Documents\AIChat\backend\.env"

# Change this line when using ngrok:
# FRONTEND_URL=https://unreversible-helga-supermilitary.ngrok-free.dev

# NOTE: Restart frontend AND backend after these changes
```

### 10.3 Start Ngrok Tunnel

```powershell
# Start ngrok with your static domain pointing to frontend port 3000
ngrok http --domain=unreversible-helga-supermilitary.ngrok-free.dev 3000

# Expected output:
# ngrok                                                   (Ctrl+C to quit)
#
# Session Status          online
# Account                 your-email@gmail.com (Plan: Free)
# Version                 3.x.x
# Region                  India (in)
# Web Interface           http://127.0.0.1:4040
# Forwarding              https://unreversible-helga-supermilitary.ngrok-free.dev -> http://localhost:3000
#
# Connections             ttl     opn     rt1     rt5     p50     p90
#                         0       0       0.00    0.00    0.00    0.00

# ─────────────────────────────────────────────────────
# Remote users can now access your app at:
# https://unreversible-helga-supermilitary.ngrok-free.dev
# ─────────────────────────────────────────────────────
```

### 10.4 Monitor Ngrok Traffic (Optional)

```powershell
# Open ngrok's local web dashboard in browser
Start-Process "http://127.0.0.1:4040"

# This shows:
# - All HTTP requests coming through the tunnel
# - Request/response details
# - Latency metrics
# - Ability to replay requests
```

---

## 11. Health Verification Checklist

### 11.1 Full System Health Check Script

```powershell
# ══════════════════════════════════════════════════════
# Run this in any PowerShell window AFTER all 5 services
# are started to verify everything is working
# ══════════════════════════════════════════════════════

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "   AIChat Full System Health Check" -ForegroundColor Cyan
Write-Host "=============================================`n" -ForegroundColor Cyan

# ── 1. PostgreSQL Service ──────────────────────────────
Write-Host "[1/6] Checking PostgreSQL Service..." -ForegroundColor Yellow
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService -and $pgService.Status -eq "Running") {
    Write-Host "      PostgreSQL Service: RUNNING" -ForegroundColor Green
} else {
    Write-Host "      PostgreSQL Service: STOPPED" -ForegroundColor Red
}

# ── 2. PostgreSQL Database Connection ─────────────────
Write-Host "[2/6] Checking PostgreSQL Database..." -ForegroundColor Yellow
try {
    $pgConn = & "C:\Program Files\PostgreSQL\18\bin\psql.exe" `
        "postgresql://aichat:aichatbymayank@localhost:5432/aichat" `
        -c "SELECT COUNT(*) FROM models;" 2>&1
    if ($pgConn -match "4") {
        Write-Host "      PostgreSQL DB: CONNECTED (4 models seeded)" -ForegroundColor Green
    } else {
        Write-Host "      PostgreSQL DB: CONNECTED" -ForegroundColor Green
    }
} catch {
    Write-Host "      PostgreSQL DB: UNREACHABLE" -ForegroundColor Red
}

# ── 3. Ollama Server ───────────────────────────────────
Write-Host "[3/6] Checking Ollama Server..." -ForegroundColor Yellow
try {
    $ollama = Invoke-RestMethod -Uri "http://localhost:11434" `
        -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "      Ollama: RUNNING on port 11434" -ForegroundColor Green
} catch {
    Write-Host "      Ollama: NOT RUNNING on port 11434" -ForegroundColor Red
}

# ── 4. LiteLLM Proxy ──────────────────────────────────
Write-Host "[4/6] Checking LiteLLM Proxy..." -ForegroundColor Yellow
try {
    $litellm = Invoke-RestMethod -Uri "http://localhost:4001/health" `
        -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "      LiteLLM: RUNNING on port 4001" -ForegroundColor Green
} catch {
    Write-Host "      LiteLLM: NOT RUNNING on port 4001" -ForegroundColor Red
}

# ── 5. Backend API ─────────────────────────────────────
Write-Host "[5/6] Checking Backend API..." -ForegroundColor Yellow
try {
    $backend = Invoke-RestMethod -Uri "http://localhost:4000/api/health" `
        -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "      Backend: RUNNING on port 4000 (DB: $($backend.status))" -ForegroundColor Green
} catch {
    Write-Host "      Backend: NOT RUNNING on port 4000" -ForegroundColor Red
}

# ── 6. Frontend ────────────────────────────────────────
Write-Host "[6/6] Checking Frontend..." -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" `
        -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($frontend.StatusCode -eq 200) {
        Write-Host "      Frontend: RUNNING on port 3000 (HTTP 200)" -ForegroundColor Green
    }
} catch {
    Write-Host "      Frontend: NOT RUNNING on port 3000" -ForegroundColor Red
}

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "   Access the app: http://localhost:3000" -ForegroundColor White
Write-Host "=============================================`n" -ForegroundColor Cyan
```

### 11.2 Port Usage Verification

```powershell
# Check which processes are using required ports
Write-Host "Port Usage Summary:" -ForegroundColor Cyan

# Port 3000 (Frontend)
$port3000 = netstat -ano | Select-String ":3000"
Write-Host "Port 3000 (Frontend): $(if($port3000){'IN USE'}else{'FREE'})"

# Port 4000 (Backend)
$port4000 = netstat -ano | Select-String ":4000"
Write-Host "Port 4000 (Backend): $(if($port4000){'IN USE'}else{'FREE'})"

# Port 4001 (LiteLLM)
$port4001 = netstat -ano | Select-String ":4001"
Write-Host "Port 4001 (LiteLLM): $(if($port4001){'IN USE'}else{'FREE'})"

# Port 5432 (PostgreSQL)
$port5432 = netstat -ano | Select-String ":5432"
Write-Host "Port 5432 (PostgreSQL): $(if($port5432){'IN USE'}else{'FREE'})"

# Port 11434 (Ollama)
$port11434 = netstat -ano | Select-String ":11434"
Write-Host "Port 11434 (Ollama): $(if($port11434){'IN USE'}else{'FREE'})"
```

---

## 12. Production Build & Run

```
┌─────────────────────────────────────────────────────────────────────┐
│                   PRODUCTION vs DEVELOPMENT                          │
│                                                                      │
│  DEVELOPMENT:                                                        │
│  • Backend:  tsx watch (hot-reload, no build step)                  │
│  • Frontend: next dev (Turbopack, HMR, source maps)                 │
│  • Slower startup, faster iteration                                  │
│                                                                      │
│  PRODUCTION:                                                         │
│  • Backend:  tsc compile → node dist/index.js                       │
│  • Frontend: next build → next start                                │
│  • Faster runtime, optimized bundles, no hot-reload                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 12.1 Production – Backend Build & Run

```powershell
# ══════════════════════════════════════════════════════
# PRODUCTION BACKEND – Terminal 4 (replaces dev mode)
# ══════════════════════════════════════════════════════

cd "C:\Users\kashy\OneDrive\Documents\AIChat\backend"

# ── Step 1: Clean previous build ──────────────────────
# Remove old dist directory if it exists
if (Test-Path ".\dist") {
    Remove-Item -Recurse -Force ".\dist"
    Write-Host "Cleaned old dist directory" -ForegroundColor Yellow
}

# ── Step 2: TypeScript Compilation ────────────────────
Write-Host "Compiling TypeScript..." -ForegroundColor Cyan
npm run build

# Expected output:
# (no output = success)
# If errors appear, fix them before proceeding

# Verify dist directory was created
Test-Path ".\dist\index.js"
# Expected: True

# Verify all compiled files exist
Get-ChildItem -Recurse ".\dist" -Filter "*.js" | Select-Object Name, Length

# Expected files in dist/:
# index.js
# config.js
# database.js
# middleware/auth.js
# middleware/rateLimit.js
# routes/auth.js
# routes/chats.js
# routes/messages.js
# services/ai.js
# services/encryption.js

# ── Step 3: Run Production Server ─────────────────────
Write-Host "Starting production backend..." -ForegroundColor Cyan
npm start

# Expected output (same as dev but no "tsx watch" prefix):
# {"level":"info","message":"Backend server running on port 4000","timestamp":"..."}
# {"level":"info","message":"Frontend URL: http://localhost:3000","timestamp":"..."}
# {"level":"info","message":"LiteLLM URL: http://localhost:4001","timestamp":"..."}
# {"level":"info","message":"Default model: ollama/llama3.2","timestamp":"..."}

# ─────────────────────────────────────────────────────
# KEY DIFFERENCE from dev:
# - No hot-reload (file changes require manual restart)
# - Compiled JavaScript runs (faster startup)
# - Source maps available for debugging (tsconfig has sourceMap: true)
# ─────────────────────────────────────────────────────
```

### 12.2 Production – Frontend Build & Run

```powershell
# ══════════════════════════════════════════════════════
# PRODUCTION FRONTEND – Terminal 5 (replaces dev mode)
# ══════════════════════════════════════════════════════

cd "C:\Users\kashy\OneDrive\Documents\AIChat\frontend"

# ── Step 1: Clean previous build ──────────────────────
if (Test-Path ".\.next") {
    Remove-Item -Recurse -Force ".\.next"
    Write-Host "Cleaned old .next directory" -ForegroundColor Yellow
}

# ── Step 2: Production Build ──────────────────────────
Write-Host "Building Next.js production bundle..." -ForegroundColor Cyan
npm run build

# Expected output (this takes 30-120 seconds):
# ▲ Next.js 16.2.2
#
# Creating an optimized production build ...
# ✓ Compiled successfully
#
# Route (app)                              Size     First Load JS
# ┌ ○ /                                   X kB     XXX kB
# ├ ○ /_not-found                          XXX B    XXX kB
# └ ○ /chat                               X kB     XXX kB
# + First Load JS shared by all           XXX kB
#   ├ chunks/...                          XXX kB
#   └ other shared chunks (total)         XXX kB
#
# ○  (Static)   prerendered as static content

# Verify build succeeded
Test-Path ".\.next\standalone" -or (Test-Path ".\.next\static")
# Expected: True

# ── Step 3: Run Production Server ─────────────────────
Write-Host "Starting production frontend..." -ForegroundColor Cyan
npm start

# Expected output:
# ▲ Next.js 16.2.2
# - Local:         http://localhost:3000
# - Network:       http://172.xx.xxx.x:3000
# ✓ Starting...
# ✓ Ready in XXXms

# ─────────────────────────────────────────────────────
# KEY DIFFERENCES from dev:
# - No Turbopack (uses standard webpack output)
# - No Hot Module Replacement
# - Optimized/minified JavaScript bundles
# - Faster page load times
# - No source maps exposed to browser
# - compress: false still applies (for SSE streaming)
# ─────────────────────────────────────────────────────
```

### 12.3 Verify Production Build Output Sizes

```powershell
# After npm run build in frontend, check bundle sizes
# (Run while still in frontend directory)

# Check .next directory size
$nextSize = (Get-ChildItem ".\.next" -Recurse | 
    Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Total .next build size: $([Math]::Round($nextSize, 2)) MB"

# Check static assets
Get-ChildItem ".\.next\static" -Recurse | 
    Group-Object Extension | 
    Select-Object Name, Count | 
    Format-Table

# After npm run build in backend, check dist sizes
cd "C:\Users\kashy\OneDrive\Documents\AIChat\backend"

$distSize = (Get-ChildItem ".\dist" -Recurse | 
    Measure-Object -Property Length -Sum).Sum / 1KB
Write-Host "Total dist build size: $([Math]::Round($distSize, 2)) KB"
```

---

## 13. Development vs Production Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              DEVELOPMENT vs PRODUCTION – FULL COMPARISON                     │
├────────────────────────┬────────────────────────────┬───────────────────────┤
│  Aspect                │  Development               │  Production           │
├────────────────────────┼────────────────────────────┼───────────────────────┤
│  Backend Command       │  npm run dev               │  npm run build        │
│                        │  (tsx watch src/index.ts)  │  then: npm start      │
│                        │                            │  (node dist/index.js) │
├────────────────────────┼────────────────────────────┼───────────────────────┤
│  Frontend Command      │  npm run dev               │  npm run build        │
│                        │  (next dev + Turbopack)    │  then: npm start      │
│                        │                            │  (next start)         │
├────────────────────────┼────────────────────────────┼───────────────────────┤
│  Hot Reload            │  YES (tsx watch)           │  NO                   │
│  (Backend)             │  File save → auto restart  │  Manual restart       │
├────────────────────────┼────────────────────────────┼───────────────────────┤
│  HMR                   │  YES (Turbopack)           │  NO                   │
│  (Frontend)            │  Instant component updates │  Full page rebuild    │
├────────────────────────┼────────────────────────────┼───────────────────────┤
│  Startup Time          │  Backend: ~2s              │  Backend: ~1s         │
│                        │  Frontend: ~1s             │  Frontend: build=90s  │
│                        │                            │  start=1s             │
├────────────────────────┼────────────────────────────┼───────────────────────┤
│  Bundle Size           │  Large (unoptimized)       │  Small (minified)     │
├────────────────────────┼────────────────────────────┼───────────────────────┤
│  Source Maps           │  Available in browser      │  Server-side only     │
│                        │  DevTools                  │  (not exposed)        │
├────────────────────────┼────────────────────────────┼───────────────────────┤
│  TypeScript            │  Transpiled on-the-fly     │  Pre-compiled to JS   │
│  Compilation           │  by tsx                    │  dist/ directory      │
├────────────────────────┼────────────────────────────┼───────────────────────┤
│  Error Display         │  Full stack traces         │  Generic error msgs   │
├────────────────────────┼────────────────────────────┼───────────────────────┤
│  Performance           │  Slower (dev overhead)     │  Faster (optimized)   │
├────────────────────────┼────────────────────────────┼───────────────────────┤
│  PostgreSQL            │  Same in both              │  Same in both         │
│  Ollama                │  Same in both              │  Same in both         │
│  LiteLLM               │  Same in both              │  Same in both         │
│  Ngrok                 │  Same in both              │  Same in both         │
├────────────────────────┼────────────────────────────┼───────────────────────┤
│  When to use           │  Active coding/debugging   │  Showing to others    │
│                        │                            │  Performance testing  │
└────────────────────────┴────────────────────────────┴───────────────────────┘
```

---

## 14. Common Errors & Fixes

### 14.1 Backend Errors

```powershell
# ══════════════════════════════════════════════════════
# ERROR: "connect ECONNREFUSED 127.0.0.1:5432"
# CAUSE: PostgreSQL not running
# ══════════════════════════════════════════════════════
Start-Service -Name "postgresql-x64-18"

# ══════════════════════════════════════════════════════
# ERROR: "connect ECONNREFUSED 127.0.0.1:4001"
# CAUSE: LiteLLM proxy not running
# ══════════════════════════════════════════════════════
# Go to Terminal 3 and verify litellm is running
# If not, restart: litellm --config litellm-config.yaml --port 4001

# ══════════════════════════════════════════════════════
# ERROR: "ENCRYPTION_MASTER_SECRET must be set"
# CAUSE: .env file missing ENCRYPTION_MASTER_SECRET key
# ══════════════════════════════════════════════════════
# Check .env file:
Get-Content "C:\Users\kashy\OneDrive\Documents\AIChat\backend\.env" | 
    Select-String "ENCRYPTION_MASTER_SECRET"
# Must show: ENCRYPTION_MASTER_SECRET=ba8136e05daec9e...

# ══════════════════════════════════════════════════════
# ERROR: "Cannot find module" or import errors
# CAUSE: npm install not run, or node_modules deleted
# ══════════════════════════════════════════════════════
cd "C:\Users\kashy\OneDrive\Documents\AIChat\backend"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install

# ══════════════════════════════════════════════════════
# ERROR: Port 4000 already in use
# CAUSE: Previous backend instance still running
# ══════════════════════════════════════════════════════

# Find the process using port 4000
$proc = netstat -ano | Select-String ":4000" | 
    ForEach-Object { ($_ -split "\s+")[-1] } | 
    Select-Object -First 1
Write-Host "PID using port 4000: $proc"

# Kill that process
if ($proc) { Stop-Process -Id $proc -Force }

# ══════════════════════════════════════════════════════
# ERROR: TypeScript compilation errors (production build)
# CAUSE: Type errors in source files
# ══════════════════════════════════════════════════════
cd "C:\Users\kashy\OneDrive\Documents\AIChat\backend"

# Run tsc in check-only mode to see all errors
npx tsc --noEmit

# Fix all reported errors, then rebuild:
npm run build
```

### 14.2 Frontend Errors

```powershell
# ══════════════════════════════════════════════════════
# ERROR: Port 3000 already in use
# ══════════════════════════════════════════════════════
$proc = netstat -ano | Select-String ":3000" | 
    ForEach-Object { ($_ -split "\s+")[-1] } | 
    Select-Object -First 1
if ($proc) { Stop-Process -Id $proc -Force }

# ══════════════════════════════════════════════════════
# ERROR: "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set"
# or Google Sign-In button doesn't appear
# ══════════════════════════════════════════════════════
Get-Content "C:\Users\kashy\OneDrive\Documents\AIChat\frontend\.env.local"
# Must show NEXT_PUBLIC_GOOGLE_CLIENT_ID=...apps.googleusercontent.com

# ══════════════════════════════════════════════════════
# ERROR: API calls fail / CORS errors in browser console
# CAUSE: Backend not running or CORS misconfigured
# ══════════════════════════════════════════════════════

# Verify backend is running
Invoke-RestMethod -Uri "http://localhost:4000/api/health"

# Verify next.config.js rewrites are active
Get-Content "C:\Users\kashy\OneDrive\Documents\AIChat\frontend\next.config.js"
# Should show:
# async rewrites() {
#   return [{ source: '/api/:path*', destination: 'http://localhost:4000/api/:path*' }]
# }

# ══════════════════════════════════════════════════════
# ERROR: SSE streaming freezes / no tokens appear
# CAUSE: Next.js compression buffering SSE stream
# ══════════════════════════════════════════════════════
Get-Content "C:\Users\kashy\OneDrive\Documents\AIChat\frontend\next.config.js" | 
    Select-String "compress"
# Must show: compress: false

# ══════════════════════════════════════════════════════
# ERROR: ".next build" fails with type errors
# ══════════════════════════════════════════════════════
cd "C:\Users\kashy\OneDrive\Documents\AIChat\frontend"
npx tsc --noEmit
# Fix all errors shown, then:
npm run build

# ══════════════════════════════════════════════════════
# ERROR: node_modules issues / package conflicts
# ══════════════════════════════════════════════════════
cd "C:\Users\kashy\OneDrive\Documents\AIChat\frontend"
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
```

### 14.3 LiteLLM Errors

```powershell
# ══════════════════════════════════════════════════════
# ERROR: "venv" not recognized or litellm not found
# ══════════════════════════════════════════════════════
cd "C:\Users\kashy\OneDrive\Documents\AIChat"

# Re-activate venv
.\venv\Scripts\Activate

# Verify litellm installed
pip show litellm

# If not installed:
pip install "litellm[proxy]"

# ══════════════════════════════════════════════════════
# ERROR: Port 4001 already in use
# ══════════════════════════════════════════════════════
$proc = netstat -ano | Select-String ":4001" | 
    ForEach-Object { ($_ -split "\s+")[-1] } | 
    Select-Object -First 1
if ($proc) { Stop-Process -Id $proc -Force }

# ══════════════════════════════════════════════════════
# ERROR: "Connection refused" to Ollama
# CAUSE: LiteLLM can't reach Ollama on 11434
# ══════════════════════════════════════════════════════

# Verify Ollama is running (Terminal 2)
Invoke-RestMethod -Uri "http://localhost:11434" -Method GET

# If not running, go to Terminal 2 and run: ollama serve

# ══════════════════════════════════════════════════════
# ERROR: Model not found / "model xyz not available"
# ══════════════════════════════════════════════════════

# Check which models Ollama has downloaded
ollama list

# Download the missing model
ollama pull llama3.2
```

### 14.4 Ollama Errors

```powershell
# ══════════════════════════════════════════════════════
# ERROR: Port 11434 already in use
# CAUSE: Ollama already running (possibly as system service)
# ══════════════════════════════════════════════════════

# Check if Ollama is already running as a service
Get-Service -Name "ollama" -ErrorAction SilentlyContinue

# Check port
$proc = netstat -ano | Select-String ":11434" | 
    ForEach-Object { ($_ -split "\s+")[-1] } | 
    Select-Object -First 1
Write-Host "PID on 11434: $proc"

# If it's already running on 11434, you don't need to run ollama serve again
# Just verify it works:
Invoke-RestMethod -Uri "http://localhost:11434/api/tags"

# ══════════════════════════════════════════════════════
# ERROR: Model takes too long / timeout from backend
# CAUSE: Model too large for available RAM/GPU
# ══════════════════════════════════════════════════════

# Check available system memory
Get-CimInstance -ClassName Win32_OperatingSystem | 
    Select-Object @{N="FreeGB";E={[Math]::Round($_.FreePhysicalMemory/1MB,2)}},
                  @{N="TotalGB";E={[Math]::Round($_.TotalVisibleMemorySize/1MB,2)}}

# If low memory, use smaller model
# In backend .env, change:
# DEFAULT_MODEL=ollama/llama3.2      ← already smallest (2GB)
```

### 14.5 PostgreSQL Errors

```powershell
# ══════════════════════════════════════════════════════
# ERROR: "password authentication failed for user aichat"
# ══════════════════════════════════════════════════════
cd "C:\Program Files\PostgreSQL\18\bin"

# Reset the aichat user password
.\psql -U postgres -c "ALTER USER aichat WITH PASSWORD 'aichatbymayank';"

# ══════════════════════════════════════════════════════
# ERROR: Database "aichat" does not exist
# ══════════════════════════════════════════════════════
cd "C:\Program Files\PostgreSQL\18\bin"
.\psql -U postgres -c "CREATE DATABASE aichat OWNER aichat;"
.\psql -U aichat -d aichat -f "C:\Users\kashy\OneDrive\Documents\AIChat\database\init.sql"

# ══════════════════════════════════════════════════════
# ERROR: Tables missing / schema not initialized
# ══════════════════════════════════════════════════════
cd "C:\Program Files\PostgreSQL\18\bin"
.\psql -U aichat -d aichat -c "\dt"
# If tables not listed, re-run init.sql:
.\psql -U aichat -d aichat -f "C:\Users\kashy\OneDrive\Documents\AIChat\database\init.sql"

# ══════════════════════════════════════════════════════
# ERROR: Extension "uuid-ossp" does not exist
# CAUSE: PostgreSQL version mismatch or contrib not installed
# ══════════════════════════════════════════════════════
cd "C:\Program Files\PostgreSQL\18\bin"
.\psql -U postgres -d aichat -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
.\psql -U postgres -d aichat -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
```

---

## 15. Graceful Shutdown Order

```
┌─────────────────────────────────────────────────────────────────────┐
│              SHUTDOWN ORDER (Reverse of Startup)                     │
│                                                                      │
│  Shutdown in this order to avoid errors:                            │
│                                                                      │
│  1. Ngrok (Terminal 6)    ── Ctrl+C                                 │
│  2. Frontend (Terminal 5) ── Ctrl+C                                 │
│  3. Backend (Terminal 4)  ── Ctrl+C                                 │
│  4. LiteLLM (Terminal 3)  ── Ctrl+C                                 │
│  5. Ollama (Terminal 2)   ── Ctrl+C                                 │
│  6. PostgreSQL            ── Windows Service (leave running)        │
└─────────────────────────────────────────────────────────────────────┘
```

### 15.1 Individual Service Shutdown

```powershell
# In each terminal window press: Ctrl + C

# Terminal 6 (Ngrok)    → Ctrl+C → "Session Ended"
# Terminal 5 (Frontend) → Ctrl+C → Next.js server stops
# Terminal 4 (Backend)  → Ctrl+C → tsx/node process exits
# Terminal 3 (LiteLLM)  → Ctrl+C → Uvicorn server shuts down
# Terminal 2 (Ollama)   → Ctrl+C → Ollama serve stops

# PostgreSQL keeps running as Windows Service
# (intentional - it's a system service)

# To also stop PostgreSQL service:
Stop-Service -Name "postgresql-x64-18"
```

### 15.2 Force Kill All Ports (Emergency Reset)

```powershell
# Use only if Ctrl+C doesn't work and ports remain occupied

# Kill process on port 3000 (Frontend)
$p3000 = (netstat -ano | Select-String "LISTENING" | 
    Select-String ":3000 " | 
    ForEach-Object { ($_ -split "\s+")[-1] })[0]
if ($p3000) { Stop-Process -Id $p3000 -Force; Write-Host "Killed PID $p3000 (port 3000)" }

# Kill process on port 4000 (Backend)
$p4000 = (netstat -ano | Select-String "LISTENING" | 
    Select-String ":4000 " | 
    ForEach-Object { ($_ -split "\s+")[-1] })[0]
if ($p4000) { Stop-Process -Id $p4000 -Force; Write-Host "Killed PID $p4000 (port 4000)" }

# Kill process on port 4001 (LiteLLM)
$p4001 = (netstat -ano | Select-String "LISTENING" | 
    Select-String ":4001 " | 
    ForEach-Object { ($_ -split "\s+")[-1] })[0]
if ($p4001) { Stop-Process -Id $p4001 -Force; Write-Host "Killed PID $p4001 (port 4001)" }

# Kill process on port 11434 (Ollama)
$p11434 = (netstat -ano | Select-String "LISTENING" | 
    Select-String ":11434 " | 
    ForEach-Object { ($_ -split "\s+")[-1] })[0]
if ($p11434) { Stop-Process -Id $p11434 -Force; Write-Host "Killed PID $p11434 (port 11434)" }

Write-Host "All application ports cleared."
```

---

## 16. Quick Reference Cheat Sheet

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    AIChat – QUICK REFERENCE CHEAT SHEET                    ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  OPEN 5 POWERSHELL WINDOWS AND RUN IN ORDER:                             ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ TERMINAL 1 (PostgreSQL – verify only, can close after)              │ ║
║  │                                                                     │ ║
║  │  Get-Service -Name "postgresql*"                                    │ ║
║  │  Start-Service -Name "postgresql-x64-18"   ← only if Stopped       │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ TERMINAL 2 (Ollama – KEEP OPEN)                                     │ ║
║  │                                                                     │ ║
║  │  ollama serve                                                       │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ TERMINAL 3 (LiteLLM – KEEP OPEN)                                    │ ║
║  │                                                                     │ ║
║  │  cd "C:\Users\kashy\OneDrive\Documents\AIChat"                     │ ║
║  │  .\venv\Scripts\Activate                                            │ ║
║  │  litellm --config litellm-config.yaml --port 4001                  │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ TERMINAL 4 (Backend – KEEP OPEN)                                    │ ║
║  │                                                                     │ ║
║  │  cd "C:\Users\kashy\OneDrive\Documents\AIChat\backend"             │ ║
║  │                                                                     │ ║
║  │  DEV:  npm run dev                                                  │ ║
║  │  PROD: npm run build  then  npm start                               │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ TERMINAL 5 (Frontend – KEEP OPEN)                                   │ ║
║  │                                                                     │ ║
║  │  cd "C:\Users\kashy\OneDrive\Documents\AIChat\frontend"            │ ║
║  │                                                                     │ ║
║  │  DEV:  npm run dev                                                  │ ║
║  │  PROD: npm run build  then  npm start                               │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ TERMINAL 6 (Ngrok – OPTIONAL, KEEP OPEN)                            │ ║
║  │                                                                     │ ║
║  │  ngrok http --domain=unreversible-helga-supermilitary.ngrok-free.dev 3000 │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  ACCESS POINTS:                                                           ║
║  Local:   http://localhost:3000                                           ║
║  Remote:  https://unreversible-helga-supermilitary.ngrok-free.dev        ║
║  Backend: http://localhost:4000/api/health                                ║
║  LiteLLM: http://localhost:4001/health                                    ║
║  Ollama:  http://localhost:11434                                          ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  PORTS:                                                                   ║
║  3000 → Next.js Frontend                                                  ║
║  4000 → Express.js Backend                                                ║
║  4001 → LiteLLM Proxy                                                     ║
║  5432 → PostgreSQL                                                        ║
║  11434 → Ollama LLM Engine                                                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  SHUTDOWN (Ctrl+C in each terminal, reverse order):                       ║
║  T6 Ngrok → T5 Frontend → T4 Backend → T3 LiteLLM → T2 Ollama            ║
╚═══════════════════════════════════════════════════════════════════════════╝
```