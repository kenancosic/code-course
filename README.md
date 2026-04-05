# MythicCode

MythicCode is a single-user React + FastAPI + SQLite learning app for building AI-generated coding courses with roadmap-style progression and lightweight gamification.

The current milestone keeps the app as a modular monolith:

- React route pages call feature hooks in `src/hooks`
- FastAPI routers call service-layer business logic in `server/services`
- SQLAlchemy models in `server/models` own persistence
- The backend serves the built frontend in production

## Current Capabilities

- Browse curated roadmap paths and inspect nodes/topics
- Generate custom AI-shaped roadmaps from a free-form topic
- Generate courses from one or more topic IDs over an SSE stream
- Read lesson content and evaluate lesson tasks
- Track lesson completion, XP, levels, streaks, and achievements
- Edit the local profile and current roadmap path
- Run practice code in JavaScript or Python and persist practice sessions

## Stack

- Frontend: React 18, TypeScript, Vite, Tailwind, TanStack Query
- Backend: FastAPI, SQLAlchemy, Alembic, Pydantic
- Database: SQLite
- LLM: Local Codex CLI broker by default, with an optional OpenAI fallback path still present in the backend

## Prerequisites

- Node.js 20+
- `pnpm`
- Python 3.11+
- `uv` recommended, or `pip`

## Setup

### Frontend

```bash
pnpm install
Copy-Item .env.example .env
```

The frontend `.env` supports:

```env
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=/api
```

### Backend

```bash
cd server
py -3.11 -m venv venv
.\venv\Scripts\activate
python -m pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
python -m seed.seed_roadmaps
```

Or from the repo root on Windows:

```bash
pnpm run setup:local
```

Optional and recommended for local AI-backed generation and evaluation:

```env
AI_BACKEND=codex_cli
CODEX_EXECUTABLE=codex
CODEX_WORKDIR=.
CODEX_TIMEOUT_SECONDS=120
CODEX_QUEUE_MAXSIZE=8
CODEX_MAX_RETRIES=2
```

This local hack assumes Codex CLI is installed and already logged in on your machine. The backend writes each AI job to a temporary prompt file, queues requests through one in-process worker, invokes local `codex`, and then parses the final answer back into the app.

If local Codex is not configured or unavailable, custom roadmap generation falls back to a deterministic roadmap shape. AI-backed practice generation, AI helper feedback, and lesson evaluation return a clear `503` error until `CODEX_EXECUTABLE` points at a working Codex CLI installation.

The old `OPENAI_API_KEY` setting is still accepted by the codebase as a dormant fallback for non-`codex_cli` backends, but it is no longer the default mode.

## Run The App

### Development

Backend:

```bash
powershell -ExecutionPolicy Bypass -File .\scripts\run-backend.ps1
```

Frontend:

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
pnpm dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:8000`
- Health check: `http://localhost:8000/health`

`/health` now includes an `ai` section with the backend mode, resolved Codex executable, queue length, worker status, and the last runner error when local Codex mode is active.

### Production Build

```bash
pnpm build
cd server
.\venv\Scripts\activate
uvicorn server.main:app --host 0.0.0.0 --port 8000
```

## Verification

Frontend:

```bash
pnpm exec tsc --noEmit
pnpm lint
```

Backend:

```bash
cd server
.\venv\Scripts\activate
python -m unittest discover -s tests -v
```

## Project Structure

```text
code-course/
├── src/
│   ├── app/                # Pages, layout, UI components
│   ├── hooks/              # Canonical frontend data layer
│   ├── stores/             # Local UI state
│   └── types/              # Shared frontend contract types
├── server/
│   ├── routers/            # FastAPI transport layer
│   ├── services/           # Domain and application logic
│   ├── models/             # SQLAlchemy models
│   ├── schemas/            # Pydantic schemas
│   ├── llm/                # LLM client, prompts, streaming helpers
│   ├── alembic/            # Database migrations
│   └── tests/              # API contract tests
├── docs/
│   ├── adr/                # Architecture decision records
│   ├── api.md              # Implemented API contract
│   ├── architecture.md     # Pointer to the canonical architecture doc
│   └── testing.md          # Supplemental testing notes
├── ARCHITECTURE.md         # Current-state architecture
├── CHANGELOG.md            # Historical project changes
└── log.md                  # Historical development notes
```

## Canonical Docs

- Product setup and runbook: `README.md`
- Implemented API contract: `docs/api.md`
- Current architecture and boundaries: `ARCHITECTURE.md`
- Architectural decision trail: `docs/adr/`

`CHANGELOG.md` and `log.md` are historical records only and should not be treated as the source of truth for the active contract.
