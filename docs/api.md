# API Contract

## Base URLs

- Development API: `http://localhost:8000/api`
- Production API: `/api`
- Health check: `/health`

## Authentication

This milestone is single-user and local-first. There is no auth layer yet.

## Error Envelope

All handled API failures return the same envelope:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": []
}
```

Common codes:

- `BAD_REQUEST`
- `RESOURCE_NOT_FOUND`
- `CONFLICT`
- `VALIDATION_ERROR`
- `INTERNAL_ERROR`

## Roadmaps

### `GET /api/roadmaps/`

Returns all public roadmap paths plus the current user's custom roadmap paths.

```json
[
  {
    "id": 1,
    "title": "Frontend Development",
    "description": "Master HTML, CSS, JavaScript, and modern frameworks.",
    "icon": "Monitor",
    "colors": "from-orange-500 to-amber-500",
    "sort_order": 1,
    "is_locked": false,
    "user_id": null,
    "is_custom": false,
    "nodes": [],
    "connections": []
  }
]
```

### `GET /api/roadmaps/{path_id}`

Returns one roadmap path with nodes and connections if it is public or owned by the current user.

Roadmap node shape:

```json
{
  "id": 1,
  "path_id": 1,
  "topic_id": 1,
  "position_x": 0,
  "position_y": 0,
  "tier": 1,
  "status": "available",
  "topic": {
    "id": 1,
    "title": "CSS Basics",
    "description": "Fundamentals of CSS",
    "ai_generated": false,
    "keywords": "css, styling"
  }
}
```

## Topics

### `GET /api/topics/`

Lists topics. Supports optional `?query=...`.

### `GET /api/topics/{topic_id}`

Returns a topic with subtopics and graph connections.

```json
{
  "id": 1,
  "title": "CSS Basics",
  "description": "Fundamentals of CSS styling",
  "ai_generated": false,
  "keywords": "css, selectors",
  "subtopics": [],
  "outgoing_connections": [],
  "incoming_connections": []
}
```

### `POST /api/topics/generate-roadmap`

Generates and persists a custom roadmap from a free-form topic for the current local user.

Request:

```json
{
  "topic": "Machine Learning"
}
```

Response: `RoadmapPathResponse`

If an OpenAI key is configured, the roadmap is LLM-shaped. Otherwise the backend returns a deterministic fallback roadmap and still persists it.

## Courses

Course status values:

- `generating`
- `ready`
- `error`

Lesson task fields:

- `task_type`
- `task_content`

### `GET /api/courses/`

Returns the current user's enrolled/generated courses.

```json
[
  {
    "id": 1,
    "title": "Testing 101",
    "description": "Course description",
    "topic_id": 4,
    "status": "ready",
    "total_lessons": 1,
    "total_xp": 25,
    "created_at": "2026-03-26T20:00:00",
    "lessons": [],
    "user_progress": {
      "completed_lessons": 1,
      "completion_percentage": 100,
      "started_at": "2026-03-26T19:30:00",
      "last_accessed_at": "2026-03-26T20:00:00",
      "completed_at": "2026-03-26T20:00:00"
    }
  }
]
```

### `GET /api/courses/{course_id}`

Returns one of the current user's courses, its lessons, and the current-user progress summary.

### `GET /api/courses/{course_id}/lessons/{lesson_id}`

Returns one lesson.

Lesson shape:

```json
{
  "id": 1,
  "course_id": 1,
  "title": "Lesson One",
  "content_markdown": "# Hello",
  "task_type": "quiz",
  "task_content": "What is testing?",
  "sort_order": 0,
  "xp_reward": 25
}
```

### `POST /api/courses/generate`

Starts course generation and returns an SSE stream.

The generated course is automatically enrolled for the current local user.

Request:

```json
{
  "topic_ids": [1, 2],
  "model": "optional-model-name"
}
```

SSE event examples:

```text
event: status
data: {"stage":"outline","message":"Generating outline"}

event: chunk
data: {"stage":"lesson","lesson_index":0,"content_delta":"# Intro"}

event: complete
data: {"course_id":1,"total_lessons":5}
```

### `POST /api/courses/{course_id}/lessons/{lesson_id}/evaluate`

Evaluates the submitted answer for the lesson task.

Request:

```json
{
  "answer": "My response"
}
```

Response:

```json
{
  "is_correct": true,
  "feedback": "Strong answer.",
  "suggestions": "Expand on testing strategy.",
  "xp_earned": 25
}
```

### `DELETE /api/courses/{course_id}`

Deletes one of the current user's courses and its lessons.

## Progress

### `POST /api/progress/complete-lesson`

Marks a lesson complete for the current user and awards XP.

Request:

```json
{
  "lesson_id": 1,
  "course_id": 1,
  "time_spent_seconds": 300
}
```

Response:

```json
{
  "xp_earned": 25,
  "total_xp": 25,
  "level_before": 1,
  "level_after": 1,
  "xp_to_next_level": 257,
  "new_achievements": [],
  "node_completed": true
}
```

### `GET /api/progress/summary`

Canonical dashboard summary endpoint for the current user.

```json
{
  "total_lessons_completed": 1,
  "total_courses_completed": 1,
  "total_xp": 25,
  "current_level": 1,
  "current_level_xp": 25,
  "xp_to_next_level": 257,
  "level_progress_percentage": 9,
  "streak_days": 1
}
```

### `GET /api/progress/roadmap/{path_id}`

Returns the current user's roadmap completion stats.

### `GET /api/progress/course/{course_id}`

Returns lesson-by-lesson completion stats for one of the current user's courses.

## Profile

### `GET /api/profile/`

Returns the current local profile, current path context, skills, and recent activity.

```json
{
  "id": 1,
  "display_name": "Adventurer",
  "avatar_seed": "Felix",
  "level": 1,
  "title": "Novice Coder",
  "total_xp": 25,
  "xp_to_next_level": 257,
  "quests_completed": 1,
  "current_path": {
    "id": 2,
    "title": "Backend"
  },
  "skills": [],
  "recent_activity": []
}
```

### `PUT /api/profile/`

Updates display name, avatar seed, and current path.

Request:

```json
{
  "display_name": "Updated Hero",
  "avatar_seed": "Felix",
  "current_path_id": 2
}
```

### `GET /api/profile/achievements`

Returns all achievements with current-user unlock state.

### `GET /api/profile/skills`

Returns aggregated path-based skill levels for the current user.

### `GET /api/profile/activity?limit=20`

Returns recent activity entries for the current user.

## Grimoires

### `POST /api/grimoires/upload`

Uploads a source document and starts background processing.

### `GET /api/grimoires/{document_id}`

Returns the current processing state for a source document.

### `GET /api/grimoires/{document_id}/sections`

Returns the normalized section tree for a processed source document.

### `POST /api/grimoires/{document_id}/courses`

Forges a course from a processed grimoire and automatically enrolls the current user.

### `POST /api/grimoires/{document_id}/roadmap-preview`

Returns suggested placements against visible roadmap paths only.

### `POST /api/grimoires/{document_id}/roadmap-apply`

Applies selected grimoire sections into visible roadmap paths only.

## Practice

Practice now has two layers:

- `execute` and `evaluate` are generic runner/helper endpoints.
- catalog, floor, room, spawn, and encounter submission endpoints own authoritative practice progression.

### `GET /api/practice/catalog`

Returns practice floors derived from roadmap nodes, plus filter metadata.

### `GET /api/practice/floors/{floor_id}`

Returns one floor with related courses and any persisted challenge templates.

### `POST /api/practice/challenges/generate`

Generates and persists a server-owned practice challenge for a floor.

If OpenAI is not configured, this endpoint returns:

```json
{
  "code": "AI_NOT_CONFIGURED",
  "message": "AI is not configured. Set OPENAI_API_KEY to use this feature."
}
```

### `POST /api/practice/rooms`

Creates a practice room with 3 standard encounters and 1 boss encounter.

### `GET /api/practice/rooms/{room_id}`

Returns the full room state, including attempts, encounter list, boss availability, and remediation actions.

### `POST /api/practice/rooms/{room_id}/spawn`

Spawns 1 or 3 more practice encounters for token recovery and continued drilling.

### `POST /api/practice/encounters/{encounter_id}/submit`

Runs authoritative grading for a room encounter using server-owned hidden tests and updates room progression.

### `POST /api/practice/execute`

Executes JavaScript or Python with optional test cases for non-authoritative run feedback.

Request:

```json
{
  "code": "def add(a, b):\n    return a + b",
  "language": "python",
  "test_cases": [
    {
      "input": "2, 3",
      "expected_output": "5"
    }
  ]
}
```

Response:

```json
{
  "stdout": "",
  "stderr": "",
  "exit_code": 0,
  "execution_time_ms": 12,
  "test_results": [
    {
      "passed": true,
      "input": "2, 3",
      "expected": "5",
      "actual": "5",
      "is_hidden": false
    }
  ]
}
```

### `POST /api/practice/evaluate`

Evaluates a submitted practice solution for AI helper feedback only. It is not the authoritative grading endpoint for room progression.

### `GET /api/practice/sessions`

Returns saved practice sessions. Supports optional `course_id` and `lesson_id`.

### `POST /api/practice/sessions`

Creates a practice session.

### `GET /api/practice/sessions/{session_id}`

Returns one practice session.

### `PUT /api/practice/sessions/{session_id}`

Updates an existing session.

### `DELETE /api/practice/sessions/{session_id}`

Deletes a session.
