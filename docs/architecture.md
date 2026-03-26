# Architecture Documentation

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MythicCode Platform                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐         ┌─────────────────────┐                   │
│  │   React Frontend    │◄───────►│   FastAPI Backend   │                   │
│  │   (Vite + TS)       │  HTTP   │   (Python)          │                   │
│  │                     │         │                     │                   │
│  │  • TanStack Query   │         │  • SQLAlchemy ORM   │                   │
│  │  • Zustand Stores   │         │  • Alembic Migrations│                  │
│  │  • React Router     │         │  • Pydantic Schemas │                   │
│  │  • Monaco Editor    │         │  • OpenRouter LLM   │                   │
│  └─────────────────────┘         └──────────┬──────────┘                   │
│                                             │                               │
│                                             ▼                               │
│                                    ┌─────────────────┐                     │
│                                    │    SQLite DB    │                     │
│                                    │  mythiccode.db  │                     │
│                                    └─────────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Roadmap Browsing Flow

```
User ──► React ──► TanStack Query ──► FastAPI ──► SQLAlchemy ──► SQLite
         ▲                                              │
         └──────────────────────────────────────────────┘
                              JSON Response
```

### 2. Course Generation Flow

```
User ──► React ──► POST /api/courses/generate ──► FastAPI
                                                  │
                                                  ▼
                                            ┌──────────┐
                                            │ Pipeline │
                                            │ Context  │
                                            └────┬─────┘
                                                 │
                    ┌────────────┬───────────────┼───────────────┬────────────┐
                    ▼            ▼               ▼               ▼            ▼
              ┌─────────┐  ┌──────────┐   ┌──────────┐    ┌──────────┐  ┌────────┐
              │ Outline │─►│  Lore    │──►│  Trial   │───►│   Quiz   │─►│  Save  │
              │Architect│  │  Scribe  │   │  Forger  │    │  Master  │  │   DB   │
              └────┬────┘  └────┬─────┘   └──────────┘    └──────────┘  └───┬────┘
                   │            │                                            │
                   └────────────┴────────────────────────────────────────────┘
                                          │
                                          ▼
                                    SSE Stream to
                                    React Frontend
```

### 3. Code Execution Flow

```
User Code ──► Monaco Editor ──► POST /api/practice/execute ──► FastAPI
                                                               │
                                                               ▼
                                                    ┌──────────────────┐
                                                    │ Sandbox Process  │
                                                    │ (Node/Python)    │
                                                    │ • Timeout: 5s    │
                                                    │ • Memory limit   │
                                                    │ • No network     │
                                                    └────────┬─────────┘
                                                             │
                                                             ▼
                                                    stdout/stderr/exit
                                                             │
                                                             ▼
                                                    Response to Frontend
```

## Frontend Architecture

### State Management Strategy

| Concern      | Tool           | Use Case                                |
| ------------ | -------------- | --------------------------------------- |
| Server State | TanStack Query | API data, caching, background updates   |
| Client State | Zustand        | UI state, theme, sidebar, notifications |

### Directory Structure

```
src/
├── api/                    # API client layer
│   ├── client.ts          # Fetch wrapper with error handling
│   ├── roadmaps.ts        # Roadmap API functions
│   ├── courses.ts         # Course API functions
│   └── profile.ts         # Profile API functions
├── hooks/                  # Custom React hooks
│   ├── use-roadmaps.ts    # TanStack Query hooks
│   ├── use-courses.ts
│   └── use-profile.ts
├── stores/                 # Zustand stores
│   ├── progress-store.ts  # XP, level, completions
│   └── ui-store.ts        # Sidebar, theme, modals
└── app/
    ├── components/        # Reusable UI components
    └── pages/             # Route-level components
```

### API Client Pattern

```typescript
// src/api/client.ts
const BASE_URL = '/api';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json();
}
```

### TanStack Query Hook Pattern

```typescript
// src/hooks/use-roadmaps.ts
export function useRoadmaps() {
  return useQuery({
    queryKey: ['roadmaps'],
    queryFn: fetchRoadmaps,
  });
}

export function useRoadmap(pathId: string) {
  return useQuery({
    queryKey: ['roadmaps', pathId],
    queryFn: () => fetchRoadmap(pathId),
    enabled: !!pathId,
  });
}
```

## Backend Architecture

### Layer Structure

```
HTTP Request
     │
     ▼
┌─────────────┐
│   Router    │  ◄── Input validation (Pydantic schemas)
│  (FastAPI)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │  ◄── Business logic
│   Layer     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Model     │  ◄── Data access (SQLAlchemy ORM)
│   (ORM)     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Database   │  ◄── SQLite
└─────────────┘
```

### Router Structure

```python
# server/routers/roadmaps.py
router = APIRouter(prefix="/roadmaps", tags=["roadmaps"])

@router.get("/", response_model=List[RoadmapPathResponse])
async def list_roadmaps(db: Session = Depends(get_db)):
    """Get all published roadmap paths."""
    paths = db.query(RoadmapPath).filter(RoadmapPath.is_published == True).all()
    return paths

@router.get("/{path_id}", response_model=RoadmapPathResponse)
async def get_roadmap(path_id: int, db: Session = Depends(get_db)):
    """Get a single roadmap path with nodes and connections."""
    path = db.query(RoadmapPath).filter(RoadmapPath.id == path_id).first()
    if not path:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return path
```

### Error Handling

```python
# server/main.py
@app.exception_handler(AppError)
async def app_error_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.error_code, "detail": exc.message}
    )
```

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│     topics      │◄────┤ roadmap_nodes    │     │ roadmap_paths   │
├─────────────────┤     ├──────────────────┤     ├─────────────────┤
│ id (PK)         │────►│ topic_id (FK)    │────►│ id (PK)         │
│ title           │     │ id (PK)          │◄────┤ title           │
│ description     │     │ path_id (FK)     │     │ description     │
│ ai_generated    │     │ position_x       │     │ icon            │
│ keywords        │     │ position_y       │     │ colors          │
└────────┬────────┘     │ tier             │     │ is_locked       │
         │              │ status           │     │ is_custom       │
         │              └──────────────────┘     └─────────────────┘
         │
         │       ┌───────────────────────────┐
         │       │   topic_connections       │
         │       ├───────────────────────────┤
         │       │ id (PK)                   │
         └──────►│ from_topic_id (FK)        │
                 │ to_topic_id (FK)          │
                 │ relationship_type         │
                 └───────────────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│     courses     │────►│     lessons      │     │ user_profiles   │
├─────────────────┤     ├──────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)          │     │ id (PK)         │
│ title           │     │ course_id (FK)   │     │ display_name    │
│ description     │     │ title            │     │ avatar_seed     │
│ topic_id (FK)   │     │ content_markdown │     │ total_xp        │
│ status          │     │ task_type        │     │ level           │
│ total_lessons   │     │ task_content     │     │ current_path_id │
│ total_xp        │     │ sort_order       │     └────────┬────────┘
└─────────────────┘     │ xp_reward        │              │
                        └────────┬─────────┘              │
                                 │                        │
                                 ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │  user_progress   │     │ user_achievements│
                        ├──────────────────┤     ├─────────────────┤
                        │ user_id (FK)     │     │ achievement_id  │
                        │ lesson_id (FK)   │     │ unlocked_at     │
                        │ course_id (FK)   │     └─────────────────┘
                        │ xp_earned        │
                        │ completed_at     │
                        └──────────────────┘
```

### Table Summary

| Table                 | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `topics`              | Central topic repository for learning content           |
| `topic_connections`   | Relationships between topics (prerequisites, subtopics) |
| `roadmap_paths`       | Learning paths (Frontend, Backend, DevOps, etc.)        |
| `roadmap_nodes`       | Individual nodes within a path, linked to topics        |
| `roadmap_connections` | Connections between nodes                               |
| `courses`             | Generated courses from topics or PDFs                   |
| `lessons`             | Individual lessons within a course (includes tasks)     |
| `user_profiles`       | User stats and character data                           |
| `user_progress`       | Lesson completion tracking                              |
| `achievements`        | Achievement definitions                                 |
| `user_achievements`   | Unlocked achievements                                   |
| `practice_sessions`   | Saved code practice attempts                            |
| `uploaded_pdfs`       | PDF upload metadata                                     |

### Topic-Based Learning System

The platform uses a flexible topic-based learning model:

- **Topics** are the central content units, stored in the `topics` table
- Topics can have relationships (prerequisites, subtopics) via `topic_connections`
- **Multi-Topic Courses**: Users can select multiple subtopics when generating a course via `POST /api/courses/generate` with `topic_ids` array
- **Dynamic Roadmaps**: Custom roadmap paths can be AI-generated for any topic via `POST /api/topics/generate-roadmap`

### Lesson Tasks

Each lesson includes an interactive task for skill assessment:

| Task Type | Description                      |
| --------- | -------------------------------- |
| `quiz`    | Multiple-choice questions        |
| `coding`  | Code writing challenges          |
| `project` | Larger project-based assignments |

Tasks are evaluated by AI via `POST /api/courses/{course_id}/lessons/{lesson_id}/evaluate`

## LLM Integration Architecture

### Multi-Agent Pipeline

```
Input: Topic + Context
         │
         ▼
┌─────────────────┐
│ Agent 1:        │
│ Outline         │──► JSON outline with lesson titles
│ Architect       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agent 2:        │
│ Lore Scribe     │──► Markdown lesson content
│ (runs N times)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agent 3:        │
│ Trial Forger    │──► Code exercises with tests
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agent 4:        │
│ Quiz Master     │──► Multiple choice questions
└────────┬────────┘
         │
         ▼
Output: Complete course saved to DB
```

### Streaming Architecture

```
FastAPI Endpoint
       │
       ▼
┌──────────────┐
│ SSE Response │◄─── text/event-stream
│ Generator    │
└──────┬───────┘
       │
       │  event: status
       │  data: {"stage": "outline"}
       │
       │  event: chunk
       │  data: {"content_delta": "..."}
       │
       │  event: complete
       │  data: {"course_id": "..."}
       ▼
    React Frontend
```
