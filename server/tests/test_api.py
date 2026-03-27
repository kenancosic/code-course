from __future__ import annotations

import os
import sys
import tempfile
import types
import unittest
from contextlib import contextmanager
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import server.models  # noqa: F401
from server.database import Base, get_db

if "litellm" not in sys.modules:
    litellm_stub = types.SimpleNamespace(suppress_debug_info=True)

    async def _acompletion(*_args, **_kwargs):
        raise RuntimeError("litellm is not installed in the local test environment")

    litellm_stub.acompletion = _acompletion
    sys.modules["litellm"] = litellm_stub

from server.main import app
from server.models import Course, Lesson, RoadmapNode, RoadmapPath, Topic, UserProfile


class ApiContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db_fd, self.db_path = tempfile.mkstemp(suffix=".db")
        self.engine = create_engine(
            f"sqlite:///{self.db_path}",
            connect_args={"check_same_thread": False},
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()
        os.close(self.db_fd)
        os.unlink(self.db_path)

    @contextmanager
    def db_session(self):
        db = self.SessionLocal()
        try:
            yield db
            db.commit()
        finally:
            db.close()

    def seed_course(self) -> tuple[int, int, int]:
        with self.db_session() as db:
            topic = Topic(title="Testing", description="Testing topic", ai_generated=False)
            db.add(topic)
            db.flush()

            course = Course(
                title="Testing 101",
                description="Course description",
                topic_id=topic.id,
                status="ready",
                total_lessons=1,
                total_xp=25,
            )
            db.add(course)
            db.flush()

            lesson = Lesson(
                course_id=course.id,
                title="Lesson One",
                content_markdown="# Hello",
                task_type="quiz",
                task_content="What is testing?",
                sort_order=0,
                xp_reward=25,
            )
            db.add(lesson)
            db.flush()
            return topic.id, course.id, lesson.id

    def test_progress_summary_shape(self) -> None:
        _, course_id, lesson_id = self.seed_course()
        self.client.post(
            "/api/progress/complete-lesson",
            json={
                "lesson_id": lesson_id,
                "course_id": course_id,
                "time_spent_seconds": 90,
            },
        )

        response = self.client.get("/api/progress/summary")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(
            set(payload.keys()),
            {
                "total_lessons_completed",
                "total_courses_completed",
                "total_xp",
                "current_level",
                "current_level_xp",
                "xp_to_next_level",
                "level_progress_percentage",
                "streak_days",
            },
        )
        self.assertEqual(payload["total_lessons_completed"], 1)

    def test_profile_current_path_update(self) -> None:
        with self.db_session() as db:
            profile = UserProfile(display_name="Adventurer", avatar_seed="Felix")
            path = RoadmapPath(title="Backend", description="Backend path")
            db.add(profile)
            db.add(path)
            db.flush()
            path_id = path.id

        update_response = self.client.put(
            "/api/profile/",
            json={"display_name": "Updated Hero", "current_path_id": path_id},
        )
        self.assertEqual(update_response.status_code, 200)

        profile_response = self.client.get("/api/profile/")
        self.assertEqual(profile_response.status_code, 200)
        payload = profile_response.json()
        self.assertEqual(payload["display_name"], "Updated Hero")
        self.assertEqual(payload["current_path"]["id"], path_id)
        self.assertEqual(payload["current_path"]["title"], "Backend")

    def test_course_generation_stream_endpoint(self) -> None:
        with self.db_session() as db:
            topic = Topic(title="Python", description="Python topic")
            db.add(topic)
            db.flush()
            topic_id = topic.id

        async def fake_stream(*_args, **_kwargs):
            yield 'event: status\ndata: {"stage":"outline","message":"planning"}\n\n'
            yield 'event: complete\ndata: {"course_id":1,"total_lessons":1}\n\n'

        with patch("server.services.course_service.generate_course", fake_stream):
            response = self.client.post(
                "/api/courses/generate",
                json={"topic_ids": [topic_id]},
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/event-stream", response.headers["content-type"])
        self.assertIn("event: complete", response.text)

    def test_topic_generation_and_error_envelope(self) -> None:
        fake_roadmap = {
            "title": "Rust Path",
            "description": "Roadmap for Rust",
            "nodes": [
                {"title": "Rust Basics", "description": "Basics", "keywords": ["rust"], "tier": 1},
                {"title": "Ownership", "description": "Ownership", "keywords": ["rust"], "tier": 2},
            ],
            "connections": [{"from": "Rust Basics", "to": "Ownership"}],
        }

        with patch(
            "server.services.topic_service._llm_roadmap",
            AsyncMock(return_value=fake_roadmap),
        ):
            response = self.client.post(
                "/api/topics/generate-roadmap",
                json={"topic": "Rust"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["title"], "Rust Path")
        self.assertEqual(len(payload["nodes"]), 2)

        missing = self.client.get("/api/courses/9999")
        self.assertEqual(missing.status_code, 404)
        self.assertEqual(missing.json()["code"], "RESOURCE_NOT_FOUND")
        self.assertIn("message", missing.json())

    def test_practice_execute_evaluate_and_sessions(self) -> None:
        execute_response = self.client.post(
            "/api/practice/execute",
            json={
                "code": "def add(a, b):\n    return a + b",
                "language": "python",
                "test_cases": [{"input": "2, 3", "expected_output": "5"}],
            },
        )
        self.assertEqual(execute_response.status_code, 200)
        self.assertEqual(execute_response.json()["test_results"][0]["passed"], True)

        with patch(
            "server.services.practice_service.completion_json",
            AsyncMock(
                return_value={
                    "feedback": "Looks good",
                    "hints": ["Keep it simple"],
                    "score": 95,
                    "passed": True,
                }
            ),
        ):
            eval_response = self.client.post(
                "/api/practice/evaluate",
                json={
                    "code": "def add(a, b):\n    return a + b",
                    "language": "python",
                    "challenge_description": "Add two numbers",
                    "test_results": [
                        {
                            "passed": True,
                            "input": "2, 3",
                            "expected": "5",
                            "actual": "5",
                        }
                    ],
                },
            )

        self.assertEqual(eval_response.status_code, 200)
        self.assertEqual(eval_response.json()["score"], 95)

        create_response = self.client.post(
            "/api/practice/sessions",
            json={
                "title": "Arena Session",
                "language": "python",
                "code": "print(1)",
                "output": "1",
                "status": "passed",
            },
        )
        self.assertEqual(create_response.status_code, 201)
        session_id = create_response.json()["id"]

        list_response = self.client.get("/api/practice/sessions")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)

        delete_response = self.client.delete(f"/api/practice/sessions/{session_id}")
        self.assertEqual(delete_response.status_code, 204)


if __name__ == "__main__":
    unittest.main()
