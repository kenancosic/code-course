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
- LLM: OpenRouter via LiteLLM

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
uv venv
.\.venv\Scripts\activate
uv pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
python -m seed.seed_roadmaps
```

Optional for LLM-backed generation and evaluation:

```env
OPENROUTER_API_KEY=your-key-here
```

Without an API key, custom roadmap generation falls back to a deterministic roadmap shape.

## Run The App

### Development

Backend:

```bash
cd server
.\venv\Scripts\activate
uvicorn server.main:app --reload --port 8000
```

Frontend:

```bash
pnpm dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:8000`
- Health check: `http://localhost:8000/health`

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
