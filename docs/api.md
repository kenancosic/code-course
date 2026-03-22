# API Documentation

## Base URL

- **Development**: `http://localhost:8000/api`
- **Production**: `/api` (relative to domain)

## Authentication

Currently, the API uses a single implicit user (local-only). Authentication will be added in future versions.

## Endpoints

### Health Check

#### GET `/health`

Check if the API is running.

**Response:**
```json
{
  "status": "healthy"
}
```

---

### Roadmaps

#### GET `/api/roadmaps`

List all published roadmap paths.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Path of the Visionary - Frontend",
    "description": "Master the ancient arts of HTML, CSS, React...",
    "category": "frontend",
    "is_published": true,
    "nodes": [...],
    "connections": [...]
  }
]
```

#### GET `/api/roadmaps/{path_id}`

Get a single roadmap path with all nodes and connections.

**Parameters:**
- `path_id` (integer) - Roadmap path ID

**Response:**
```json
{
  "id": 1,
  "title": "Path of the Visionary - Frontend",
  "description": "Master the ancient arts of HTML, CSS, React...",
  "category": "frontend",
  "is_published": true,
  "nodes": [
    {
      "id": 1,
      "path_id": 1,
      "title": "HTML Glyphs",
      "description": "The foundational language of the visual realm.",
      "position_x": 50,
      "position_y": 20,
      "node_type": "default",
      "course_id": null
    }
  ],
  "connections": [
    {
      "id": 1,
      "path_id": 1,
      "source_node_id": 1,
      "target_node_id": 2,
      "connection_type": "default"
    }
  ]
}
```

---

### Courses

#### GET `/api/courses`

List all generated courses.

**Response:**
```json
[
  {
    "id": 1,
    "title": "The Arcane Art of CSS",
    "description": "Master CSS styling techniques",
    "category": "frontend",
    "difficulty": "beginner",
    "is_published": true,
    "lessons": [...]
  }
]
```

#### GET `/api/courses/{course_id}`

Get a course with lesson list.

**Parameters:**
- `course_id` (integer) - Course ID

**Response:**
```json
{
  "id": 1,
  "title": "The Arcane Art of CSS",
  "description": "Master CSS styling techniques",
  "category": "frontend",
  "difficulty": "beginner",
  "is_published": true,
  "lessons": [
    {
      "id": 1,
      "course_id": 1,
      "title": "CSS Selectors",
      "content": "...",
      "order_index": 0,
      "duration_minutes": 15
    }
  ]
}
```

#### POST `/api/courses/generate`

Trigger course generation from a topic. Returns SSE stream.

**Request:**
```json
{
  "topic": "CSS Enchantments",
  "roadmap_path_id": "frontend",
  "roadmap_node_id": "css-basics",
  "model": "anthropic/claude-sonnet-4-20250514"
}
```

**SSE Events:**
```
event: status
data: {"stage": "outline", "message": "Generating course outline..."}

event: chunk
data: {"stage": "lesson", "lesson_index": 0, "content_delta": "# The Arcane..."}

event: complete
data: {"course_id": 1, "total_lessons": 5}
```

#### DELETE `/api/courses/{course_id}`

Delete a generated course.

**Parameters:**
- `course_id` (integer) - Course ID

**Response:** `204 No Content`

---

### Lessons

#### GET `/api/courses/{course_id}/lessons/{lesson_id}`

Get full lesson content.

**Parameters:**
- `course_id` (integer) - Course ID
- `lesson_id` (integer) - Lesson ID

**Response:**
```json
{
  "id": 1,
  "course_id": 1,
  "title": "CSS Selectors",
  "content": "# CSS Selectors\n\nIn the realm of styling...",
  "order_index": 0,
  "duration_minutes": 15
}
```

---

### Progress

#### POST `/api/progress/complete-lesson`

Mark lesson complete, award XP.

**Request:**
```json
{
  "lesson_id": 1,
  "course_id": 1,
  "time_spent_seconds": 342
}
```

**Response:**
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

#### GET `/api/progress/summary`

Get overall progress summary.

**Response:**
```json
{
  "total_lessons_completed": 42,
  "total_courses_completed": 5,
  "total_xp": 14400,
  "current_level": 12,
  "streak_days": 7
}
```

#### GET `/api/progress/roadmap/{path_id}`

Get progress for a specific roadmap.

**Response:**
```json
{
  "path_id": 1,
  "completed_nodes": 8,
  "total_nodes": 24,
  "completion_percentage": 33.3
}
```

---

### Practice

#### POST `/api/practice/execute`

Execute code in sandbox.

**Request:**
```json
{
  "code": "function add(a, b) { return a + b; }\nconsole.log(add(2, 3));",
  "language": "javascript",
  "test_cases": [
    { "input": "2, 3", "expected_output": "5" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "stdout": "5\n",
  "stderr": "",
  "exit_code": 0,
  "test_results": [
    { "passed": true, "input": "2, 3", "expected": "5", "actual": "5" }
  ]
}
```

#### POST `/api/practice/evaluate`

LLM-evaluate code solution.

**Request:**
```json
{
  "code": "function fibonacci(n) { ... }",
  "language": "javascript",
  "challenge_description": "Implement fibonacci sequence",
  "test_results": [...]
}
```

**Response:**
```json
{
  "score": 85,
  "feedback": "Good solution! Consider using memoization...",
  "hints": ["Try caching previous results"],
  "complexity_analysis": "Time: O(2^n), Space: O(n)"
}
```

---

### Profile

#### GET `/api/profile`

Get full user profile.

**Response:**
```json
{
  "id": 1,
  "username": "adventurer",
  "email": "adventurer@example.com",
  "display_name": "Sir Codealot",
  "avatar_url": null,
  "created_at": "2026-01-15T10:30:00Z",
  "level": 12,
  "title": "Frontend Mage",
  "total_xp": 14250,
  "xp_to_next_level": 1250,
  "quests_completed": 42
}
```

#### PUT `/api/profile`

Update profile.

**Request:**
```json
{
  "display_name": "Lady Coder",
  "avatar_url": "https://..."
}
```

**Response:** Updated profile object

#### GET `/api/profile/achievements`

List all achievements with unlock status.

**Response:**
```json
[
  {
    "id": 1,
    "title": "First Blood",
    "description": "Complete your first lesson",
    "icon_url": null,
    "requirement": "Complete 1 lesson",
    "earned_at": "2026-01-15T10:30:00Z"
  }
]
```

---

### PDF Processing

#### POST `/api/pdf/upload`

Upload PDF file.

**Request:** Multipart form data
- `file` - PDF file (max 50MB)

**Response:**
```json
{
  "id": "uuid-here",
  "filename": "course-material.pdf",
  "status": "uploaded",
  "file_size_bytes": 1048576
}
```

#### POST `/api/pdf/{pdf_id}/process`

Process uploaded PDF (SSE stream).

**Parameters:**
- `pdf_id` (string) - PDF ID

**SSE Events:**
```
event: status
data: {"stage": "extraction", "message": "Extracting text..."}

event: status
data: {"stage": "chunking", "message": "Identifying sections..."}

event: complete
data: {"course_id": 1, "title": "Course from PDF"}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "ERROR_CODE",
  "detail": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input data |
| 404 | Not Found | Resource doesn't exist |
| 422 | Validation Error | Pydantic validation failed |
| 500 | Server Error | Internal server error |

### Common Error Codes

| Code | Description |
|------|-------------|
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `VALIDATION_ERROR` | Input validation failed |
| `LLM_ERROR` | LLM API error |
| `EXECUTION_TIMEOUT` | Code execution timed out |
| `EXECUTION_ERROR` | Code execution failed |
| `PDF_PROCESSING_ERROR` | PDF processing failed |

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
      "loc": ["body", "title"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**500 Server Error:**
```json
{
  "error": "INTERNAL_ERROR",
  "detail": "Internal server error"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. This will be added in future versions.

## Content Types

- **JSON API**: `application/json`
- **SSE Stream**: `text/event-stream`
- **File Upload**: `multipart/form-data`
