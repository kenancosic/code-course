# Testing Documentation

This checklist supplements the current contract docs. For the implemented API and architecture, use `docs/api.md` and `ARCHITECTURE.md`.

## Manual Testing Checklist

### Frontend Testing

#### Home Page
- [ ] Hero section displays correctly
- [ ] Stats cards show correct data (level, XP, streak)
- [ ] Recent activity section loads
- [ ] Quick action buttons work
- [ ] Responsive design on mobile

#### Roadmap List
- [ ] All roadmap paths display
- [ ] Progress indicators show correct percentage
- [ ] Locked paths are visually distinct
- [ ] Clicking path navigates to detail

#### Roadmap Detail
- [ ] All 4 roadmaps display in the list
- [ ] Roadmap tree renders with tier rows
- [ ] Nodes are positioned correctly by tier
- [ ] Node status colors display (locked/unlocked/completed/in-progress)
- [ ] Clicking node shows detail panel
- [ ] "Generate Course" button opens subtopic sheet
- [ ] Subtopic selection sheet shows checkboxes for subtopics
- [ ] "Select All" and "Clear" buttons work
- [ ] Course generation via SSE stream works
- [ ] Navigation to course page after generation

#### Course Generation
- [ ] Subtopic selection shows available subtopics
- [ ] Selecting subtopics and generating creates multi-topic course
- [ ] Lesson task types display correctly (quiz/coding/project)
- [ ] AI evaluation returns feedback
- [ ] Confetti animation plays on correct answer

#### Course View
- [ ] Lesson content renders markdown
- [ ] Code blocks have syntax highlighting
- [ ] Navigation between lessons works
- [ ] Progress is saved
- [ ] XP is awarded on completion

#### Practice Page
- [ ] Monaco Editor loads
- [ ] Code execution works
- [ ] Output panel shows results
- [ ] Test cases display correctly
- [ ] "Cast Spell" button executes code

#### Profile Page
- [ ] Character stats display correctly
- [ ] Skills section shows progress
- [ ] Achievements list loads
- [ ] Activity feed displays
- [ ] Edit profile works

#### Create Course
- [ ] File upload zone works
- [ ] PDF uploads successfully
- [ ] Processing progress shows
- [ ] Generated course displays

### Backend Testing

#### API Endpoints

**Roadmaps:**
- [ ] `GET /api/roadmaps` returns list
- [ ] `GET /api/roadmaps/{id}` returns single roadmap
- [ ] Invalid ID returns 404

**Topics:**
- [ ] `GET /api/topics/` returns list
- [ ] `GET /api/topics/` with `?query=css` returns filtered results
- [ ] `GET /api/topics/{id}` returns topic with subtopics
- [ ] `GET /api/topics/{id}` for non-existent ID returns 404
- [ ] `POST /api/topics/generate-roadmap` creates custom roadmap

**Courses:**
- [ ] `GET /api/courses` returns list
- [ ] `GET /api/courses/{id}` returns course with lessons
- [ ] `POST /api/courses/generate` triggers generation
- [ ] SSE stream sends events correctly
- [ ] `DELETE /api/courses/{id}` removes course

**Progress:**
- [ ] `POST /api/progress/complete-lesson` awards XP
- [ ] XP calculation is correct
- [ ] Level-up detection works
- [ ] `GET /api/progress/summary` returns stats

**Practice:**
- [ ] `POST /api/practice/execute` runs JavaScript
- [ ] `POST /api/practice/execute` runs Python
- [ ] Timeout after 5 seconds
- [ ] Memory limits enforced
- [ ] Test case evaluation works

**Profile:**
- [ ] `GET /api/profile` returns user data
- [ ] `PUT /api/profile` updates data
- [ ] `GET /api/profile/achievements` returns achievements

**Evaluation:**
- [ ] `POST /api/courses/{id}/lessons/{id}/evaluate` evaluates quiz answer
- [ ] `POST /api/courses/{id}/lessons/{id}/evaluate` evaluates coding answer
- [ ] Response includes is_correct, feedback, suggestions, xp_earned

#### Database
- [ ] Migrations run successfully
- [ ] Seed data populates correctly
- [ ] Foreign key constraints work
- [ ] Cascade deletes work

## Testing the API with curl

### Health Check

```bash
curl http://localhost:8000/health
```

### Roadmaps

**List all roadmaps:**
```bash
curl http://localhost:8000/api/roadmaps
```

**Get specific roadmap:**
```bash
curl http://localhost:8000/api/roadmaps/1
```

### Topics

# List all topics:
curl http://localhost:8000/api/topics/

# Search topics:
curl "http://localhost:8000/api/topics/?query=css"

# Get topic with subtopics:
curl http://localhost:8000/api/topics/1

### Courses

**List courses:**
```bash
curl http://localhost:8000/api/courses
```

**Get course:**
```bash
curl http://localhost:8000/api/courses/1
```

**Generate course (SSE stream):**
```bash
curl -N -H "Accept: text/event-stream" \
  -X POST http://localhost:8000/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic_ids": [1, 2, 3]
  }'
```

**Delete course:**
```bash
curl -X DELETE http://localhost:8000/api/courses/1
```

### Progress

**Complete lesson:**
```bash
curl -X POST http://localhost:8000/api/progress/complete-lesson \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": 1,
    "course_id": 1,
    "time_spent_seconds": 300
  }'
```

**Get progress summary:**
```bash
curl http://localhost:8000/api/progress/summary
```

### Practice

**Execute JavaScript:**
```bash
curl -X POST http://localhost:8000/api/practice/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function solve(a, b) { return a + b; }",
    "language": "javascript",
    "entrypoint_name": "solve",
    "test_cases": [
      {"input": "2, 2", "expected_output": "4"}
    ]
  }'
```

**Execute Python:**
```bash
curl -X POST http://localhost:8000/api/practice/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def solve(a, b):\n    return a + b",
    "language": "python",
    "entrypoint_name": "solve",
    "test_cases": [
      {"input": "2, 2", "expected_output": "4"}
    ]
  }'
```

### Profile

**Get profile:**
```bash
# Get profile
curl http://localhost:8000/api/profile/
# Response has: id, display_name, avatar_seed, level, title, total_xp, xp_to_next_level, quests_completed, current_path, skills, achievements, recent_activity
```

**Update profile:**
```bash
# Update profile
curl -X PUT http://localhost:8000/api/profile/ \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "New Name",
    "avatar_seed": "Felix"
  }'
```

**Get achievements:**
```bash
curl http://localhost:8000/api/profile/achievements
```

### PDF Upload

**Upload PDF:**
```bash
curl -X POST http://localhost:8000/api/pdf/upload \
  -F "file=@/path/to/document.pdf"
```

**Process PDF (SSE):**
```bash
curl -N -H "Accept: text/event-stream" \
  -X POST http://localhost:8000/api/pdf/{pdf_id}/process
```

## Running Tests (When Added)

### Backend Tests

```bash
cd server

# Run all tests
pytest

# Run with coverage
pytest --cov=.

# Run specific test file
pytest tests/test_roadmaps.py

# Run with verbose output
pytest -v
```

### Frontend Tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

## Test Data Setup

### Reset Database for Testing

```bash
cd server

# Remove existing database
rm mythiccode.db

# Run migrations
alembic upgrade head

# Seed test data
python -m seed.seed_roadmaps
```

### Sample Test Data

The seed script creates:
- 4 roadmap paths (Frontend Development, Backend Development, DevOps, Database Engineering)
- 24 + 8 + 6 + 6 = 44 nodes across all paths
- 4 roadmaps with 4-7 subtopics per node (~250+ subtopics)
- Default user profile (id=1, display_name="Developer")

## Debugging Tips

### Backend Debugging

```bash
# Run with debug mode
cd server
DEBUG=true uvicorn main:app --reload --port 8000

# View SQL queries
# Set echo=True in database.py engine creation
```

### Frontend Debugging

```bash
# Run with React DevTools
pnpm dev

# Check console for API errors
# Network tab for request/response inspection
```

### Common Issues

**Database locked (SQLite):**
- Ensure only one process accesses the database
- Check for hanging connections

**CORS errors:**
- Verify backend CORS settings include frontend URL
- Check proxy configuration in vite.config.ts

**LLM API errors:**
- Verify OPENAI_API_KEY is set
- Check API key has sufficient credits

**Code execution fails:**
- Ensure Node.js is installed for JavaScript execution
- Ensure Python is available for Python execution
