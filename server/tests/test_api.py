from __future__ import annotations

import os
import sys
import tempfile
import time
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
        self.upload_dir = tempfile.TemporaryDirectory()
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
        self.grimoire_settings_patch = patch(
            "server.services.grimoire_service.get_settings",
            return_value=types.SimpleNamespace(
                GRIMOIRE_UPLOAD_DIR=self.upload_dir.name,
                OPENAI_API_KEY=None,
                LLM_DEFAULT_MODEL="test-model",
            ),
        )
        self.grimoire_settings_patch.start()
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.grimoire_settings_patch.stop()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()
        os.close(self.db_fd)
        os.unlink(self.db_path)
        self.upload_dir.cleanup()

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

    def seed_practice_floor(self) -> int:
        with self.db_session() as db:
            path = RoadmapPath(
                title="Frontend Development",
                description="Frontend path",
                icon="Monitor",
                colors="from-orange-500 to-amber-500",
                sort_order=1,
                is_locked=False,
                is_custom=False,
            )
            db.add(path)
            db.flush()

            topic = Topic(
                title="JavaScript Basics",
                description="Variables, functions, and control flow.",
                ai_generated=False,
                keywords="javascript, functions",
            )
            db.add(topic)
            db.flush()

            node = RoadmapNode(
                path_id=path.id,
                topic_id=topic.id,
                position_x=100,
                position_y=100,
                tier=1,
                status="available",
            )
            db.add(node)
            db.flush()
            return node.id

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

    def test_grimoire_upload_course_and_projection_flow(self) -> None:
        with self.db_session() as db:
            path = RoadmapPath(title="Frontend Development", description="Frontend path")
            react_topic = Topic(title="React Basics", description="React fundamentals", keywords="react, components, state")
            api_topic = Topic(title="APIs & REST", description="API fundamentals", keywords="api, rest, http, json")
            db.add_all([path, react_topic, api_topic])
            db.flush()
            db.add_all(
                [
                    RoadmapNode(
                        path_id=path.id,
                        topic_id=react_topic.id,
                        tier=2,
                        position_x=100,
                        position_y=300,
                        status="available",
                    ),
                    RoadmapNode(
                        path_id=path.id,
                        topic_id=api_topic.id,
                        tier=2,
                        position_x=320,
                        position_y=300,
                        status="locked",
                    ),
                ]
            )

        file_content = (
            "REACT BASICS\n\n"
            "Components, props, and state are the foundation of React applications.\n\n"
            "APIS & REST\n\n"
            "HTTP methods, JSON payloads, and endpoint design are essential for backend work."
        ).encode("utf-8")

        upload_response = self.client.post(
            "/api/grimoires/upload",
            files={"file": ("grimoire.txt", file_content, "text/plain")},
        )
        self.assertEqual(upload_response.status_code, 202)
        document_id = upload_response.json()["id"]

        document_response = None
        for _ in range(10):
            document_response = self.client.get(f"/api/grimoires/{document_id}")
            if document_response.json()["status"] == "ready":
                break
            time.sleep(0.05)
        self.assertIsNotNone(document_response)
        self.assertEqual(document_response.status_code, 200)
        self.assertEqual(document_response.json()["status"], "ready")

        sections_response = self.client.get(f"/api/grimoires/{document_id}/sections")
        self.assertEqual(sections_response.status_code, 200)
        sections = sections_response.json()
        self.assertGreaterEqual(len(sections), 2)
        section_ids = [section["id"] for section in sections[:2]]

        course_response = self.client.post(
            f"/api/grimoires/{document_id}/courses",
            json={},
        )
        self.assertEqual(course_response.status_code, 200)
        course_payload = course_response.json()
        self.assertEqual(course_payload["generation_mode"], "document")
        self.assertEqual(course_payload["source_document_id"], document_id)
        self.assertGreater(len(course_payload["lessons"]), 0)

        preview_response = self.client.post(
            f"/api/grimoires/{document_id}/roadmap-preview",
            json={"section_ids": section_ids},
        )
        self.assertEqual(preview_response.status_code, 200)
        preview_payload = preview_response.json()
        self.assertGreater(len(preview_payload["suggestions"]), 0)

        apply_response = self.client.post(
            f"/api/grimoires/{document_id}/roadmap-apply",
            json={"section_ids": section_ids},
        )
        self.assertEqual(apply_response.status_code, 200)
        apply_payload = apply_response.json()
        self.assertGreater(apply_payload["inserted_count"], 0)

    def test_grimoire_upload_rejects_unsupported_format(self) -> None:
        response = self.client.post(
            "/api/grimoires/upload",
            files={"file": ("notes.md", b"# heading", "text/markdown")},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "BAD_REQUEST")

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
            "server.services.practice_execution.completion_json",
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

    def test_practice_catalog_room_and_submission_flow(self) -> None:
        floor_id = self.seed_practice_floor()

        catalog_response = self.client.get("/api/practice/catalog")
        self.assertEqual(catalog_response.status_code, 200)
        self.assertEqual(len(catalog_response.json()["floors"]), 1)

        floor_response = self.client.get(f"/api/practice/floors/{floor_id}")
        self.assertEqual(floor_response.status_code, 200)
        self.assertEqual(floor_response.json()["floor"]["subcategory"], "JavaScript Basics")

        standard_payload = {
            "title": "Function Forge",
            "summary": "Add two numbers",
            "instructions": "Implement solve(a, b) and return their sum.",
            "explanation": "A basic function challenge.",
            "entrypoint_name": "solve",
            "starter_code": "def solve(a, b):\n    return a + b",
            "solution_code": "def solve(a, b):\n    return a + b",
            "visible_tests": [{"args": [1, 2], "expected": 3}],
            "hidden_tests": [{"args": [5, 8], "expected": 13}],
            "hints": ["Return the sum."],
            "examples": [{"input": "1, 2", "output": "3"}],
            "constraints": ["Return an integer"],
            "tags": ["functions"],
            "xp_reward": 120,
        }
        boss_payload = {
            **standard_payload,
            "title": "Boss Forge",
            "xp_reward": 250,
        }

        with patch(
            "server.services.practice_service.completion_json",
            AsyncMock(side_effect=[standard_payload, standard_payload, standard_payload, boss_payload]),
        ):
            room_response = self.client.post(
                "/api/practice/rooms",
                json={
                    "floor_id": floor_id,
                    "language": "python",
                    "difficulty": "easy",
                },
            )

        self.assertEqual(room_response.status_code, 200)
        room_payload = room_response.json()
        self.assertEqual(len(room_payload["encounters"]), 4)
        self.assertEqual(room_payload["boss_available"], False)

        standard_encounters = [
            encounter for encounter in room_payload["encounters"] if encounter["encounter_type"] == "standard"
        ]
        boss_encounter = next(
            encounter for encounter in room_payload["encounters"] if encounter["encounter_type"] == "boss"
        )

        for encounter in standard_encounters:
            submit_response = self.client.post(
                f"/api/practice/encounters/{encounter['id']}/submit",
                json={"code": "def solve(a, b):\n    return a + b"},
            )
            self.assertEqual(submit_response.status_code, 200)

        refreshed_room = self.client.get(f"/api/practice/rooms/{room_payload['id']}")
        self.assertEqual(refreshed_room.status_code, 200)
        self.assertEqual(refreshed_room.json()["boss_available"], True)

        boss_submit = self.client.post(
            f"/api/practice/encounters/{boss_encounter['id']}/submit",
            json={"code": "def solve(a, b):\n    return a + b"},
        )
        self.assertEqual(boss_submit.status_code, 200)
        self.assertEqual(boss_submit.json()["room"]["status"], "completed")

    def test_practice_generation_requires_ai_configuration(self) -> None:
        floor_id = self.seed_practice_floor()
        response = self.client.post(
            "/api/practice/challenges/generate",
            json={
                "floor_id": floor_id,
                "language": "python",
                "target_difficulty": "easy",
            },
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["code"], "AI_NOT_CONFIGURED")

    def test_practice_spawn_regains_attempt_tokens(self) -> None:
        floor_id = self.seed_practice_floor()
        standard_payload = {
            "title": "Function Forge",
            "summary": "Add two numbers",
            "instructions": "Implement solve(a, b) and return their sum.",
            "explanation": "A basic function challenge.",
            "entrypoint_name": "solve",
            "starter_code": "def solve(a, b):\n    return a + b",
            "solution_code": "def solve(a, b):\n    return a + b",
            "visible_tests": [{"args": [1, 2], "expected": 3}],
            "hidden_tests": [{"args": [5, 8], "expected": 13}],
            "hints": ["Return the sum."],
            "examples": [{"input": "1, 2", "output": "3"}],
            "constraints": ["Return an integer"],
            "tags": ["functions"],
            "xp_reward": 120,
        }
        boss_payload = {**standard_payload, "title": "Boss Forge", "xp_reward": 250}

        with patch(
            "server.services.practice_service.completion_json",
            AsyncMock(side_effect=[standard_payload, standard_payload, standard_payload, boss_payload]),
        ):
            room_response = self.client.post(
                "/api/practice/rooms",
                json={"floor_id": floor_id, "language": "python", "difficulty": "easy"},
            )
        self.assertEqual(room_response.status_code, 200)
        room_payload = room_response.json()
        first_standard = next(
            encounter for encounter in room_payload["encounters"] if encounter["encounter_type"] == "standard"
        )

        fail_response = self.client.post(
            f"/api/practice/encounters/{first_standard['id']}/submit",
            json={"code": "def solve(a, b):\n    return a - b"},
        )
        self.assertEqual(fail_response.status_code, 200)
        self.assertEqual(fail_response.json()["room"]["attempt_tokens"], 2)

        with patch(
            "server.services.practice_service.completion_json",
            AsyncMock(return_value=standard_payload),
        ):
            spawn_response = self.client.post(
                f"/api/practice/rooms/{room_payload['id']}/spawn",
                json={"count": 1},
            )
        self.assertEqual(spawn_response.status_code, 200)
        self.assertEqual(len(spawn_response.json()["encounters"]), 5)
        spawned = next(
            encounter for encounter in spawn_response.json()["encounters"] if encounter["encounter_type"] == "spawned"
        )

        spawned_submit = self.client.post(
            f"/api/practice/encounters/{spawned['id']}/submit",
            json={"code": "def solve(a, b):\n    return a + b"},
        )
        self.assertEqual(spawned_submit.status_code, 200)
        self.assertEqual(spawned_submit.json()["room"]["attempt_tokens"], 3)

    def test_practice_remediation_actions_offer_micro_course_when_attempts_exhausted(self) -> None:
        floor_id = self.seed_practice_floor()
        standard_payload = {
            "title": "Function Forge",
            "summary": "Add two numbers",
            "instructions": "Implement solve(a, b) and return their sum.",
            "explanation": "A basic function challenge.",
            "entrypoint_name": "solve",
            "starter_code": "def solve(a, b):\n    return a + b",
            "solution_code": "def solve(a, b):\n    return a + b",
            "visible_tests": [{"args": [1, 2], "expected": 3}],
            "hidden_tests": [{"args": [5, 8], "expected": 13}],
            "hints": ["Return the sum."],
            "examples": [{"input": "1, 2", "output": "3"}],
            "constraints": ["Return an integer"],
            "tags": ["functions"],
            "xp_reward": 120,
        }
        boss_payload = {**standard_payload, "title": "Boss Forge", "xp_reward": 250}

        with patch(
            "server.services.practice_service.completion_json",
            AsyncMock(side_effect=[standard_payload, standard_payload, standard_payload, boss_payload]),
        ):
            room_response = self.client.post(
                "/api/practice/rooms",
                json={"floor_id": floor_id, "language": "python", "difficulty": "easy"},
            )
        self.assertEqual(room_response.status_code, 200)
        room_payload = room_response.json()
        standard_encounters = [
            encounter for encounter in room_payload["encounters"] if encounter["encounter_type"] == "standard"
        ]

        for encounter in standard_encounters:
            fail_response = self.client.post(
                f"/api/practice/encounters/{encounter['id']}/submit",
                json={"code": "def solve(a, b):\n    return a - b"},
            )
            self.assertEqual(fail_response.status_code, 200)

        refreshed_room = self.client.get(f"/api/practice/rooms/{room_payload['id']}")
        self.assertEqual(refreshed_room.status_code, 200)
        refreshed_payload = refreshed_room.json()
        self.assertEqual(refreshed_payload["status"], "remediation_required")

        action_types = {action["type"] for action in refreshed_payload["remediation_actions"]}
        self.assertIn("spawn_more", action_types)
        self.assertIn("generate_course", action_types)


if __name__ == "__main__":
    unittest.main()
