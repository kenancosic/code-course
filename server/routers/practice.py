"""Practice/Arena API endpoints."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from server.database import get_db
from server.errors import api_error
from server.schemas.practice import (
    CreatePracticeRoomRequest,
    EvaluateRequest,
    EvaluateResponse,
    ExecuteCodeRequest,
    ExecuteCodeResponse,
    GeneratePracticeChallengeRequest,
    PracticeCatalogResponse,
    PracticeChallengeResponse,
    PracticeFloorDetailResponse,
    PracticeRoomStateResponse,
    PracticeSessionResponse,
    PracticeSubmissionResponse,
    SaveSessionRequest,
    SpawnPracticeEncountersRequest,
    SubmitEncounterRequest,
    TestResult,
)
from server.services import practice_service
from server.services.practice_execution import TestCaseResult, evaluate_solution, execute_code

router = APIRouter(prefix="/practice", tags=["practice"])


@router.get("/catalog", response_model=PracticeCatalogResponse)
async def get_catalog(
    q: Optional[str] = None,
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return practice_service.list_catalog(db, search_query=q, category=category, subcategory=subcategory)


@router.get("/floors/{floor_id}", response_model=PracticeFloorDetailResponse)
async def get_floor_detail(floor_id: int, db: Session = Depends(get_db)):
    return practice_service.get_floor_detail(db, floor_id)


@router.post("/challenges/generate", response_model=PracticeChallengeResponse)
async def generate_challenge(
    request: GeneratePracticeChallengeRequest,
    db: Session = Depends(get_db),
):
    challenge = await practice_service.generate_practice_challenge(
        db=db,
        floor_id=request.floor_id,
        language=request.language,
        target_difficulty=request.target_difficulty,
        subtopic=request.subtopic,
        practice_goal=request.practice_goal,
        boss=request.boss,
    )
    return practice_service._serialize_challenge(challenge)


@router.post("/rooms", response_model=PracticeRoomStateResponse)
async def create_room(request: CreatePracticeRoomRequest, db: Session = Depends(get_db)):
    return await practice_service.create_room(
        db=db,
        floor_id=request.floor_id,
        language=request.language,
        difficulty=request.difficulty,
        selected_subtopic=request.selected_subtopic,
        practice_goal=request.practice_goal,
    )


@router.get("/rooms/{room_id}", response_model=PracticeRoomStateResponse)
async def get_room(room_id: str, db: Session = Depends(get_db)):
    room = practice_service.get_room(db, room_id)
    return practice_service._serialize_room(room, db)


@router.post("/rooms/{room_id}/spawn", response_model=PracticeRoomStateResponse)
async def spawn_room(room_id: str, request: SpawnPracticeEncountersRequest, db: Session = Depends(get_db)):
    return await practice_service.spawn_room_encounters(db, room_id, request.count)


@router.post("/encounters/{encounter_id}/submit", response_model=PracticeSubmissionResponse)
async def submit_encounter(
    encounter_id: str,
    request: SubmitEncounterRequest,
    db: Session = Depends(get_db),
):
    return await practice_service.submit_encounter(db, encounter_id, request.code)


@router.post("/execute", response_model=ExecuteCodeResponse)
async def execute_practice_code(request: ExecuteCodeRequest):
    result = await execute_code(
        code=request.code,
        language=request.language,
        test_cases=[test_case.model_dump() for test_case in request.test_cases],
        entrypoint_name=request.entrypoint_name,
    )
    return ExecuteCodeResponse(
        stdout=result.stdout,
        stderr=result.stderr,
        exit_code=result.exit_code,
        execution_time_ms=result.execution_time_ms,
        test_results=[
            TestResult(
                passed=test_result.passed,
                input=test_result.input,
                expected=test_result.expected,
                actual=test_result.actual,
                is_hidden=test_result.is_hidden,
            )
            for test_result in result.test_results
        ],
    )


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_practice_solution(request: EvaluateRequest):
    result = await evaluate_solution(
        code=request.code,
        language=request.language,
        challenge_description=request.challenge_description,
        test_results=[
            TestCaseResult(
                passed=test_result.passed,
                input_data=test_result.input,
                expected=test_result.expected,
                actual=test_result.actual,
                is_hidden=test_result.is_hidden,
            )
            for test_result in request.test_results
        ],
    )
    return EvaluateResponse(
        feedback=result.feedback,
        hints=result.hints,
        score=result.score,
        passed=result.passed,
    )


@router.get("/sessions", response_model=List[PracticeSessionResponse])
async def list_sessions(
    course_id: Optional[int] = None,
    lesson_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    sessions = practice_service.list_sessions(db, course_id=course_id, lesson_id=lesson_id)
    return [
        PracticeSessionResponse(
            id=session.id,
            course_id=session.course_id,
            lesson_id=session.lesson_id,
            title=session.title,
            language=session.language,
            code=session.code,
            output=session.output,
            status=session.status,
            created_at=session.created_at.isoformat() if session.created_at else "",
            updated_at=session.updated_at.isoformat() if session.updated_at else "",
        )
        for session in sessions
    ]


@router.post("/sessions", response_model=PracticeSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(request: SaveSessionRequest, db: Session = Depends(get_db)):
    session = practice_service.create_session(
        db=db,
        title=request.title,
        language=request.language,
        code=request.code,
        course_id=request.course_id,
        lesson_id=request.lesson_id,
        output=request.output,
        status=request.status,
    )
    return PracticeSessionResponse(
        id=session.id,
        course_id=session.course_id,
        lesson_id=session.lesson_id,
        title=session.title,
        language=session.language,
        code=session.code,
        output=session.output,
        status=session.status,
        created_at=session.created_at.isoformat() if session.created_at else "",
        updated_at=session.updated_at.isoformat() if session.updated_at else "",
    )


@router.get("/sessions/{session_id}", response_model=PracticeSessionResponse)
async def get_session(session_id: str, db: Session = Depends(get_db)):
    session = practice_service.get_session(db, session_id)
    if not session:
        raise api_error(status.HTTP_404_NOT_FOUND, f"Practice session {session_id} not found")
    return PracticeSessionResponse(
        id=session.id,
        course_id=session.course_id,
        lesson_id=session.lesson_id,
        title=session.title,
        language=session.language,
        code=session.code,
        output=session.output,
        status=session.status,
        created_at=session.created_at.isoformat() if session.created_at else "",
        updated_at=session.updated_at.isoformat() if session.updated_at else "",
    )


@router.put("/sessions/{session_id}", response_model=PracticeSessionResponse)
async def update_session(
    session_id: str,
    request: SaveSessionRequest,
    db: Session = Depends(get_db),
):
    session = practice_service.update_session(
        db=db,
        session_id=session_id,
        code=request.code,
        output=request.output,
        status=request.status,
    )
    if not session:
        raise api_error(status.HTTP_404_NOT_FOUND, f"Practice session {session_id} not found")
    return PracticeSessionResponse(
        id=session.id,
        course_id=session.course_id,
        lesson_id=session.lesson_id,
        title=session.title,
        language=session.language,
        code=session.code,
        output=session.output,
        status=session.status,
        created_at=session.created_at.isoformat() if session.created_at else "",
        updated_at=session.updated_at.isoformat() if session.updated_at else "",
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    deleted = practice_service.delete_session(db, session_id)
    if not deleted:
        raise api_error(status.HTTP_404_NOT_FOUND, f"Practice session {session_id} not found")
