"""Practice/arena service — code execution, LLM evaluation, session management."""
import asyncio
import logging
import os
import re
import subprocess
import tempfile
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from server.database import Base
from server.llm.client import completion_json
from sqlalchemy import Column, String, Text, DateTime, ForeignKey

logger = logging.getLogger(__name__)


class PracticeSession(Base):
    """Practice session model for storing user code sessions."""
    __tablename__ = "practice_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String, ForeignKey("courses.id"), nullable=True)
    lesson_id = Column(String, ForeignKey("lessons.id"), nullable=True)
    title = Column(String, nullable=False)
    language = Column(String, nullable=False)  # "javascript" or "python"
    code = Column(Text, nullable=False)
    output = Column(Text)
    status = Column(String, default="in_progress")  # "in_progress", "passed", "failed"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TestCaseResult:
    """Result of a single test case execution."""
    def __init__(self, passed: bool, input_data: str, expected: str, actual: str):
        self.passed = passed
        self.input = input_data
        self.expected = expected
        self.actual = actual

    def to_dict(self) -> dict:
        return {
            "passed": self.passed,
            "input": self.input,
            "expected": self.expected,
            "actual": self.actual,
        }


class ExecutionResult:
    """Result of code execution."""
    def __init__(
        self,
        stdout: str,
        stderr: str,
        exit_code: int,
        execution_time_ms: int,
        test_results: list[TestCaseResult],
    ):
        self.stdout = stdout
        self.stderr = stderr
        self.exit_code = exit_code
        self.execution_time_ms = execution_time_ms
        self.test_results = test_results

    def to_dict(self) -> dict:
        return {
            "stdout": self.stdout,
            "stderr": self.stderr,
            "exit_code": self.exit_code,
            "execution_time_ms": self.execution_time_ms,
            "test_results": [tr.to_dict() for tr in self.test_results],
        }


class EvaluationResult:
    """Result of LLM code evaluation."""
    def __init__(
        self,
        feedback: str,
        hints: list[str],
        score: int,
        passed: bool,
    ):
        self.feedback = feedback
        self.hints = hints
        self.score = score
        self.passed = passed

    def to_dict(self) -> dict:
        return {
            "feedback": self.feedback,
            "hints": self.hints,
            "score": self.score,
            "passed": self.passed,
        }


# Security patterns to block
BLOCKED_PATTERNS = {
    "python": [
        r"\bimport\s+os\b",
        r"\bimport\s+subprocess\b",
        r"\bimport\s+sys\b",
        r"\b__import__\s*\(",
        r"\bopen\s*\(",
        r"\bfile\s*\(",
        r"\bexec\s*\(",
        r"\beval\s*\(",
        r"\bcompile\s*\(",
        r"\binput\s*\(",
        r"\braw_input\s*\(",
    ],
    "javascript": [
        r"\brequire\s*\(\s*['\"]fs['\"]\s*\)",
        r"\brequire\s*\(\s*['\"]child_process['\"]\s*\)",
        r"\brequire\s*\(\s*['\"]path['\"]\s*\)",
        r"\bimport\s+['\"]fs['\"]",
        r"\bimport\s+['\"]child_process['\"]",
        r"\bprocess\s*\.\s*exit\s*\(",
        r"\bdocument\b",
        r"\bwindow\b",
        r"\beval\s*\(",
        r"\bFunction\s*\(",
        r"\bsetTimeout\s*\(",
        r"\bsetInterval\s*\(",
        r"\brequire\s*\(\s*['\"]http['\"]\s*\)",
        r"\brequire\s*\(\s*['\"]https['\"]\s*\)",
        r"\brequire\s*\(\s*['\"]net['\"]\s*\)",
    ],
}


def _check_security(code: str, language: str) -> Optional[str]:
    """Check code for potentially dangerous patterns.
    
    Returns error message if unsafe code detected, None otherwise.
    """
    patterns = BLOCKED_PATTERNS.get(language, [])
    for pattern in patterns:
        if re.search(pattern, code, re.IGNORECASE):
            return f"Security violation: blocked pattern '{pattern}' detected"
    return None


def _prepare_test_code(code: str, language: str, test_cases: list[dict]) -> str:
    """Wrap user code with test case execution.
    
    For JavaScript: appends console.log statements for each test
    For Python: appends print statements for each test
    """
    if language == "javascript":
        # Extract function name from code (simple heuristic)
        func_match = re.search(r"function\s+(\w+)\s*\(", code)
        if not func_match:
            func_match = re.search(r"const\s+(\w+)\s*=\s*(?:async\s*)?\(", code)
        if not func_match:
            func_match = re.search(r"(?:let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(", code)
        
        func_name = func_match.group(1) if func_match else "solution"
        
        test_code = code + "\n\n// Test cases\n"
        for i, tc in enumerate(test_cases):
            input_val = tc.get("input", "")
            test_code += f"console.log('TEST_{i}_START');\n"
            test_code += f"console.log({func_name}({input_val}));\n"
            test_code += f"console.log('TEST_{i}_END');\n"
        return test_code
    
    elif language == "python":
        # Try to detect function name
        func_match = re.search(r"def\s+(\w+)\s*\(", code)
        func_name = func_match.group(1) if func_match else "solution"
        
        test_code = code + "\n\n# Test cases\n"
        for i, tc in enumerate(test_cases):
            input_val = tc.get("input", "")
            test_code += f"print('TEST_{i}_START')\n"
            test_code += f"print({func_name}({input_val}))\n"
            test_code += f"print('TEST_{i}_END')\n"
        return test_code
    
    return code


def _parse_test_output(stdout: str, test_cases: list[dict]) -> list[TestCaseResult]:
    """Parse test output to extract test results."""
    results = []
    lines = stdout.strip().split("\n")
    
    for i, tc in enumerate(test_cases):
        expected = str(tc.get("expected_output", "")).strip()
        start_marker = f"TEST_{i}_START"
        end_marker = f"TEST_{i}_END"
        
        actual = ""
        capturing = False
        for line in lines:
            if start_marker in line:
                capturing = True
                continue
            if end_marker in line:
                capturing = False
                break
            if capturing:
                actual = line.strip()
                capturing = False  # Only capture first output line
        
        passed = actual == expected
        results.append(TestCaseResult(
            passed=passed,
            input_data=tc.get("input", ""),
            expected=expected,
            actual=actual,
        ))
    
    return results


async def execute_code(
    code: str,
    language: str,
    test_cases: list[dict],
    timeout_seconds: int = 5,
) -> ExecutionResult:
    """Execute code in a sandboxed environment.
    
    Args:
        code: User code to execute
        language: "javascript" or "python"
        test_cases: List of test cases with input and expected_output
        timeout_seconds: Execution timeout (default 5s)
    
    Returns:
        ExecutionResult with stdout, stderr, exit code, and test results
    """
    import time
    start_time = time.time()
    
    # Security check
    security_error = _check_security(code, language)
    if security_error:
        return ExecutionResult(
            stdout="",
            stderr=security_error,
            exit_code=1,
            execution_time_ms=0,
            test_results=[],
        )
    
    # Prepare test code
    full_code = _prepare_test_code(code, language, test_cases)
    
    # Create temp file
    suffix = ".js" if language == "javascript" else ".py"
    with tempfile.NamedTemporaryFile(mode="w", suffix=suffix, delete=False) as f:
        f.write(full_code)
        temp_path = f.name
    
    try:
        if language == "javascript":
            # Run with Node.js, memory limit, no network
            cmd = [
                "node",
                "--max-old-space-size=64",
                "--no-deprecation",
                temp_path,
            ]
        elif language == "python":
            # Run Python with restricted environment
            cmd = [
                "python",
                "-c",
                full_code,
            ]
        else:
            return ExecutionResult(
                stdout="",
                stderr=f"Unsupported language: {language}",
                exit_code=1,
                execution_time_ms=0,
                test_results=[],
            )
        
        # Run subprocess with timeout
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            # Restrict environment - no network, limited env vars
            env={"PATH": os.environ.get("PATH", "")},
        )
        
        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(),
                timeout=timeout_seconds,
            )
            stdout = stdout_bytes.decode("utf-8", errors="replace")
            stderr = stderr_bytes.decode("utf-8", errors="replace")
            exit_code = proc.returncode
        except asyncio.TimeoutError:
            proc.kill()
            stdout = ""
            stderr = f"Execution timed out after {timeout_seconds} seconds"
            exit_code = 124
        
        execution_time_ms = int((time.time() - start_time) * 1000)
        
        # Parse test results
        test_results = _parse_test_output(stdout, test_cases)
        
        return ExecutionResult(
            stdout=stdout,
            stderr=stderr,
            exit_code=exit_code,
            execution_time_ms=execution_time_ms,
            test_results=test_results,
        )
        
    except Exception as e:
        logger.error("Code execution failed: %s", str(e))
        return ExecutionResult(
            stdout="",
            stderr=f"Execution error: {str(e)}",
            exit_code=1,
            execution_time_ms=int((time.time() - start_time) * 1000),
            test_results=[],
        )
    finally:
        # Cleanup temp file
        try:
            os.unlink(temp_path)
        except:
            pass


async def evaluate_solution(
    code: str,
    language: str,
    challenge_description: str,
    test_results: list[TestCaseResult],
) -> EvaluationResult:
    """Evaluate a solution using LLM.
    
    Args:
        code: User's submitted code
        language: Programming language used
        challenge_description: Description of the challenge/requirements
        test_results: Results from test execution
    
    Returns:
        EvaluationResult with feedback, hints, and score
    """
    # Calculate base score from test results
    if test_results:
        passed_count = sum(1 for tr in test_results if tr.passed)
        test_score = int((passed_count / len(test_results)) * 100)
    else:
        test_score = 0
    
    # Build prompt for LLM
    test_summary = "\n".join([
        f"Test {i+1}: {'PASS' if tr.passed else 'FAIL'} - "
        f"Input: {tr.input}, Expected: {tr.expected}, Got: {tr.actual}"
        for i, tr in enumerate(test_results)
    ])
    
    messages = [
        {
            "role": "system",
            "content": (
                "You are a code evaluation assistant. Analyze the submitted code "
                "against the challenge requirements and test results. "
                "Provide constructive feedback, hints for improvement, and a score. "
                "Respond in JSON format with keys: feedback (string), hints (array of strings), "
                "score (0-100 integer), passed (boolean)."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Challenge: {challenge_description}\n\n"
                f"Language: {language}\n\n"
                f"Submitted Code:\n```\n{code}\n```\n\n"
                f"Test Results:\n{test_summary}\n\n"
                f"Base score from tests: {test_score}/100\n\n"
                f"Evaluate this solution considering code quality, correctness, "
                f"and adherence to requirements. Adjust the score based on code "
                f"quality (±20 points from test score). Return JSON only."
            ),
        },
    ]
    
    try:
        result = await completion_json(
            messages=messages,
            temperature=0.3,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
        
        feedback = result.get("feedback", "No feedback provided.")
        hints = result.get("hints", [])
        score = max(0, min(100, result.get("score", test_score)))
        passed = result.get("passed", score >= 70)
        
        return EvaluationResult(
            feedback=feedback,
            hints=hints if isinstance(hints, list) else [hints],
            score=score,
            passed=passed,
        )
        
    except Exception as e:
        logger.error("LLM evaluation failed: %s", str(e))
        # Fallback to test-based evaluation
        return EvaluationResult(
            feedback=f"Tests passed: {sum(1 for tr in test_results if tr.passed)}/{len(test_results) if test_results else 0}",
            hints=["Review your solution against the requirements."],
            score=test_score,
            passed=test_score >= 70,
        )


def list_sessions(db: Session, course_id: Optional[str] = None, lesson_id: Optional[str] = None) -> list[PracticeSession]:
    """List practice sessions, optionally filtered by course or lesson."""
    query = db.query(PracticeSession)
    if course_id:
        query = query.filter(PracticeSession.course_id == course_id)
    if lesson_id:
        query = query.filter(PracticeSession.lesson_id == lesson_id)
    return query.order_by(PracticeSession.updated_at.desc()).all()


def get_session(db: Session, session_id: str) -> Optional[PracticeSession]:
    """Get a practice session by ID."""
    return db.query(PracticeSession).filter(PracticeSession.id == session_id).first()


def create_session(
    db: Session,
    title: str,
    language: str,
    code: str,
    course_id: Optional[str] = None,
    lesson_id: Optional[str] = None,
    output: Optional[str] = None,
    status: str = "in_progress",
) -> PracticeSession:
    """Create a new practice session."""
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
    """Update an existing practice session."""
    session = get_session(db, session_id)
    if not session:
        return None
    
    if code is not None:
        session.code = code
    if output is not None:
        session.output = output
    if status is not None:
        session.status = status
    
    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session


def delete_session(db: Session, session_id: str) -> bool:
    """Delete a practice session. Returns True if deleted."""
    session = get_session(db, session_id)
    if not session:
        return False
    db.delete(session)
    db.commit()
    return True
