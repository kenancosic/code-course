"""Course and lesson schemas."""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LessonBase(BaseModel):
    title: str
    source_section_id: Optional[int] = None
    content_markdown: Optional[str] = None
    task_type: Optional[str] = None
    task_content: Optional[str] = None
    sort_order: int = 0
    xp_reward: int = 10


class LessonCreate(LessonBase):
    pass


class LessonResponse(LessonBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int


class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    topic_id: Optional[int] = None
    source_document_id: Optional[int] = None
    status: str = "generating"
    generation_mode: str = "topic"
    total_lessons: int = 0
    total_xp: int = 0


class CourseCreate(CourseBase):
    pass


class CourseResponse(CourseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Optional[datetime] = None
    lessons: List[LessonResponse] = []


class GenerateCourseRequest(BaseModel):
    """Request body for POST /api/courses/generate."""
    topic_ids: List[int]
    model: Optional[str] = None

class EvaluateTaskRequest(BaseModel):
    answer: str
