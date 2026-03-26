# API Documentation

## Base URL

| Environment | URL                         |
| ----------- | --------------------------- |
| Development | `http://localhost:8000/api` |
| Production  | `/api` (relative to domain) |

## Authentication

Currently, the API uses a single implicit user (local-only). Authentication will be added in future versions.

---

## Endpoints

### Health Check

#### `GET /health`

Check if the API is running.

| Field    | Type   | Description                  |
| -------- | ------ | ---------------------------- |
| `status` | string | `"healthy"` when operational |

**Response:**

```json
{
  "status": "healthy"
}
```

---

### Roadmaps

#### `GET /api/roadmaps/`

List all roadmap paths with their nodes and connections.

**Response:** `RoadmapPathResponse[]`

| Field         | Type                          | Description                                    |
| ------------- | ----------------------------- | ---------------------------------------------- |
| `id`          | integer                       | Roadmap path ID                                |
| `title`       | string                        | Roadmap title                                  |
| `description` | string                        | Roadmap description                            |
| `icon`        | string                        | Icon name (e.g., `"Monitor"`)                  |
| `colors`      | string                        | Tailwind gradient classes                      |
| `sort_order`  | integer                       | Display order                                  |
| `is_locked`   | boolean                       | Whether the path is locked                     |
| `user_id`     | integer \| null               | Creator user ID (null for built-in)            |
| `is_custom`   | boolean                       | Whether this is an AI-generated custom roadmap |
| `nodes`       | `RoadmapNodeResponse[]`       | Nodes in the roadmap                           |
| `connections` | `RoadmapConnectionResponse[]` | Connections between nodes                      |

```json
[{
  "id": 1,
  "title": "Frontend Development",
  "description": "Master HTML, CSS, JavaScript, and modern frameworks...",
  "icon": "Monitor",
  "colors": "from-orange-500 to-amber-500",
  "sort_order": 1,
  "is_locked": false,
  "user_id": null,
  "is_custom": false,
  "nodes": [...],
  "connections": [...]
}]
```

#### `GET /api/roadmaps/{path_id}`

Get a single roadmap path with all nodes and connections.

**Parameters:**

| Name      | Type    | Description     |
| --------- | ------- | --------------- |
| `path_id` | integer | Roadmap path ID |

**Response:** `RoadmapPathResponse` (same schema as list item, single object)

---

### Roadmap Nodes

Each node in `RoadmapPathResponse.nodes` follows this schema:

| Field        | Type            | Description                              |
| ------------ | --------------- | ---------------------------------------- |
| `id`         | integer         | Node ID                                  |
| `path_id`    | integer         | Parent roadmap ID                        |
| `topic_id`   | integer         | Associated topic ID                      |
| `position_x` | integer         | X coordinate for rendering               |
| `position_y` | integer         | Y coordinate for rendering               |
| `tier`       | integer         | Node tier/level in the path              |
| `status`     | string          | `"locked"`, `"available"`, `"completed"` |
| `topic`      | `TopicResponse` | Embedded topic details                   |

```json
{
  "id": 1,
  "path_id": 1,
  "topic_id": 1,
  "position_x": 100,
  "position_y": 100,
  "tier": 1,
  "status": "locked",
  "topic": {
    "id": 1,
    "title": "Internet Basics",
    "description": "How the web works...",
    "ai_generated": false,
    "keywords": "internet, http, https"
  }
}
```

---

### Roadmap Connections

Each connection in `RoadmapPathResponse.connections` follows this schema:

| Field             | Type    | Description                         |
| ----------------- | ------- | ----------------------------------- |
| `id`              | integer | Connection ID                       |
| `path_id`         | integer | Parent roadmap ID                   |
| `from_node_id`    | integer | Source node ID                      |
| `to_node_id`      | integer | Target node ID                      |
| `connection_type` | string  | Connection type (e.g., `"default"`) |

```json
{
  "id": 1,
  "path_id": 1,
  "from_node_id": 1,
  "to_node_id": 2,
  "connection_type": "default"
}
```

---

### Topics

#### `GET /api/topics/`

List all topics. Optional search with `?query=` parameter.

**Query Parameters:**

| Name    | Type   | Description                           |
| ------- | ------ | ------------------------------------- |
| `query` | string | Optional search term to filter topics |

**Response:** `TopicResponse[]`

| Field          | Type           | Description                    |
| -------------- | -------------- | ------------------------------ |
| `id`           | integer        | Topic ID                       |
| `title`        | string         | Topic title                    |
| `description`  | string         | Topic description              |
| `ai_generated` | boolean        | Whether topic was AI-generated |
| `keywords`     | string \| null | Comma-separated keywords       |

```json
[
  {
    "id": 1,
    "title": "CSS Basics",
    "description": "Fundamentals of CSS styling...",
    "ai_generated": false,
    "keywords": "css, styling, selectors"
  }
]
```

#### `GET /api/topics/{topic_id}`

Get detailed information about a topic, including subtopics and connections.

**Parameters:**

| Name       | Type    | Description |
| ---------- | ------- | ----------- |
| `topic_id` | integer | Topic ID    |

**Response:** `TopicDetailResponse`

| Field                  | Type                | Description                    |
| ---------------------- | ------------------- | ------------------------------ |
| `id`                   | integer             | Topic ID                       |
| `title`                | string              | Topic title                    |
| `description`          | string              | Topic description              |
| `ai_generated`         | boolean             | Whether topic was AI-generated |
| `keywords`             | string \| null      | Comma-separated keywords       |
| `subtopics`            | `TopicResponse[]`   | Related subtopics              |
| `outgoing_connections` | `TopicConnection[]` | Connections from this topic    |
| `incoming_connections` | `TopicConnection[]` | Connections to this topic      |

```json
{
  "id": 1,
  "title": "CSS Basics",
  "description": "Fundamentals of CSS styling...",
  "ai_generated": false,
  "keywords": "css, selectors",
  "subtopics": [
    {
      "id": 5,
      "title": "CSS Selectors",
      "description": "...",
      "ai_generated": false,
      "keywords": null
    }
  ],
  "outgoing_connections": [
    {
      "id": 1,
      "from_topic_id": 1,
      "to_topic_id": 5,
      "relationship_type": "subtopic",
      "ai_confidence": null
    }
  ],
  "incoming_connections": []
}
```

#### `POST /api/topics/generate-roadmap`

Generate a custom roadmap path for a topic with AI-generated subtopics.

**Request:**

| Field   | Type   | Description                        |
| ------- | ------ | ---------------------------------- |
| `topic` | string | Topic name to generate roadmap for |

```json
{
  "topic": "Machine Learning"
}
```

**Response:** `RoadmapPathResponse` (same schema as roadmaps endpoint)

---

### Courses

#### `GET /api/courses/`

List all courses.

**Response:** `CourseResponse[]`

| Field           | Type               | Description                          |
| --------------- | ------------------ | ------------------------------------ |
| `id`            | integer            | Course ID                            |
| `title`         | string             | Course title                         |
| `description`   | string             | Course description                   |
| `topic_id`      | integer            | Associated topic ID                  |
| `status`        | string             | `"generating"`, `"ready"`, `"error"` |
| `total_lessons` | integer            | Number of lessons in course          |
| `total_xp`      | integer            | Total XP available in course         |
| `created_at`    | string (ISO 8601)  | Creation timestamp                   |
| `lessons`       | `LessonResponse[]` | Lessons (empty array in list view)   |

```json
[
  {
    "id": 1,
    "title": "CSS Basics | CSS Layouts",
    "description": "...",
    "topic_id": 1,
    "status": "ready",
    "total_lessons": 5,
    "total_xp": 500,
    "created_at": "2026-03-26T10:00:00Z",
    "lessons": []
  }
]
```

#### `GET /api/courses/{course_id}`

Get a single course with full lesson details.

**Parameters:**

| Name        | Type    | Description |
| ----------- | ------- | ----------- |
| `course_id` | integer | Course ID   |

**Response:** `CourseResponse` with populated `lessons` array.

#### `GET /api/courses/{course_id}/lessons/{lesson_id}`

Get a single lesson from a course.

**Parameters:**

| Name        | Type    | Description |
| ----------- | ------- | ----------- |
| `course_id` | integer | Course ID   |
| `lesson_id` | integer | Lesson ID   |

**Response:** `LessonResponse`

| Field              | Type    | Description                       |
| ------------------ | ------- | --------------------------------- |
| `id`               | integer | Lesson ID                         |
| `course_id`        | integer | Parent course ID                  |
| `title`            | string  | Lesson title                      |
| `content_markdown` | string  | Lesson content in Markdown        |
| `task_type`        | string  | `"coding"`, `"quiz"`, `"reading"` |
| `task_content`     | string  | Task instructions                 |
| `sort_order`       | integer | Lesson order within course        |
| `xp_reward`        | integer | XP earned on completion           |

```json
{
  "id": 1,
  "course_id": 1,
  "title": "CSS Selectors",
  "content_markdown": "# CSS Selectors\n\n...",
  "task_type": "coding",
  "task_content": "Write a CSS selector...",
  "sort_order": 0,
  "xp_reward": 100
}
```

#### `POST /api/courses/generate`

Generate a new course from topic IDs. Returns Server-Sent Events (SSE) stream.

**Request:**

| Field       | Type      | Description                                       |
| ----------- | --------- | ------------------------------------------------- |
| `topic_ids` | integer[] | One or more topic IDs to include                  |
| `model`     | string    | LLM model (e.g., `"anthropic/claude-sonnet-4.6"`) |

```json
{
  "topic_ids": [1, 2, 3],
  "model": "anthropic/claude-sonnet-4.6"
}
```

**SSE Events:**

| Event      | Data                                                             | Description         |
| ---------- | ---------------------------------------------------------------- | ------------------- |
| `status`   | `{"stage": "outline", "message": "...", "lessons": [...]}`       | Generation progress |
| `chunk`    | `{"stage": "lesson", "lesson_index": 0, "content_delta": "..."}` | Content streaming   |
| `complete` | `{"course_id": 1, "total_lessons": 5}`                           | Generation finished |

**Example SSE Stream:**

```
event: status
data: {"stage": "outline", "message": "Generating course outline...", "lessons": ["Lesson 1", "Lesson 2"]}

event: chunk
data: {"stage": "lesson", "lesson_index": 0, "content_delta": "# CSS Selectors\n\n..."}

event: complete
data: {"course_id": 1, "total_lessons": 5}
```

#### `DELETE /api/courses/{course_id}`

Delete a course.

**Parameters:**

| Name        | Type    | Description |
| ----------- | ------- | ----------- |
| `course_id` | integer | Course ID   |

**Response:** `204 No Content`

---

### Lesson Evaluation

#### `POST /api/courses/{course_id}/lessons/{lesson_id}/evaluate`

Evaluate a user's answer to a lesson task using AI.

**Parameters:**

| Name        | Type    | Description |
| ----------- | ------- | ----------- |
| `course_id` | integer | Course ID   |
| `lesson_id` | integer | Lesson ID   |

**Request:**

| Field    | Type   | Description             |
| -------- | ------ | ----------------------- |
| `answer` | string | User's submitted answer |

```json
{
  "answer": "p.highlight { color: yellow; }"
}
```

**Response:**

| Field         | Type    | Description                     |
| ------------- | ------- | ------------------------------- |
| `is_correct`  | boolean | Whether the answer is correct   |
| `feedback`    | string  | AI-generated feedback           |
| `suggestions` | string  | Additional learning suggestions |
| `xp_earned`   | integer | XP awarded for this answer      |

```json
{
  "is_correct": true,
  "feedback": "Correct! You've successfully...",
  "suggestions": "Consider also learning about...",
  "xp_earned": 100
}
```

---

### Progress

#### `POST /api/progress/complete-lesson`

Mark a lesson as completed and award XP.

**Request:**

| Field                | Type    | Description          |
| -------------------- | ------- | -------------------- |
| `lesson_id`          | integer | Lesson ID            |
| `course_id`          | integer | Course ID            |
| `time_spent_seconds` | integer | Time spent on lesson |

```json
{
  "lesson_id": 1,
  "course_id": 1,
  "time_spent_seconds": 342
}
```

**Response:**

| Field              | Type    | Description                          |
| ------------------ | ------- | ------------------------------------ |
| `xp_earned`        | integer | XP earned for this lesson            |
| `total_xp`         | integer | User's total XP                      |
| `level_before`     | integer | Level before completion              |
| `level_after`      | integer | Level after completion               |
| `xp_to_next_level` | integer | XP needed for next level             |
| `new_achievements` | array   | Newly unlocked achievements          |
| `node_completed`   | boolean | Whether a roadmap node was completed |

```json
{
  "xp_earned": 150,
  "total_xp": 14400,
  "level_before": 12,
  "level_after": 12,
  "xp_to_next_level": 1100,
  "new_achievements": [],
  "node_completed": false
}
```

#### `GET /api/progress/summary`

Get overall progress summary.

**Response:**

| Field                     | Type    | Description             |
| ------------------------- | ------- | ----------------------- |
| `total_lessons_completed` | integer | Total lessons completed |
| `total_courses_completed` | integer | Total courses completed |
| `total_xp`                | integer | Total XP earned         |
| `current_level`           | integer | Current level           |
| `streak_days`             | integer | Current streak in days  |

```json
{
  "total_lessons_completed": 42,
  "total_courses_completed": 5,
  "total_xp": 14400,
  "current_level": 12,
  "streak_days": 7
}
```

#### `GET /api/progress/roadmap/{path_id}`

Get progress for a specific roadmap.

**Parameters:**

| Name      | Type    | Description     |
| --------- | ------- | --------------- |
| `path_id` | integer | Roadmap path ID |

**Response:**

| Field                   | Type    | Description               |
| ----------------------- | ------- | ------------------------- |
| `path_id`               | integer | Roadmap path ID           |
| `completed_nodes`       | integer | Number of completed nodes |
| `total_nodes`           | integer | Total nodes in roadmap    |
| `completion_percentage` | float   | Percentage complete       |

```json
{
  "path_id": 1,
  "completed_nodes": 8,
  "total_nodes": 24,
  "completion_percentage": 33.3
}
```

#### `GET /api/progress/course/{course_id}`

Get progress for a specific course.

**Parameters:**

| Name        | Type    | Description |
| ----------- | ------- | ----------- |
| `course_id` | integer | Course ID   |

**Response:** Array of lesson completion status.

---

### Practice

#### `POST /api/practice/execute`

Execute code in a sandboxed environment.

**Request:**

| Field        | Type   | Description                     |
| ------------ | ------ | ------------------------------- |
| `code`       | string | Code to execute                 |
| `language`   | string | `"javascript"` or `"python"`    |
| `test_cases` | array  | Optional test cases to validate |

```json
{
  "code": "function add(a, b) { return a + b; }\nconsole.log(add(2, 3));",
  "language": "javascript",
  "test_cases": [{ "input": "2, 3", "expected_output": "5" }]
}
```

**Response:**

| Field          | Type    | Description                 |
| -------------- | ------- | --------------------------- |
| `success`      | boolean | Whether execution succeeded |
| `stdout`       | string  | Standard output             |
| `stderr`       | string  | Standard error              |
| `exit_code`    | integer | Process exit code           |
| `test_results` | array   | Test case results           |

```json
{
  "success": true,
  "stdout": "5\n",
  "stderr": "",
  "exit_code": 0,
  "test_results": [...]
}
```

#### `POST /api/practice/evaluate`

Evaluate code solution quality using AI.

**Request:**

| Field                   | Type   | Description                  |
| ----------------------- | ------ | ---------------------------- |
| `code`                  | string | Solution code                |
| `language`              | string | Programming language         |
| `challenge_description` | string | Original problem description |
| `test_results`          | array  | Results from test execution  |

```json
{
  "code": "function fibonacci(n) { ... }",
  "language": "javascript",
  "challenge_description": "Implement fibonacci sequence",
  "test_results": [...]
}
```

**Response:**

| Field                 | Type     | Description                    |
| --------------------- | -------- | ------------------------------ |
| `score`               | integer  | Score from 0-100               |
| `feedback`            | string   | AI-generated feedback          |
| `hints`               | string[] | Improvement suggestions        |
| `complexity_analysis` | string   | Time/space complexity analysis |

```json
{
  "score": 85,
  "feedback": "Good solution!...",
  "hints": ["Try caching..."],
  "complexity_analysis": "Time: O(n)"
}
```

#### `GET /api/practice/sessions`

List practice sessions (filterable by query params).

#### `POST /api/practice/sessions`

Create a new practice session.

#### `GET /api/practice/sessions/{session_id}`

Get a specific practice session.

#### `PUT /api/practice/sessions/{session_id}`

Update a practice session.

#### `DELETE /api/practice/sessions/{session_id}`

Delete a practice session.

---

### Profile

#### `GET /api/profile/`

Get the current user's profile.

**Response:**

| Field              | Type            | Description                     |
| ------------------ | --------------- | ------------------------------- |
| `id`               | integer         | User ID                         |
| `display_name`     | string          | User's display name             |
| `avatar_seed`      | string          | Seed for avatar generation      |
| `level`            | integer         | Current level                   |
| `title`            | string          | User's title/rank               |
| `total_xp`         | integer         | Total XP earned                 |
| `xp_to_next_level` | integer         | XP needed for next level        |
| `quests_completed` | integer         | Number of quests completed      |
| `current_path`     | integer \| null | Currently selected roadmap path |
| `skills`           | array           | Skill levels per roadmap        |
| `achievements`     | array           | User's achievements             |
| `recent_activity`  | array           | Recent activity feed            |

```json
{
  "id": 1,
  "display_name": "Sir Codealot",
  "avatar_seed": "Felix",
  "level": 12,
  "title": "Frontend Mage",
  "total_xp": 14250,
  "xp_to_next_level": 1250,
  "quests_completed": 42,
  "current_path": null,
  "skills": [...],
  "achievements": [...],
  "recent_activity": [...]
}
```

#### `PUT /api/profile/`

Update the user's profile.

**Request:**

| Field             | Type    | Description              |
| ----------------- | ------- | ------------------------ |
| `display_name`    | string  | New display name         |
| `avatar_seed`     | string  | New avatar seed          |
| `current_path_id` | integer | Selected roadmap path ID |

```json
{
  "display_name": "Lady Coder",
  "avatar_seed": "Luna",
  "current_path_id": 1
}
```

**Response:** Updated profile object

#### `GET /api/profile/achievements`

List all achievements with unlock status.

**Response:** `AchievementResponse[]`

| Field           | Type                      | Description                |
| --------------- | ------------------------- | -------------------------- |
| `id`            | integer                   | Achievement ID             |
| `title`         | string                    | Achievement title          |
| `description`   | string                    | Achievement description    |
| `icon`          | string                    | Icon name                  |
| `category`      | string                    | Achievement category       |
| `trigger_type`  | string                    | How it's triggered         |
| `trigger_value` | integer                   | Threshold value            |
| `xp_bonus`      | integer                   | XP awarded on unlock       |
| `earned`        | boolean                   | Whether user has earned it |
| `unlocked_at`   | string (ISO 8601) \| null | Unlock timestamp           |

```json
[
  {
    "id": 1,
    "title": "First Blood",
    "description": "Complete your first lesson",
    "icon": "Trophy",
    "category": "combat",
    "trigger_type": "lesson_count",
    "trigger_value": 1,
    "xp_bonus": 50,
    "earned": true,
    "unlocked_at": "2026-03-26T10:00:00Z"
  }
]
```

#### `GET /api/profile/skills`

Get skill levels for each roadmap.

#### `GET /api/profile/activity`

Get recent activity feed.

---

## Error Handling

### HTTP Status Codes

| Code | Meaning          | Description                   |
| ---- | ---------------- | ----------------------------- |
| 200  | OK               | Successful request            |
| 201  | Created          | Resource created successfully |
| 204  | No Content       | Successful deletion           |
| 400  | Bad Request      | Invalid request data          |
| 404  | Not Found        | Resource not found            |
| 422  | Validation Error | Input validation failed       |
| 500  | Server Error     | Internal server error         |

### Error Response Format

```json
{
  "error": "ERROR_CODE",
  "detail": "Human-readable error message"
}
```

### Common Error Codes

| Code                 | Description                      |
| -------------------- | -------------------------------- |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `VALIDATION_ERROR`   | Input validation failed          |
| `LLM_ERROR`          | LLM API error                    |
| `EXECUTION_TIMEOUT`  | Code execution timed out         |
| `EXECUTION_ERROR`    | Code execution failed            |

### Example Error Responses

**404 Not Found:**

```json
{
  "error": "RESOURCE_NOT_FOUND",
  "detail": "Roadmap path 123 not found"
}
```

**422 Validation Error:**

```json
{
  "error": "VALIDATION_ERROR",
  "detail": [
    {
      "loc": ["body", "topic_ids"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. This will be added in future versions.

---

## Content Types

| Content Type          | Usage                                       |
| --------------------- | ------------------------------------------- |
| `application/json`    | Standard API requests/responses             |
| `text/event-stream`   | SSE streaming endpoints (course generation) |
| `multipart/form-data` | File uploads                                |
