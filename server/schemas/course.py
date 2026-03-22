"""Course and lesson schemas."""
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class LessonBase(BaseModel):
    title: str
    content: str
    order_index: int = 0
    duration_minutes: Optional[int] = None


class LessonCreate(LessonBase):
    pass


class LessonResponse(LessonBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    course_id: int


class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: str = "beginner"
    is_published: bool = False


class CourseCreate(CourseBase):
    pass


class CourseResponse(CourseBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    lessons: List[LessonResponse] = []
