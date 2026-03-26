# MythicCode

An AI-powered interactive coding course platform with D&D gamification. Learn to code through epic quests, earn XP, level up your character, and master programming with AI-generated courses.

**Key Features:**

- **Topic-Based Learning**: Select multiple related subtopics to generate custom courses tailored to your learning goals
- **AI-Generated Roadmaps**: Create dynamic learning paths for any topic with AI-suggested subtopics
- **Interactive Lesson Tasks**: Each lesson includes quizzes, coding challenges, or projects with AI-powered evaluation
- **D&D Gamification**: Earn XP, unlock achievements, and level up your character as you progress

Inspired by [boot.dev](https://boot.dev) and [roadmap.sh](https://roadmap.sh).

## Tech Stack Overview

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **React Router** - Routing
- **Monaco Editor** - Code editor
- **shadcn/ui** - UI components

### Backend

- **FastAPI** - Python web framework
- **SQLAlchemy** - ORM
- **Alembic** - Database migrations
- **SQLite** - Database
- **Pydantic** - Data validation
- **OpenRouter** - LLM API access

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 8 (package manager)
- **Python** >= 3.11
- **uv** (recommended) or **pip** (Python package manager)

## Setup Instructions

### 1. Clone the Repository

```bash
cd d:/Projects/code-course
```

### 2. Frontend Setup

```bash
# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
```

### 3. Backend Setup

```bash
cd server

# Create virtual environment
uv venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
uv pip install -r requirements.txt

# Create environment file
cp .env.example .env
```

Edit `server/.env` and add your OpenRouter API key:

```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

## Database Initialization

```bash
cd server

# Run migrations
alembic upgrade head

# Seed roadmap data (optional)
python -m seed.seed_roadmaps
```

The SQLite database will be created at `server/mythiccode.db`.

## Development Mode

Run both frontend and backend simultaneously in separate terminals:

### Terminal 1 - Backend

```bash
cd server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

### Terminal 2 - Frontend

```bash
pnpm dev
```

The dev server will start at `http://localhost:5173` with API proxy configured.

## Production Build

```bash
# Build frontend
pnpm build

# Start production server
cd server
uvicorn main:app --host 0.0.0.0 --port 8000
```

FastAPI will serve the built frontend from the `dist/` directory.

## Project Structure

```
code-course/
├── src/                          # React frontend
│   ├── app/                      # App components and pages
│   │   ├── components/           # UI components
│   │   ├── pages/                # Page components
│   │   ├── App.tsx               # Root app component
│   │   └── routes.tsx            # Route definitions
│   ├── api/                      # API client layer
│   │   ├── client.ts             # Fetch wrapper
│   │   ├── roadmaps.ts           # Roadmap API
│   │   ├── courses.ts            # Course API
│   │   └── profile.ts            # Profile API
│   ├── hooks/                    # React Query hooks
│   │   ├── use-roadmaps.ts
│   │   ├── use-courses.ts
│   │   └── use-profile.ts
│   ├── stores/                   # Zustand stores
│   │   ├── progress-store.ts
│   │   └── ui-store.ts
│   ├── types/                    # TypeScript types
│   └── styles/                   # Global styles
├── server/                       # FastAPI backend
│   ├── main.py                   # App factory
│   ├── config.py                 # Settings
│   ├── database.py               # SQLAlchemy setup
│   ├── routers/                  # API routes
│   │   ├── roadmaps.py
│   │   ├── topics.py
│   │   └── courses.py
│   ├── models/                   # ORM models
│   │   ├── topic.py
│   │   ├── roadmap.py
│   │   ├── course.py
│   │   └── progress.py
│   ├── schemas/                  # Pydantic schemas
│   ├── alembic/                  # Database migrations
│   └── requirements.txt          # Python dependencies
├── docs/                         # Documentation
│   ├── architecture.md
│   ├── api.md
│   └── testing.md
├── package.json                  # Node dependencies
├── vite.config.ts                # Vite configuration
└── README.md                     # This file
```

## Available Scripts

### Frontend Scripts

| Command      | Description              |
| ------------ | ------------------------ |
| `pnpm dev`   | Start development server |
| `pnpm build` | Build for production     |

### Backend Scripts

| Command                                    | Description                      |
| ------------------------------------------ | -------------------------------- |
| `uvicorn main:app --reload`                | Start dev server with hot reload |
| `alembic upgrade head`                     | Run database migrations          |
| `alembic revision --autogenerate -m "msg"` | Create new migration             |

## Environment Variables

### Frontend (.env)

| Variable             | Description                  | Default |
| -------------------- | ---------------------------- | ------- |
| `VITE_USE_MOCK_DATA` | Use mock data instead of API | `true`  |
| `VITE_API_BASE_URL`  | API base URL                 | `/api`  |

### Backend (server/.env)

| Variable             | Description          | Default                       |
| -------------------- | -------------------- | ----------------------------- |
| `DATABASE_URL`       | SQLite database URL  | `sqlite:///./mythiccode.db`   |
| `OPENROUTER_API_KEY` | OpenRouter API key   | `None`                        |
| `LLM_DEFAULT_MODEL`  | Default LLM model    | `anthropic/claude-3.5-sonnet` |
| `LLM_FAST_MODEL`     | Fast/cheap LLM model | `google/gemini-flash-1.5`     |
| `DEBUG`              | Enable debug mode    | `false`                       |

## Documentation

- [Architecture](docs/architecture.md) - System architecture and data flow
- [API Documentation](docs/api.md) - API endpoints and examples
- [Testing](docs/testing.md) - Testing guide and checklist

## License

MIT
