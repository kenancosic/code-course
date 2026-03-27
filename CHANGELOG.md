# Changelog — MythicCode

This file is a historical change record. It is not the source of truth for the current API or architecture contract.

For the active contract, use `README.md`, `docs/api.md`, and `ARCHITECTURE.md`.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Phase 1: Database Schema Restructuring](#phase-1-database-schema-restructuring)
3. [Phase 2: Seed Data & API Fixes](#phase-2-seed-data--api-fixes)
4. [Multi-Topic Course Generation](#multi-topic-course-generation)
5. [Lesson Tasks & AI Evaluation](#lesson-tasks--ai-evaluation)
6. [Frontend Updates](#frontend-updates)
7. [Bug Fixes](#bug-fixes)
8. [Known Issues](#known-issues)
9. [Future Considerations](#future-considerations)

---

## Project Overview

**MythicCode** is an AI-powered interactive coding education platform with a D&D/gamification theme. Users navigate learning paths called Questlines (roadmaps), generate AI-tailored multi-topic courses, complete interactive tasks (quizzes, coding challenges, projects) evaluated by AI, and track progress via XP, levels, and achievements.

The platform is inspired by [roadmap.sh](https://roadmap.sh) and [boot.dev](https://boot.dev).

### User Vision

The user wanted a platform where:

- Learning paths are visualized as interactive roadmap trees (like roadmap.sh)
- Users pick specific subtopics within each topic node
- AI generates a custom course on-demand covering selected subtopics
- Each lesson has an evaluated task (quiz, coding, or project)
- Progress is gamified with XP, levels, and achievements

---

## Phase 1: Database Schema Restructuring

### Problem

Original schema stored `topic_keywords` as comma-separated strings inside `roadmap_nodes`. This prevented topic reuse, relationship modeling, and dynamic discovery.

### Solution: Two-Layer Architecture

**Layer 1 — Global Knowledge Graph**

```
topics ──► topic_connections
(from_topic_id, to_topic_id, relationship_type, ai_confidence)
```

**Layer 2 — Custom Roadmap Layer**

```
roadmap_paths ──► roadmap_nodes ──► topics
                    │
                    └──► courses (topic_id, not roadmap_node_id)
```

### Schema Changes

| Table               | Old                                    | New                                                                     |
| ------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| `topics`            | N/A (was string in nodes)              | New table: id, title, description, ai_generated, keywords               |
| `topic_connections` | N/A                                    | New table: from_topic_id, to_topic_id, relationship_type, ai_confidence |
| `roadmap_paths`     | Basic info                             | Added user_id, is_custom                                                |
| `roadmap_nodes`     | Had title, description, topic_keywords | Now references topic_id, has status field                               |
| `courses`           | roadmap_node_id                        | Now topic_id (decoupled from roadmap)                                   |
| `lessons`           | Basic fields                           | Added task_type, task_content                                           |

### Migrations

- `98cd612f4d16_update_schema_for_custom_roadmaps` — base migration creating all new tables
- `728b8e286ade` — adds `task_type` and `task_content` to `lessons`

---

## Phase 2: Seed Data & API Fixes

### Date: 2026-03-26

### Issues Found During Review

1. **`GET /api/topics/{id}` returned flat `TopicResponse`** — Frontend expected `subtopics[]`, `outgoing_connections[]`, `incoming_connections[]`. Subtopic selection sheet was always empty.
2. **Seed script ignored JSON files** — 4 rich JSON files existed but weren't loaded. Only 2 roadmaps with 3 nodes each were created.
3. **Most nodes had no subtopics** — Course generation couldn't offer subtopic selection for most topics.
4. **Frontend types mismatched backend** — `Subtopic` had phantom `topic_id` field; `TopicConnection` used wrong field name.

### Fix 1: Topics API (`server/schemas/topic.py` + `server/routers/topics.py`)

Added `TopicDetailResponse` extending `TopicResponse`:

```python
class TopicDetailResponse(TopicResponse):
    subtopics: List[TopicResponse] = []
    outgoing_connections: List[TopicConnectionResponse] = []
    incoming_connections: List[TopicConnectionResponse] = []
```

Endpoint now queries `topic_connections` to derive subtopics where `relationship_type == "subtopic"`.

### Fix 2: Seed Script Rewrite (`server/seed/seed_roadmaps.py`)

Complete rewrite. Now loads all 4 JSON files, creates all 44 parent topics with comprehensive subtopic hierarchies (200+ subtopics total), maps JSON node IDs to DB IDs for connections, sets first node as `status="available"`, fully idempotent.

### Fix 3: Frontend Types (`src/hooks/use-topics.ts`)

- Added `TopicBase` matching backend `TopicResponse` shape
- `Subtopic` → deprecated alias for `TopicBase`
- Fixed `TopicConnection.relationship_type` (was `connection_type`)
- Added `ai_confidence: number | null`

### Roadmaps Now Available

| Roadmap              | Nodes | Tiers | Subtopics | Icon     |
| -------------------- | ----- | ----- | --------- | -------- |
| Frontend Development | 24    | 5     | 4-7 each  | Monitor  |
| Backend Development  | 8     | 2     | 4-6 each  | Server   |
| DevOps               | 6     | 2     | 4-5 each  | Cloud    |
| Database Engineering | 6     | 2     | 4-6 each  | Database |

**Total: ~44 parent topics, ~250+ subtopics**

---

## Multi-Topic Course Generation

### Backend (`server/schemas/course.py`, `server/services/course_service.py`)

```python
class GenerateCourseRequest(BaseModel):
    topic_ids: List[int]  # Changed from single topic_id
    model: Optional[str] = None
```

- `POST /api/courses/generate` accepts array of topic IDs
- Combines titles, descriptions, keywords from all selected topics
- 4-agent LLM pipeline generates content via SSE stream

### Frontend (`src/hooks/use-courses.ts`, `src/app/pages/RoadmapDetail.tsx`)

- `generateCourseStream(topicIds: number[])` — SSE stream generator
- Subtopic selection sheet with checkboxes, Select All / Clear
- Generates course with main topic + all selected subtopics

---

## Lesson Tasks & AI Evaluation

### New Lesson Fields

| Field          | Type   | Values                      | Description              |
| -------------- | ------ | --------------------------- | ------------------------ |
| `task_type`    | String | "quiz", "coding", "project" | Task category            |
| `task_content` | Text   | —                           | Task instructions/prompt |

### Task Types

| Type    | Input                    | Evaluation                     |
| ------- | ------------------------ | ------------------------------ |
| Quiz    | Radio buttons            | LLM grades choice              |
| Coding  | Textarea / Monaco Editor | LLM evaluates code correctness |
| Project | Large textarea           | LLM evaluates project quality  |

### Evaluation Endpoint

```
POST /api/courses/{course_id}/lessons/{lesson_id}/evaluate
Body: { "answer": "string" }
Response: { "is_correct": bool, "feedback": str, "suggestions": str, "xp_earned": int }
```

### AI Evaluation Flow

```
User submits answer
    → Backend sends answer + task_content to LLM
    → LLM returns structured evaluation
    → Frontend shows feedback + confetti on success
    → User marks lesson complete (awards XP)
```

---

## Frontend Updates

### Files Modified/Created

| File                              | Changes                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `src/hooks/use-courses.ts`        | Updated generateCourseStream for multi-topic, added TaskType, added useEvaluateLesson |
| `src/hooks/use-topics.ts`         | Topic detail hook with subtopics; fixed types                                         |
| `src/hooks/index.ts`              | Re-exports all hooks and types                                                        |
| `src/app/pages/RoadmapDetail.tsx` | Canvas view, node selection panel, subtopic selection sheet                           |
| `src/app/pages/CourseView.tsx`    | Lesson viewer, markdown renderer, TaskSection component                               |
| `src/app/pages/Home.tsx`          | Dashboard with custom path generation                                                 |
| `src/app/pages/Practice.tsx`      | LeetCode-style challenges (note: has hint state bug)                                  |

### Key UI Components

**Subtopic Selection Sheet**

- Opens when clicking "Generate Course" on a node with subtopics
- Multi-select checkboxes for subtopics
- Select All / Clear buttons, selected count
- Generate button with SSE progress stream

**Task Section (CourseView)**

- Task type badge (Quiz / Coding / Project)
- Contextual input based on type (RadioGroup / Textarea / Monaco)
- Evaluate button with loading state
- Feedback display with success/error styling
- Confetti animation on correct answer
- XP earned display

---

## Bug Fixes

### AmbiguousForeignKeysError

**Problem**: SQLAlchemy couldn't determine join between `user_profiles` and `roadmap_paths` (two FK paths existed)  
**Fix**: `relationship("RoadmapPath", foreign_keys=[current_path_id])` in `models/progress.py`

---

## Known Issues

| Priority | Issue                                                                                        | Status    |
| -------- | -------------------------------------------------------------------------------------------- | --------- |
| Medium   | `practice_sessions` FK type mismatch — `String` FKs pointing to `Integer` PKs                | Not fixed |
| Medium   | Conflicting XP formulas — `progress_service` uses exponential, `profile_service` uses linear | Not fixed |
| Low      | `schemas/progress.py` is stale — doesn't match actual models                                 | Not fixed |
| Low      | Exercise/quiz data from LLM pipeline never persisted                                         | Not fixed |
| Low      | `Practice.tsx` — `setShowHint` references undeclared state                                   | Not fixed |

---

## Future Considerations

1. **AI Roadmap Generation** — Wire up `POST /api/topics/generate-roadmap` to call LLM for topic suggestions and connections
2. **Topic Search Enhancement** — Web search + LLM knowledge base for real topic data
3. **User Authentication** — Multi-user support (currently hardcoded to `user_id=1`)
4. **Course Recommendation Engine** — Suggest courses based on roadmap completion and progress
5. **Gamification** — Achievement system, leaderboards, daily challenges, streak tracking
6. **UI/UX** — Better roadmap visualization, drag-and-drop reordering, mobile responsiveness
7. **Persist Exercises & Quizzes** — LLM agents 3 & 4 generate this data; save it for spaced repetition
8. **Unified XP System** — Resolve conflicting level/XP formulas between services
