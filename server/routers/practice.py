"""Practice/Arena API endpoints for code execution and evaluation."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from server.database import get_db
from server.services import practice_service

router = APIRouter(prefix="/practice", tags=["practice"])


# Request/Response Schemas

class TestCase(BaseModel):
    input: str = Field(..., description="Input value for the test")
    expected_output: str = Field(..., description="Expected output from the code")


class ExecuteCodeRequest(BaseModel):
    code: str = Field(..., description="Code to execute")
    language: str = Field(..., pattern="^(javascript|python)$")
    test_cases: List[TestCase] = Field(default=[], description="Test cases to run")
    challenge_description: Optional[str] = Field(None, description="Description of the challenge for LLM evaluation")


class TestResult(BaseModel):
    passed: bool
    input: str
    expected: str
    actual: str


class ExecuteCodeResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: int
    test_results: List[TestResult]


class EvaluateRequest(BaseModel):
    code: str = Field(..., description="Code to evaluate")
    language: str = Field(..., pattern="^(javascript|python)$")
    challenge_description: str = Field(..., description="Description of the challenge requirements")
    test_results: List[TestResult] = Field(default=[], description="Results from test execution")


class EvaluateResponse(BaseModel):
    feedback: str
    hints: List[str]
    score: int = Field(..., ge=0, le=100)
    passed: bool


class SaveSessionRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    language: str = Field(..., pattern="^(javascript|python)$")
    code: str = Field(..., description="Code content")
    course_id: Optional[int] = Field(None, description="Associated course ID")
    lesson_id: Optional[int] = Field(None, description="Associated lesson ID")
    output: Optional[str] = Field(None, description="Last execution output")
    status: str = Field(default="in_progress", pattern="^(in_progress|passed|failed)$")


class PracticeSessionResponse(BaseModel):
    id: str
    course_id: Optional[int]
    lesson_id: Optional[int]
    title: str
    language: str
    code: str
    output: Optional[str]
    status: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# Endpoints

@router.post("/execute", response_model=ExecuteCodeResponse)
async def execute_code(request: ExecuteCodeRequest):
    """Execute code in a sandboxed environment.
    
    Supports JavaScript (Node.js) and Python with security restrictions:
    - 5-second timeout
    - 64MB memory limit (JS)
    - No network access
    - No filesystem writes
    - Blocked dangerous patterns
    
    Returns execution output and test case results.
    """
    test_cases = [{"input": tc.input, "expected_output": tc.expected_output} for tc in request.test_cases]
    
    result = await practice_service.execute_code(
        code=request.code,
        language=request.language,
        test_cases=test_cases,
    )
    
    return ExecuteCodeResponse(
        stdout=result.stdout,
        stderr=result.stderr,
        exit_code=result.exit_code,
        execution_time_ms=result.execution_time_ms,
        test_results=[
            TestResult(
                passed=tr.passed,
                input=tr.input,
                expected=tr.expected,
                actual=tr.actual,
            )
            for tr in result.test_results
        ],
    )


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_solution(request: EvaluateRequest):
    """Evaluate a code solution using LLM.
    
    Sends the code and challenge description to an LLM for evaluation.
    Returns feedback, hints, and a score (0-100).
    """
    test_results = [
        practice_service.TestCaseResult(
            passed=tr.passed,
            input_data=tr.input,
            expected=tr.expected,
            actual=tr.actual,
        )
        for tr in request.test_results
    ]
    
    result = await practice_service.evaluate_solution(
        code=request.code,
        language=request.language,
        challenge_description=request.challenge_description,
        test_results=test_results,
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
    """List saved practice sessions.
    
    Optionally filter by course_id or lesson_id.
    Returns sessions ordered by most recently updated.
    """
    sessions = practice_service.list_sessions(db, course_id=course_id, lesson_id=lesson_id)
    
    return [
        PracticeSessionResponse(
            id=s.id,
            course_id=s.course_id,
            lesson_id=s.lesson_id,
            title=s.title,
            language=s.language,
            code=s.code,
            output=s.output,
            status=s.status,
            created_at=s.created_at.isoformat() if s.created_at else "",
            updated_at=s.updated_at.isoformat() if s.updated_at else "",
        )
        for s in sessions
    ]


@router.post("/sessions", response_model=PracticeSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(request: SaveSessionRequest, db: Session = Depends(get_db)):
    """Save a new practice session.
    
    Creates a persistent record of the user's coding session.
    """
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
    """Get a specific practice session by ID.
    
    Returns the full session details including code and output.
    """
    session = practice_service.get_session(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Practice session {session_id} not found",
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


@router.put("/sessions/{session_id}", response_model=PracticeSessionResponse)
async def update_session(
    session_id: str,
    request: SaveSessionRequest,
    db: Session = Depends(get_db),
):
    """Update an existing practice session.
    
    Updates the code, output, and/or status of a saved session.
    """
    session = practice_service.update_session(
        db=db,
        session_id=session_id,
        code=request.code,
        output=request.output,
        status=request.status,
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Practice session {session_id} not found",
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


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a practice session."""
    deleted = practice_service.delete_session(db, session_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Practice session {session_id} not found",
        )
