from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


LanguageLiteral = Literal["javascript", "python"]
DifficultyLiteral = Literal["easy", "medium", "hard"]
ChallengeKindLiteral = Literal["standard", "spawned", "boss"]
EncounterStatusLiteral = Literal["available", "locked", "passed", "failed"]
RoomStatusLiteral = Literal["active", "remediation_required", "completed"]
SessionStatusLiteral = Literal["in_progress", "passed", "failed"]


class LegacyTestCase(BaseModel):
    input: str = Field(..., description="Legacy display input for ad-hoc execution")
    expected_output: str = Field(..., description="Legacy expected output for ad-hoc execution")
    is_hidden: bool = False


class DisplayTestCase(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool = False


class ExamplePayload(BaseModel):
    input: str
    output: str
    explanation: str | None = None


class ExecuteCodeRequest(BaseModel):
    code: str = Field(..., description="Code to execute")
    language: LanguageLiteral
    entrypoint_name: Optional[str] = Field(
        None,
        pattern=r"^[A-Za-z_][A-Za-z0-9_]*$",
        description="Optional function name to invoke for structured test runs",
    )
    test_cases: list[LegacyTestCase] = Field(default_factory=list)
    challenge_description: Optional[str] = None


class TestResult(BaseModel):
    passed: bool
    input: str
    expected: str
    actual: str
    is_hidden: bool = False


class ExecuteCodeResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: int
    test_results: list[TestResult]


class EvaluateRequest(BaseModel):
    code: str
    language: LanguageLiteral
    challenge_description: str
    test_results: list[TestResult] = Field(default_factory=list)


class EvaluateResponse(BaseModel):
    feedback: str
    hints: list[str]
    score: int = Field(..., ge=0, le=100)
    passed: bool


class SaveSessionRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    language: LanguageLiteral
    code: str
    course_id: Optional[int] = None
    lesson_id: Optional[int] = None
    output: Optional[str] = None
    status: SessionStatusLiteral = "in_progress"


class PracticeSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: Optional[int]
    lesson_id: Optional[int]
    title: str
    language: LanguageLiteral
    code: str
    output: Optional[str]
    status: SessionStatusLiteral
    created_at: str
    updated_at: str


class RelatedCourseSummary(BaseModel):
    id: int
    title: str
    status: str
    total_lessons: int


class PracticeFloorSummary(BaseModel):
    id: int
    path_id: int
    topic_id: int
    category: str
    subcategory: str
    description: str | None = None
    subtopics: list[str] = Field(default_factory=list)
    difficulty_levels: list[DifficultyLiteral] = Field(default_factory=list)
    language_options: list[LanguageLiteral] = Field(default_factory=list)
    challenge_count: int = 0
    active_room_id: str | None = None


class PracticeCatalogFilters(BaseModel):
    categories: list[str] = Field(default_factory=list)
    subcategories: list[str] = Field(default_factory=list)
    languages: list[LanguageLiteral] = Field(default_factory=list)
    difficulties: list[DifficultyLiteral] = Field(default_factory=list)


class PracticeCatalogResponse(BaseModel):
    filters: PracticeCatalogFilters
    floors: list[PracticeFloorSummary]


class PracticeChallengeResponse(BaseModel):
    id: int
    path_id: int | None = None
    topic_id: int | None = None
    lesson_id: int | None = None
    title: str
    summary: str
    instructions: str
    explanation: str | None = None
    language: LanguageLiteral
    difficulty: DifficultyLiteral
    challenge_kind: ChallengeKindLiteral
    entrypoint_name: str
    starter_code: str
    xp_reward: int
    visible_tests: list[DisplayTestCase] = Field(default_factory=list)
    hints: list[str] = Field(default_factory=list)
    examples: list[ExamplePayload] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    ai_generated: bool
    created_at: str


class PracticeFloorDetailResponse(BaseModel):
    floor: PracticeFloorSummary
    related_courses: list[RelatedCourseSummary] = Field(default_factory=list)
    challenge_templates: list[PracticeChallengeResponse] = Field(default_factory=list)


class GeneratePracticeChallengeRequest(BaseModel):
    floor_id: int
    language: LanguageLiteral
    target_difficulty: DifficultyLiteral
    subtopic: str | None = None
    practice_goal: str | None = None
    boss: bool = False


class CreatePracticeRoomRequest(BaseModel):
    floor_id: int
    language: LanguageLiteral
    difficulty: DifficultyLiteral
    selected_subtopic: str | None = None
    practice_goal: str | None = None


class SpawnPracticeEncountersRequest(BaseModel):
    count: int = Field(..., description="Allowed values: 1 or 3")


class SubmitEncounterRequest(BaseModel):
    code: str


class PracticeEncounterResponse(BaseModel):
    id: str
    encounter_order: int
    encounter_type: ChallengeKindLiteral
    status: EncounterStatusLiteral
    attempts_used: int
    challenge: PracticeChallengeResponse


class PracticeRemediationAction(BaseModel):
    type: str
    label: str
    description: str
    route: str | None = None
    topic_id: int | None = None
    course_id: int | None = None


class PracticeRoomStateResponse(BaseModel):
    id: str
    floor_id: int
    title: str
    category: str
    subcategory: str
    language: LanguageLiteral
    difficulty: DifficultyLiteral
    selected_subtopic: str | None = None
    practice_goal: str | None = None
    attempt_tokens: int
    max_attempt_tokens: int
    status: RoomStatusLiteral
    boss_available: bool
    boss_defeated: bool
    encounters: list[PracticeEncounterResponse] = Field(default_factory=list)
    remediation_actions: list[PracticeRemediationAction] = Field(default_factory=list)


class PracticeSubmissionResponse(BaseModel):
    id: str
    encounter_id: str
    room_id: str
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: int
    passed: bool
    score: int | None = None
    visible_test_results: list[TestResult] = Field(default_factory=list)
    hidden_test_summary: dict[str, Any] = Field(default_factory=dict)
    room: PracticeRoomStateResponse
