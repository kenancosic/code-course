# MythicCode Architecture

## Status

MythicCode is intentionally a single-user modular monolith:

- React frontend in `src/`
- FastAPI backend in `server/`
- SQLite for persistence
- One deployable unit in local development and production

This is the current architecture to optimize for delivery speed, contract clarity, and low operational overhead. The main design constraint is not scale; it is keeping frontend types, backend responses, and docs aligned.

See [ADR 0001](docs/adr/0001-single-user-modular-monolith.md).

## System Shape

```text
Browser
  -> React route page
  -> feature hook in src/hooks
  -> FastAPI router under /api
  -> service in server/services
  -> SQLAlchemy models in server/models
  -> SQLite
```

## Architectural Rules

### Frontend

- The canonical frontend data layer lives in `src/hooks`.
- Route pages consume hook results directly.
- `src/types` contains the frontend contract types used by the active UI.
- Avoid parallel API/type systems. The old `src/api/*` layer has been removed.

### Backend

- Routers handle HTTP concerns only.
- Services own business logic and orchestration.
- Models own persistence.
- Schemas define transport shapes where dedicated schema modules exist.
- Shared progression rules live in `server/services/progression_service.py`.

### Contracts

- `docs/api.md` is the source of truth for the public API shape.
- API errors are normalized as:

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "Course 9999 not found",
  "details": null
}
```

- Course status is constrained to `generating | ready | error`.
- Lesson tasks remain `task_type` plus `task_content` for this milestone.
- Dashboard stats come from `GET /api/progress/summary`.
- Profile path context comes from `GET /api/profile/` as `current_path`.

## Frontend Module Map

```text
src/
├── app/
│   ├── components/
│   ├── pages/
│   └── routes.tsx
├── hooks/
│   ├── use-courses.ts
│   ├── use-profile.ts
│   ├── use-roadmaps.ts
│   └── use-topics.ts
├── stores/
└── types/
```

Active page ownership:

- `Home.tsx`: dashboard, profile summary, roadmap progress, custom roadmap trigger
- `RoadmapDetail.tsx`: node selection, subtopic inspection, course generation flow
- `CourseView.tsx`: lesson reading, task evaluation, lesson completion
- `Practice.tsx`: local practice UI backed by practice endpoints
- `Profile.tsx`: profile stats, achievements, current path, activity

## Backend Module Map

```text
server/
├── main.py
├── errors.py
├── routers/
├── services/
├── models/
├── schemas/
├── llm/
├── alembic/
└── tests/
```

Key service ownership:

- `course_service.py`: course generation and persistence
- `topic_service.py`: custom roadmap generation
- `progress_service.py`: lesson completion and progress summaries
- `progression_service.py`: XP thresholds, levels, titles, profile bootstrap
- `profile_service.py`: profile aggregation and updates
- `practice_service.py`: code execution, evaluation, and session persistence

## Data Model Highlights

- `RoadmapPath`, `RoadmapNode`, `RoadmapConnection` model roadmap structure.
- `Topic` and `TopicConnection` model reusable topic relationships.
- `Course` and `Lesson` model generated learning content.
- `UserProfile`, `UserProgress`, `Achievement`, and `UserAchievement` model gamified progress.
- `PracticeSession` is a real persisted model in `server/models/practice.py` and participates in metadata and migrations.

## Runtime Flows

### Roadmap browsing

1. React page requests roadmaps through `useRoadmaps()`.
2. `GET /api/roadmaps/` returns unlocked paths with nodes and connections.
3. Topic detail is fetched from `GET /api/topics/{topic_id}` when needed.

### Course generation

1. The UI posts topic IDs to `POST /api/courses/generate`.
2. The backend validates topics and streams progress as SSE.
3. The course is persisted with `generating`, then transitions to `ready` or `error`.

### Lesson completion

1. The user evaluates or completes a lesson in `CourseView.tsx`.
2. `POST /api/progress/complete-lesson` records progress and awards XP.
3. `progression_service` recalculates level and title.

### Practice

1. The user runs code through `POST /api/practice/execute`.
2. Optional evaluation goes through `POST /api/practice/evaluate`.
3. Sessions persist through `/api/practice/sessions`.

## Why We Did Not Restructure Further

We are not splitting the app into services, workers, or separate repos because the current pressure is contract drift, not operational scale. The smallest useful architecture move was to:

- remove duplicate frontend client layers,
- centralize progression rules,
- register practice persistence as a real model,
- normalize error responses,
- and rewrite the docs around the running system.

## Near-Term Roadmap

- Add frontend tests for the main route flows
- Keep strengthening contract tests around API payloads
- Consider moving more router-local response models into `server/schemas/*`
- Revisit architecture only if we hit a real boundary:
  - multi-user auth and tenancy
  - long-running background jobs
  - deployment or reliability constraints that the monolith cannot handle cleanly
