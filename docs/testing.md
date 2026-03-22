# Testing Documentation

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
- [ ] Roadmap tree renders correctly
- [ ] Nodes are positioned correctly
- [ ] Connections render between nodes
- [ ] Node status colors display (locked/unlocked/completed)
- [ ] Clicking node shows details
- [ ] "Generate Course" button works
- [ ] Responsive layout works

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
    "topic": "CSS Basics",
    "roadmap_path_id": "frontend",
    "roadmap_node_id": "css-basics"
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
    "code": "console.log(2 + 2);",
    "language": "javascript",
    "test_cases": [
      {"input": "", "expected_output": "4"}
    ]
  }'
```

**Execute Python:**
```bash
curl -X POST http://localhost:8000/api/practice/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(2 + 2)",
    "language": "python",
    "test_cases": [
      {"input": "", "expected_output": "4"}
    ]
  }'
```

### Profile

**Get profile:**
```bash
curl http://localhost:8000/api/profile
```

**Update profile:**
```bash
curl -X PUT http://localhost:8000/api/profile \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "New Name"
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
- 4 roadmap paths (Frontend, Backend, DevOps, Database)
- ~24 nodes per path
- Sample achievements
- Default user profile

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
- Verify OPENROUTER_API_KEY is set
- Check API key has sufficient credits

**Code execution fails:**
- Ensure Node.js is installed for JavaScript execution
- Ensure Python is available for Python execution
