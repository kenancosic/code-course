"""Practice domain service — catalog, challenge templates, rooms, and session persistence."""

from __future__ import annotations
from datetime import UTC, datetime
from typing import Any, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from server.errors import api_error
from server.llm.client import completion_json
from server.models import (
    Course,
    CourseEnrollment,
    PracticeChallenge,
    PracticeEncounter,
    PracticeRoom,
    PracticeSession,
    PracticeSubmission,
    RoadmapNode,
    Topic,
    TopicConnection,
)
from server.services import progression_service
from server.services.practice_execution import (
    StructuredTestCase,
    execute_structured_code,
    structured_test_to_display,
)


def _utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _validate_language(language: str) -> str:
    if language not in {"javascript", "python"}:
        raise api_error(422, f"Unsupported practice language '{language}'")
    return language


def _validate_difficulty(difficulty: str) -> str:
    if difficulty not in {"easy", "medium", "hard"}:
        raise api_error(422, f"Unsupported practice difficulty '{difficulty}'")
    return difficulty


def _serialize_challenge(challenge: PracticeChallenge) -> dict[str, Any]:
    return {
        "id": challenge.id,
        "path_id": challenge.path_id,
        "topic_id": challenge.topic_id,
        "lesson_id": challenge.lesson_id,
        "title": challenge.title,
        "summary": challenge.summary,
        "instructions": challenge.instructions,
        "explanation": challenge.explanation,
        "language": challenge.language,
        "difficulty": challenge.difficulty,
        "challenge_kind": challenge.challenge_kind,
        "entrypoint_name": challenge.entrypoint_name,
        "starter_code": challenge.starter_code,
        "xp_reward": challenge.xp_reward,
        "visible_tests": [structured_test_to_display(test_case) for test_case in challenge.visible_tests or []],
        "hints": challenge.hints or [],
        "examples": challenge.examples or [],
        "constraints": challenge.constraints or [],
        "tags": challenge.tags or [],
        "ai_generated": challenge.ai_generated,
        "created_at": challenge.created_at.isoformat() if challenge.created_at else "",
    }


def _topic_subtopics_map(db: Session, topic_ids: list[int]) -> dict[int, list[str]]:
    if not topic_ids:
        return {}

    connections = (
        db.query(TopicConnection)
        .filter(
            TopicConnection.from_topic_id.in_(topic_ids),
            TopicConnection.relationship_type == "subtopic",
        )
        .all()
    )
    titles = {
        topic.id: topic.title
        for topic in db.query(Topic).filter(Topic.id.in_([row.to_topic_id for row in connections])).all()
    }
    grouped: dict[int, list[str]] = {topic_id: [] for topic_id in topic_ids}
    for connection in connections:
        title = titles.get(connection.to_topic_id)
        if title:
            grouped[connection.from_topic_id].append(title)
    return grouped


def _related_courses(db: Session, topic_id: int) -> list[dict[str, Any]]:
    profile = progression_service.get_or_create_profile(db)
    return [
        {
            "id": course.id,
            "title": course.title,
            "status": course.status,
            "total_lessons": course.total_lessons,
        }
        for course in db.query(Course)
        .join(CourseEnrollment, CourseEnrollment.course_id == Course.id)
        .filter(
            Course.topic_id == topic_id,
            CourseEnrollment.user_id == profile.id,
        )
        .order_by(Course.created_at.desc())
        .all()
    ]


def _serialize_floor_summary(
    floor: RoadmapNode,
    subtopics: list[str],
    challenge_count: int,
    active_room_id: str | None,
) -> dict[str, Any]:
    return {
        "id": floor.id,
        "path_id": floor.path_id,
        "topic_id": floor.topic_id,
        "category": floor.path.title,
        "subcategory": floor.topic.title,
        "description": floor.topic.description,
        "subtopics": subtopics,
        "difficulty_levels": ["easy", "medium", "hard"],
        "language_options": ["javascript", "python"],
        "challenge_count": challenge_count,
        "active_room_id": active_room_id,
    }


def list_catalog(
    db: Session,
    search_query: str | None = None,
    category: str | None = None,
    subcategory: str | None = None,
) -> dict[str, Any]:
    floors = (
        db.query(RoadmapNode)
        .options(joinedload(RoadmapNode.path), joinedload(RoadmapNode.topic))
        .order_by(RoadmapNode.path_id.asc(), RoadmapNode.tier.asc(), RoadmapNode.position_y.asc())
        .all()
    )
    subtopics_map = _topic_subtopics_map(db, [floor.topic_id for floor in floors])
    challenge_counts = {
        (path_id, topic_id): count
        for path_id, topic_id, count in db.query(
            PracticeChallenge.path_id,
            PracticeChallenge.topic_id,
            func.count(PracticeChallenge.id),
        )
        .group_by(PracticeChallenge.path_id, PracticeChallenge.topic_id)
        .all()
    }
    active_rooms = {}
    for floor_id, room_id in (
        db.query(PracticeRoom.floor_id, PracticeRoom.id)
        .filter(PracticeRoom.status != "completed")
        .order_by(PracticeRoom.updated_at.desc())
        .all()
    ):
        active_rooms.setdefault(floor_id, room_id)

    serialized: list[dict[str, Any]] = []
    for floor in floors:
        summary = _serialize_floor_summary(
            floor,
            subtopics_map.get(floor.topic_id, []),
            challenge_counts.get((floor.path_id, floor.topic_id), 0),
            active_rooms.get(floor.id),
        )
        haystack = " ".join(
            filter(
                None,
                [
                    summary["category"],
                    summary["subcategory"],
                    summary["description"] or "",
                    " ".join(summary["subtopics"]),
                ],
            )
        ).lower()
        if search_query and search_query.lower() not in haystack:
            continue
        if category and summary["category"] != category:
            continue
        if subcategory and summary["subcategory"] != subcategory:
            continue
        serialized.append(summary)

    return {
        "filters": {
            "categories": sorted({floor.path.title for floor in floors}),
            "subcategories": sorted({floor.topic.title for floor in floors}),
            "languages": ["javascript", "python"],
            "difficulties": ["easy", "medium", "hard"],
        },
        "floors": serialized,
    }


def get_floor_detail(db: Session, floor_id: int) -> dict[str, Any]:
    floor = (
        db.query(RoadmapNode)
        .options(joinedload(RoadmapNode.path), joinedload(RoadmapNode.topic))
        .filter(RoadmapNode.id == floor_id)
        .first()
    )
    if not floor:
        raise api_error(404, f"Practice floor {floor_id} not found")

    subtopics = _topic_subtopics_map(db, [floor.topic_id]).get(floor.topic_id, [])
    challenge_templates = (
        db.query(PracticeChallenge)
        .filter(
            PracticeChallenge.path_id == floor.path_id,
            PracticeChallenge.topic_id == floor.topic_id,
        )
        .order_by(PracticeChallenge.updated_at.desc())
        .limit(12)
        .all()
    )
    return {
        "floor": _serialize_floor_summary(floor, subtopics, len(challenge_templates), None),
        "related_courses": _related_courses(db, floor.topic_id),
        "challenge_templates": [_serialize_challenge(challenge) for challenge in challenge_templates],
    }


def _challenge_prompt(
    floor: RoadmapNode,
    language: str,
    difficulty: str,
    subtopic: str | None,
    practice_goal: str | None,
    boss: bool,
    related_courses: list[dict[str, Any]],
    subtopics: list[str],
) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": (
                "Generate one coding challenge in JSON only. Keys: title, summary, instructions, "
                "explanation, entrypoint_name, starter_code, solution_code, visible_tests, hidden_tests, "
                "hints, examples, constraints, tags, xp_reward. Tests must use args arrays and expected values."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Category: {floor.path.title}\n"
                f"Subcategory: {floor.topic.title}\n"
                f"Topic description: {floor.topic.description or floor.topic.title}\n"
                f"Available subtopics: {', '.join(subtopics) or 'None'}\n"
                f"Selected subtopic: {subtopic or 'None'}\n"
                f"Practice goal: {practice_goal or 'General mastery'}\n"
                f"Language: {language}\n"
                f"Difficulty: {difficulty}\n"
                f"Boss challenge: {'yes' if boss else 'no'}\n"
                f"Related courses: {', '.join(course['title'] for course in related_courses[:5]) or 'None'}\n"
                "Create a deterministic function-based challenge that can be auto-graded."
            ),
        },
    ]


def _normalize_generated_tests(raw_tests: Any, hidden: bool) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    if not isinstance(raw_tests, list):
        return normalized
    for item in raw_tests:
        if not isinstance(item, dict):
            continue
        args = item.get("args", [])
        if not isinstance(args, list):
            args = [args]
        normalized.append({"args": args, "expected": item.get("expected"), "hidden": hidden})
    return normalized


async def generate_practice_challenge(
    db: Session,
    floor_id: int,
    language: str,
    target_difficulty: str,
    subtopic: str | None = None,
    practice_goal: str | None = None,
    boss: bool = False,
) -> PracticeChallenge:
    language = _validate_language(language)
    target_difficulty = _validate_difficulty(target_difficulty)
    floor = (
        db.query(RoadmapNode)
        .options(joinedload(RoadmapNode.path), joinedload(RoadmapNode.topic))
        .filter(RoadmapNode.id == floor_id)
        .first()
    )
    if not floor:
        raise api_error(404, f"Practice floor {floor_id} not found")

    related_courses = _related_courses(db, floor.topic_id)
    subtopics = _topic_subtopics_map(db, [floor.topic_id]).get(floor.topic_id, [])
    payload = await completion_json(
        messages=_challenge_prompt(
            floor=floor,
            language=language,
            difficulty=target_difficulty,
            subtopic=subtopic,
            practice_goal=practice_goal,
            boss=boss,
            related_courses=related_courses,
            subtopics=subtopics,
        ),
        temperature=0.4,
        max_tokens=4096,
        response_format={"type": "json_object"},
    )

    challenge = PracticeChallenge(
        path_id=floor.path_id,
        topic_id=floor.topic_id,
        title=str(payload.get("title") or f"{floor.topic.title} {'Boss' if boss else 'Trial'}"),
        summary=str(payload.get("summary") or f"Practice {floor.topic.title} through a focused challenge."),
        instructions=str(payload.get("instructions") or "Implement the requested function and satisfy the tests."),
        explanation=payload.get("explanation"),
        language=language,
        difficulty=target_difficulty,
        challenge_kind="boss" if boss else "standard",
        entrypoint_name=str(payload.get("entrypoint_name") or "solve"),
        starter_code=str(payload.get("starter_code") or ""),
        solution_code=payload.get("solution_code"),
        xp_reward=int(payload.get("xp_reward") or (250 if boss else 100)),
        visible_tests=_normalize_generated_tests(payload.get("visible_tests"), hidden=False),
        hidden_tests=_normalize_generated_tests(payload.get("hidden_tests"), hidden=True),
        hints=[str(item) for item in payload.get("hints", [])] if isinstance(payload.get("hints"), list) else [],
        examples=[item for item in payload.get("examples", []) if isinstance(item, dict)] if isinstance(payload.get("examples"), list) else [],
        constraints=[str(item) for item in payload.get("constraints", [])] if isinstance(payload.get("constraints"), list) else [],
        tags=[str(item) for item in payload.get("tags", [])] if isinstance(payload.get("tags"), list) else [],
        source_prompt=practice_goal,
        grounding_context={
            "category": floor.path.title,
            "subcategory": floor.topic.title,
            "selected_subtopic": subtopic,
            "related_courses": related_courses[:5],
        },
        ai_generated=True,
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


async def _ensure_room_challenges(
    db: Session,
    floor: RoadmapNode,
    language: str,
    difficulty: str,
    selected_subtopic: str | None,
    practice_goal: str | None,
) -> tuple[list[PracticeChallenge], PracticeChallenge]:
    standard = (
        db.query(PracticeChallenge)
        .filter(
            PracticeChallenge.path_id == floor.path_id,
            PracticeChallenge.topic_id == floor.topic_id,
            PracticeChallenge.language == language,
            PracticeChallenge.difficulty == difficulty,
            PracticeChallenge.challenge_kind == "standard",
        )
        .order_by(PracticeChallenge.updated_at.desc())
        .all()
    )
    boss = (
        db.query(PracticeChallenge)
        .filter(
            PracticeChallenge.path_id == floor.path_id,
            PracticeChallenge.topic_id == floor.topic_id,
            PracticeChallenge.language == language,
            PracticeChallenge.difficulty == difficulty,
            PracticeChallenge.challenge_kind == "boss",
        )
        .order_by(PracticeChallenge.updated_at.desc())
        .first()
    )

    while len(standard) < 3:
        standard.insert(
            0,
            await generate_practice_challenge(
                db,
                floor.id,
                language,
                difficulty,
                subtopic=selected_subtopic,
                practice_goal=practice_goal,
                boss=False,
            ),
        )
    if not boss:
        boss = await generate_practice_challenge(
            db,
            floor.id,
            language,
            difficulty,
            subtopic=selected_subtopic,
            practice_goal=practice_goal,
            boss=True,
        )
    return standard[:3], boss


def _base_encounters_cleared(room: PracticeRoom) -> bool:
    base_encounters = [encounter for encounter in room.encounters if encounter.encounter_type == "standard"]
    return bool(base_encounters) and all(encounter.status == "passed" for encounter in base_encounters)


def _boss_available(room: PracticeRoom) -> bool:
    return not room.boss_defeated and room.attempt_tokens >= room.max_attempt_tokens and _base_encounters_cleared(room)


def _refresh_room_state(room: PracticeRoom) -> None:
    boss = next((encounter for encounter in room.encounters if encounter.encounter_type == "boss"), None)
    if boss:
        if room.boss_defeated:
            boss.status = "passed"
        elif _boss_available(room):
            boss.status = "available"
        elif boss.attempts_used > 0:
            boss.status = "failed"
        else:
            boss.status = "locked"

    if room.boss_defeated:
        room.status = "completed"
    elif room.attempt_tokens <= 0:
        room.status = "remediation_required"
    else:
        room.status = "active"


def _remediation_actions(db: Session, room: PracticeRoom) -> list[dict[str, Any]]:
    actions = [
        {
            "type": "revisit_floor",
            "label": "Revisit Floor Overview",
            "description": f"Review {room.floor.topic.title} concepts and challenge notes.",
            "route": "/practice",
            "topic_id": room.floor.topic_id,
            "course_id": None,
        }
    ]
    for course in _related_courses(db, room.floor.topic_id)[:2]:
        actions.append(
            {
                "type": "revisit_course",
                "label": f"Study {course['title']}",
                "description": "Use the related course to rebuild this concept before another boss attempt.",
                "route": f"/course/{course['id']}",
                "topic_id": room.floor.topic_id,
                "course_id": course["id"],
            }
        )
    if not any(action["type"] == "revisit_course" for action in actions):
        actions.append(
            {
                "type": "generate_course",
                "label": "Generate Micro-Course",
                "description": f"Forge a focused learning path around {room.floor.topic.title}.",
                "route": f"/roadmap/{room.floor.path_id}",
                "topic_id": room.floor.topic_id,
                "course_id": None,
            }
        )
    actions.append(
        {
            "type": "spawn_more",
            "label": "Spawn More Encounters",
            "description": "Generate one or three more encounters to regain lost attempt tokens.",
            "route": None,
            "topic_id": room.floor.topic_id,
            "course_id": None,
        }
    )
    return actions


def _serialize_room(room: PracticeRoom, db: Session) -> dict[str, Any]:
    _refresh_room_state(room)
    return {
        "id": room.id,
        "floor_id": room.floor_id,
        "title": room.title,
        "category": room.floor.path.title,
        "subcategory": room.floor.topic.title,
        "language": room.language,
        "difficulty": room.difficulty,
        "selected_subtopic": room.selected_subtopic,
        "practice_goal": room.practice_goal,
        "attempt_tokens": room.attempt_tokens,
        "max_attempt_tokens": room.max_attempt_tokens,
        "status": room.status,
        "boss_available": _boss_available(room),
        "boss_defeated": room.boss_defeated,
        "encounters": [
            {
                "id": encounter.id,
                "encounter_order": encounter.encounter_order,
                "encounter_type": encounter.encounter_type,
                "status": encounter.status,
                "attempts_used": encounter.attempts_used,
                "challenge": _serialize_challenge(encounter.challenge),
            }
            for encounter in room.encounters
        ],
        "remediation_actions": _remediation_actions(db, room) if room.status == "remediation_required" else [],
    }


def get_room(db: Session, room_id: str) -> PracticeRoom:
    room = (
        db.query(PracticeRoom)
        .options(
            joinedload(PracticeRoom.floor).joinedload(RoadmapNode.path),
            joinedload(PracticeRoom.floor).joinedload(RoadmapNode.topic),
            selectinload(PracticeRoom.encounters).joinedload(PracticeEncounter.challenge),
        )
        .filter(PracticeRoom.id == room_id)
        .first()
    )
    if not room:
        raise api_error(404, f"Practice room {room_id} not found")
    _refresh_room_state(room)
    return room


async def create_room(
    db: Session,
    floor_id: int,
    language: str,
    difficulty: str,
    selected_subtopic: str | None = None,
    practice_goal: str | None = None,
) -> dict[str, Any]:
    language = _validate_language(language)
    difficulty = _validate_difficulty(difficulty)
    floor = (
        db.query(RoadmapNode)
        .options(joinedload(RoadmapNode.path), joinedload(RoadmapNode.topic))
        .filter(RoadmapNode.id == floor_id)
        .first()
    )
    if not floor:
        raise api_error(404, f"Practice floor {floor_id} not found")

    standard, boss = await _ensure_room_challenges(db, floor, language, difficulty, selected_subtopic, practice_goal)

    room = PracticeRoom(
        floor_id=floor.id,
        title=f"{floor.topic.title} Challenge Room",
        language=language,
        difficulty=difficulty,
        selected_subtopic=selected_subtopic,
        practice_goal=practice_goal,
        attempt_tokens=3,
        max_attempt_tokens=3,
        status="active",
    )
    db.add(room)
    db.flush()
    for index, challenge in enumerate(standard, start=1):
        db.add(
            PracticeEncounter(
                room_id=room.id,
                challenge_id=challenge.id,
                encounter_order=index,
                encounter_type="standard",
                status="available",
            )
        )
    db.add(
        PracticeEncounter(
            room_id=room.id,
            challenge_id=boss.id,
            encounter_order=4,
            encounter_type="boss",
            status="locked",
        )
    )
    db.commit()
    return _serialize_room(get_room(db, room.id), db)


async def spawn_room_encounters(db: Session, room_id: str, count: int) -> dict[str, Any]:
    if count not in {1, 3}:
        raise api_error(422, "Spawn count must be 1 or 3")
    room = get_room(db, room_id)
    next_order = max(encounter.encounter_order for encounter in room.encounters) + 1
    for offset in range(count):
        challenge = await generate_practice_challenge(
            db,
            room.floor_id,
            room.language,
            room.difficulty,
            subtopic=room.selected_subtopic,
            practice_goal=room.practice_goal,
            boss=False,
        )
        challenge.challenge_kind = "spawned"
        db.add(challenge)
        db.flush()
        db.add(
            PracticeEncounter(
                room_id=room.id,
                challenge_id=challenge.id,
                encounter_order=next_order + offset,
                encounter_type="spawned",
                status="available",
            )
        )
    db.commit()
    return _serialize_room(get_room(db, room.id), db)


async def submit_encounter(db: Session, encounter_id: str, code: str) -> dict[str, Any]:
    encounter = (
        db.query(PracticeEncounter)
        .options(joinedload(PracticeEncounter.challenge))
        .filter(PracticeEncounter.id == encounter_id)
        .first()
    )
    if not encounter:
        raise api_error(404, f"Practice encounter {encounter_id} not found")

    room = get_room(db, encounter.room_id)
    encounter = next(item for item in room.encounters if item.id == encounter_id)

    if encounter.encounter_type == "boss" and not _boss_available(room):
        raise api_error(409, "Boss encounter is locked until the room is back at full attempt tokens")

    tests = [
        StructuredTestCase(args=test_case.get("args", []), expected=test_case.get("expected"), hidden=False)
        for test_case in encounter.challenge.visible_tests or []
    ] + [
        StructuredTestCase(args=test_case.get("args", []), expected=test_case.get("expected"), hidden=True)
        for test_case in encounter.challenge.hidden_tests or []
    ]

    execution = await execute_structured_code(
        code=code,
        language=encounter.challenge.language,
        entrypoint_name=encounter.challenge.entrypoint_name,
        test_cases=tests,
    )
    passed = bool(execution.test_results) and all(result.passed for result in execution.test_results)
    visible_results = [result.to_dict() for result in execution.test_results if not result.is_hidden]
    hidden_results = [result.to_dict() for result in execution.test_results if result.is_hidden]

    previously_passed = encounter.status == "passed"
    encounter.attempts_used += 1
    if passed:
        encounter.status = "passed"
        if encounter.encounter_type == "boss":
            room.boss_defeated = True
        elif not previously_passed:
            room.attempt_tokens = min(room.max_attempt_tokens, room.attempt_tokens + 1)
    else:
        encounter.status = "failed"
        if not previously_passed:
            room.attempt_tokens = max(0, room.attempt_tokens - 1)

    _refresh_room_state(room)
    room.updated_at = _utc_now()
    encounter.updated_at = _utc_now()

    submission = PracticeSubmission(
        room_id=room.id,
        encounter_id=encounter.id,
        code=code,
        language=encounter.challenge.language,
        stdout=execution.stdout,
        stderr=execution.stderr,
        exit_code=execution.exit_code,
        execution_time_ms=execution.execution_time_ms,
        passed=passed,
        score=100 if passed else int((sum(1 for result in execution.test_results if result.passed) / len(execution.test_results)) * 100) if execution.test_results else 0,
        visible_results=visible_results,
        hidden_results=hidden_results,
    )
    db.add(submission)
    db.commit()

    return {
        "id": submission.id,
        "encounter_id": submission.encounter_id,
        "room_id": submission.room_id,
        "stdout": submission.stdout or "",
        "stderr": submission.stderr or "",
        "exit_code": submission.exit_code,
        "execution_time_ms": submission.execution_time_ms,
        "passed": submission.passed,
        "score": submission.score,
        "visible_test_results": visible_results,
        "hidden_test_summary": {
            "total": len(hidden_results),
            "passed": sum(1 for result in hidden_results if result.get("passed")),
        },
        "room": _serialize_room(get_room(db, room.id), db),
    }


def list_sessions(db: Session, course_id: Optional[int] = None, lesson_id: Optional[int] = None) -> list[PracticeSession]:
    query = db.query(PracticeSession)
    if course_id:
        query = query.filter(PracticeSession.course_id == course_id)
    if lesson_id:
        query = query.filter(PracticeSession.lesson_id == lesson_id)
    return query.order_by(PracticeSession.updated_at.desc()).all()


def get_session(db: Session, session_id: str) -> Optional[PracticeSession]:
    return db.query(PracticeSession).filter(PracticeSession.id == session_id).first()


def create_session(
    db: Session,
    title: str,
    language: str,
    code: str,
    course_id: Optional[int] = None,
    lesson_id: Optional[int] = None,
    output: Optional[str] = None,
    status: str = "in_progress",
) -> PracticeSession:
    session = PracticeSession(
        title=title,
        language=language,
        code=code,
        course_id=course_id,
        lesson_id=lesson_id,
        output=output,
        status=status,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def update_session(
    db: Session,
    session_id: str,
    code: Optional[str] = None,
    output: Optional[str] = None,
    status: Optional[str] = None,
) -> Optional[PracticeSession]:
    session = get_session(db, session_id)
    if not session:
        return None
    if code is not None:
        session.code = code
    if output is not None:
        session.output = output
    if status is not None:
        session.status = status
    session.updated_at = _utc_now()
    db.commit()
    db.refresh(session)
    return session


def delete_session(db: Session, session_id: str) -> bool:
    session = get_session(db, session_id)
    if not session:
        return False
    db.delete(session)
    db.commit()
    return True
