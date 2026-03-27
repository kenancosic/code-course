# Development Log — MythicCode

This file is a historical development journal. It is not the source of truth for the current system contract.

Use `README.md`, `docs/api.md`, and `ARCHITECTURE.md` for the current implementation.

**Project**: MythicCode  
**Started**: 2026-03-24  
**Last Updated**: 2026-03-26  
**Status**: Active Development

---

## Project Overview

### What Is MythicCode?

MythicCode is an **AI-powered interactive coding education platform** with a D&D/gamification theme. Instead of passive video tutorials, users actively navigate structured learning paths called **Questlines** (roadmaps), generate AI-tailored courses for specific topics, and prove their skills through evaluated tasks — quizzes, coding challenges, and projects — all rated by AI and rewarded with XP and achievements.

The platform bridges the gap between free resources (like roadmap.sh) and structured courses by letting users:

- Browse curated learning paths across software engineering disciplines
- Select specific subtopics they want to learn within each path
- Generate a personalized course on-demand using AI (LLM via OpenRouter)
- Complete interactive tasks after each lesson that are graded by AI
- Track progress via XP, levels, achievements, and streaks

### Tech Stack

| Layer        | Technologies                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| Frontend     | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, React Router, Monaco Editor, shadcn/ui |
| Backend      | FastAPI, SQLAlchemy, Alembic, Pydantic                                                                    |
| Database     | SQLite (`mythiccode.db`)                                                                                  |
| AI           | OpenRouter API — Claude Sonnet 4.6 (default), Gemini 2.5 Flash (fast)                                     |
| Inspirations | [roadmap.sh](https://roadmap.sh), [boot.dev](https://boot.dev)                                            |

---

## User Vision & Original Request

### What The User Wants to Build

The user wants a platform where learning to code feels like an adventure, not a chore. Inspired by roadmap.sh, the goal is a system that:

1. **Visualizes learning as a journey** — Questlines (roadmaps) with tiers and nodes that unlock as you progress, like a game skill tree
2. **Lets users pick their own topics** — Instead of one-size-fits-all courses, users browse roadmaps, click on a topic node, see available subtopics, and select which ones they want to study
3. **Generates courses on-demand** — When a user selects subtopics, the AI generates a custom multi-lesson course covering exactly those areas
4. **Makes learning interactive** — Each lesson has a task (quiz, coding challenge, or project) that the AI evaluates and grades with feedback
5. **Gamifies everything** — XP for completing lessons, levels, achievements, streaks — making the grind feel rewarding
6. **Uses AI to connect knowledge** — The roadmap isn't just a tree; topics connect to each other with AI-suggested prerequisites and next steps

### Original User Request (2026-03-24)

> "You need to review once again roadmap (questline) and plan it out — now I'm missing some roadmaps here.
> Check that we have some questlines (roadmap) present, website that offers some of these roadmap is the www.roadmap.sh — we can only take few of them.
> When we navigate to Questline (roadmap) we can embark on quest. There will be titles of certain topics, as an example there will be CSS as a main topic, and under it subtopics like CSS Selectors, CSS Specificity, CSS Box Model, CSS Display, CSS Positioning, CSS Flexbox, CSS Grid, CSS Animations, CSS Transforms, etc. User can see initial most important and most popular subtopics, load additional subtopics in some list, and search specific subtopics. User can check multiple subsections, then click generate a course and it will generate a course based on the subsections selected. After generating course, when going through each subsection there should be a task to complete — task can be a quiz, a coding challenge, or a project. Evaluation of this task should also be done via AI."

---

## Phase 1: Architecture & Schema Design

### Problem: Topics Were Strings, Not Entities

The original schema stored `topic_keywords` as a comma-separated string inside `roadmap_nodes`. This made it impossible to:

- Create relationships between topics
- Reuse topics across multiple roadmaps
- Support dynamic topic discovery
- Have AI suggest prerequisites or next steps

### Solution: Two-Layer Architecture

```
Layer 1: Global Knowledge Graph
┌─────────────────┐       ┌──────────────────────┐
│     topics      │◄──────│  topic_connections    │
│─────────────────│       │───────────────────────│
│ id              │       │ id                    │
│ title           │       │ from_topic_id          │
│ description     │       │ to_topic_id            │
│ ai_generated    │       │ relationship_type      │
│ keywords        │       │ ai_confidence          │
└─────────────────┘       └──────────────────────┘

Layer 2: Custom Roadmap Layer
┌─────────────────┐       ┌──────────────────────┐
│  roadmap_paths  │◄──────│   roadmap_nodes       │
│─────────────────│       │───────────────────────│
│ id              │       │ id                    │
│ title           │       │ path_id (FK)          │
│ description     │       │ topic_id (FK)          │
│ icon            │       │ position_x/y           │
│ colors          │       │ tier                  │
│ sort_order      │       │ status                │
│ is_locked       │       └───────────────────────┘
│ user_id (FK)    │
│ is_custom       │              │
└─────────────────┘              │ (topics)
                         ┌───────▼──────────┐
                         │    courses       │
                         │─────────────────│
                         │ id               │
                         │ title            │
                         │ topic_id (FK)    │
                         │ status           │
                         │ total_lessons    │
                         │ total_xp         │
                         └─────────────────┘
```

### Migration Applied

- `98cd612f4d16_update_schema_for_custom_roadmaps` — creates all new tables
- Second migration adds `task_type` and `task_content` to `lessons` table

### SQLAlchemy Models

| File                        | Contents                                                        |
| --------------------------- | --------------------------------------------------------------- |
| `server/models/topic.py`    | `Topic`, `TopicConnection`                                      |
| `server/models/roadmap.py`  | `RoadmapPath`, `RoadmapNode`, `RoadmapConnection`               |
| `server/models/course.py`   | `Course`, `Lesson` (with task fields)                           |
| `server/models/progress.py` | `UserProfile`, `UserProgress`, `Achievement`, `UserAchievement` |

---

## Phase 2: Database Schema Restructuring

_(Same as Phase 1 — documenting the structural changes)_

The decoupling of `Course` from `RoadmapNode` via `topic_id` was the key architectural decision. A course now belongs to a topic, not a specific roadmap node. This means the same course can appear relevant across multiple roadmaps that share a topic.

```python
# Courses are now tied to topics, not roadmap nodes
class Course(Base):
    topic_id = Column(Integer, ForeignKey("topics.id"))  # was roadmap_node_id
    # ... rest of fields
```

---

## Phase 3: Seed Data & Content Population

### Before (Phase 1 Initial Seed)

The initial seed script created only:

- **2 roadmaps**: Frontend Developer, Backend Developer
- **3 nodes each** (only main topic per roadmap)
- **~35 topics** with sparse subtopics (only HTML/CSS/JS had subtopics)

### After (Phase 2 Rewrite)

The seed script was rewritten to load **4 rich JSON files** from `server/seed/data/`:

| Roadmap              | Nodes | Tiers | Subtopics per Node | Icon     |
| -------------------- | ----- | ----- | ------------------ | -------- |
| Frontend Development | 24    | 5     | 4-7 each           | Monitor  |
| Backend Development  | 8     | 2     | 4-6 each           | Server   |
| DevOps               | 6     | 2     | 4-5 each           | Cloud    |
| Database Engineering | 6     | 2     | 4-6 each           | Database |

**Total**: ~44 parent topics, ~250+ subtopics, all connected via `TopicConnection` records with `relationship_type="subtopic"`.

### Subtopic Coverage

Every node in every roadmap now has a rich subtopic hierarchy. Example — "CSS Layouts":

- CSS Flexbox, CSS Grid, Responsive Design, Media Queries, CSS Variables, CSS Animations, CSS Transforms

Example — "React Hooks":

- useState, useEffect, useContext, useRef, useMemo and useCallback, Custom Hooks

### Seed Script Architecture

- **Idempotent**: All helpers check for existing records before inserting
- **JSON ID Mapping**: Maps JSON file node IDs → actual DB node IDs for `RoadmapConnection` records
- **First Node Available**: First node of each roadmap starts as `status="available"`

### Files Created/Updated

- `server/seed/data/frontend.json` — 24 nodes, 29 connections (5 tiers)
- `server/seed/data/backend.json` — 8 nodes, 8 connections
- `server/seed/data/devops.json` — 6 nodes, 6 connections
- `server/seed/data/database.json` — 6 nodes, 6 connections
- `server/seed/seed_roadmaps.py` — Complete rewrite

---

## Phase 4: Multi-Topic Course Generation

### Backend

- `POST /api/courses/generate` accepts `topic_ids: List[int]`
- Combines titles, descriptions, and keywords from all selected topics
- 4-agent LLM pipeline generates course content via SSE stream

### Frontend

- `generateCourseStream(topicIds: number[])` in `use-courses.ts`
- Subtopic selection sheet in `RoadmapDetail.tsx` — checkboxes for multi-select, Select All / Clear
- Generates course with all selected topic IDs (main topic + subtopics)

---

## Phase 5: Lesson Tasks & AI Evaluation

### Task Types

| Type    | Description               | UI Input                 |
| ------- | ------------------------- | ------------------------ |
| Quiz    | Multiple choice questions | RadioGroup               |
| Coding  | Code challenges           | Textarea / Monaco Editor |
| Project | Project-based tasks       | Large textarea           |

### AI Evaluation Flow

```
User submits answer
    → POST /api/courses/{id}/lessons/{id}/evaluate
    → Backend sends answer + task_content to LLM
    → LLM returns {is_correct, feedback, suggestions, xp_earned}
    → Frontend shows result + confetti on success
    → User can mark lesson complete via POST /api/progress/complete-lesson
```

### Evaluation Endpoint

- **Route**: `POST /api/courses/{course_id}/lessons/{lesson_id}/evaluate`
- **Request**: `{ "answer": "string" }`
- **Response**: `{ "is_correct": bool, "feedback": str, "suggestions": str, "xp_earned": int }`

---

## Phase 6: Frontend Implementation

### Pages & Components

| File                | Purpose                                                             |
| ------------------- | ------------------------------------------------------------------- |
| `RoadmapDetail.tsx` | Roadmap canvas with tier rows, node selection panel, subtopic sheet |
| `CourseView.tsx`    | Lesson viewer with markdown, code playground, task section          |
| `RoadmapList.tsx`   | Roadmap cards grid with icons and progress                          |
| `Home.tsx`          | Dashboard with stats, recent courses, custom path generation        |
| `Profile.tsx`       | XP, level, achievements, activity feed                              |
| `Practice.tsx`      | LeetCode-style coding challenges                                    |

### New Hooks

| Hook             | Purpose                                    |
| ---------------- | ------------------------------------------ |
| `use-topic.ts`   | Fetch topic with subtopics and connections |
| `use-courses.ts` | Courses CRUD + SSE generation + evaluation |

---

## Phase 7: Bug Fixes

### AmbiguousForeignKeysError

**Error**: SQLAlchemy couldn't determine join between `user_profiles` and `roadmap_paths`  
**Cause**: Two FK paths existed (`current_path_id → roadmap_paths.id` and `roadmap_paths.user_id → user_profiles.id`)  
**Fix**: `current_path = relationship("RoadmapPath", foreign_keys=[current_path_id])` in `models/progress.py`

---

## Phase 8: Seed Data & API Fixes

### Issues Found During Review (2026-03-26)

1. **`GET /api/topics/{id}` returned flat response** — Missing `subtopics[]`, `outgoing_connections[]`, `incoming_connections[]`. Frontend expected these. Subtopic selection sheet was always empty.

2. **Seed script ignored JSON files** — 4 rich JSON files existed but weren't loaded. Only 2 roadmaps with 3 nodes each were created.

3. **No subtopics for most nodes** — Only HTML/CSS/JS had subtopics. Most roadmap nodes couldn't offer subtopic selection.

4. **Frontend type mismatch** — `Subtopic` interface had phantom `topic_id` field; `TopicConnection` used `connection_type` instead of `relationship_type`.

### Fix 1: Topics API (`server/schemas/topic.py` + `server/routers/topics.py`)

Added `TopicDetailResponse` that extends `TopicResponse`:

```python
class TopicDetailResponse(TopicResponse):
    subtopics: List[TopicResponse] = []
    outgoing_connections: List[TopicConnectionResponse] = []
    incoming_connections: List[TopicConnectionResponse] = []
```

Endpoint queries `topic_connections` where `from_topic_id == topic_id AND relationship_type == "subtopic"` to derive subtopics.

### Fix 2: Seed Script Rewrite (`server/seed/seed_roadmaps.py`)

Complete rewrite — loads all 4 JSON files, creates all 44 parent topics with subtopic hierarchies, maps JSON IDs → DB IDs for connections, sets first node as available, idempotent.

### Fix 3: Frontend Types (`src/hooks/use-topics.ts`)

- Added `TopicBase` interface matching backend `TopicResponse`
- `Subtopic` → deprecated alias for `TopicBase`
- Fixed `TopicConnection.relationship_type` (was `connection_type`)
- Added `ai_confidence: number | null`

### Statistics

| Metric                | Before        | After               |
| --------------------- | ------------- | ------------------- |
| Roadmap paths         | 2             | 4                   |
| Nodes per roadmap     | 3, 3          | 24, 8, 6, 6         |
| Total topics          | ~35           | ~250+               |
| Subtopics per node    | 0-10 (sparse) | 4-7 (comprehensive) |
| API returns subtopics | ❌            | ✅                  |

---

## API Reference

### Topics

| Method | Endpoint                       | Description                              |
| ------ | ------------------------------ | ---------------------------------------- |
| GET    | `/api/topics/`                 | List topics, optional `?query=` search   |
| GET    | `/api/topics/{id}`             | Get topic with subtopics and connections |
| POST   | `/api/topics/generate-roadmap` | Create custom AI-generated roadmap       |

### Courses

| Method | Endpoint                                  | Description                    |
| ------ | ----------------------------------------- | ------------------------------ |
| GET    | `/api/courses/`                           | List all courses               |
| GET    | `/api/courses/{id}`                       | Get course with lessons        |
| POST   | `/api/courses/generate`                   | Generate course via SSE stream |
| POST   | `/api/courses/{id}/lessons/{id}/evaluate` | Evaluate lesson task           |
| DELETE | `/api/courses/{id}`                       | Delete course                  |

### Progress

| Method | Endpoint                        | Description                |
| ------ | ------------------------------- | -------------------------- |
| POST   | `/api/progress/complete-lesson` | Mark lesson done, award XP |
| GET    | `/api/progress/summary`         | Overall stats              |
| GET    | `/api/progress/roadmap/{id}`    | Roadmap completion %       |
| GET    | `/api/progress/course/{id}`     | Lesson-by-lesson status    |

### Profile

| Method | Endpoint                    | Description                               |
| ------ | --------------------------- | ----------------------------------------- |
| GET    | `/api/profile/`             | Full profile with stats                   |
| PUT    | `/api/profile/`             | Update display name, avatar, current path |
| GET    | `/api/profile/achievements` | All achievements with unlock status       |
| GET    | `/api/profile/skills`       | Skill levels per roadmap                  |
| GET    | `/api/profile/activity`     | Recent activity feed                      |

---

## Known Issues & Technical Debt

| Priority | Issue                             | Description                                                                        |
| -------- | --------------------------------- | ---------------------------------------------------------------------------------- |
| Medium   | `practice_sessions` type mismatch | FK columns are `String` but point to `Integer` PKs                                 |
| Medium   | Conflicting XP formulas           | `progress_service` uses `floor(100 * N^1.5)`, `profile_service` uses `level * 100` |
| Low      | `schemas/progress.py` is stale    | Doesn't match actual models; routers use inline schemas                            |
| Low      | Exercise/quiz data discarded      | LLM agents 3 & 4 generate data but it's never persisted                            |
| Low      | Practice.tsx bug                  | `setShowHint(hintsRevealed)` references undeclared state setter                    |

---

## What Else Needs Documentation Updates

Based on the current state of the codebase, the following files or sections should also be reviewed:

### High Priority

1. **`docs/api.md`** — The API reference may need updating after the `TopicDetailResponse` change to `GET /api/topics/{id}`. Also needs the 4 new roadmap endpoints documented.

2. **`ARCHITECTURE.md`** — The ERD diagrams should reflect the actual current schema (the `Seed Data Implementation` section in CHANGELOG still shows the old 2-roadmap state).

3. **`server/llm/prompts/`** — The prompt templates and pipeline agent documentation should be reviewed to see if exercises/quiz data can be wired up to persist.

### Medium Priority

4. **`server/services/practice_service.py`** — The inline `PracticeSession` model has a type mismatch bug. Either fix the FK columns or add a migration. This should be documented as a known issue.

5. **`src/app/pages/Practice.tsx`** — The hint state bug (`setShowHint` undeclared) should be fixed and documented.

6. **`docs/testing.md`** — If it exists, needs review for current API surface.

### Lower Priority

7. **`src/types/roadmap.ts`** and **`src/types/course.ts`** — Legacy Zod schemas that aren't used by the active hooks. Either clean them up or document them as legacy.

8. **`server/services/progress_service.py`** vs **`server/services/profile_service.py`** — The conflicting XP/level formulas should be unified and documented.

9. **README.md** — The `VITE_USE_MOCK_DATA` default is `true` in the docs but should be `false` for real API usage. The environment variable table may be misleading.

---

## Next Steps (Recommended)

1. **Re-seed the database** — Run `python -m server.seed.seed_roadmaps` to populate all 4 roadmaps with their full node trees and subtopics

2. **Fix XP/level system** — Unify the two conflicting formulas into one

3. **Fix practice_sessions migration** — Add proper FK columns with a migration

4. **AI roadmap generation** — Wire up the `POST /api/topics/generate-roadmap` stub to actually call the LLM for topic suggestions

5. **User authentication** — Currently hardcoded to `user_id=1`

6. **Persist exercises & quizzes** — LLM pipeline agents generate this data; it should be saved to enable spaced repetition and review modes

---

_This log is maintained as a living document throughout development._
