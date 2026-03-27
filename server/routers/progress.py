"""Progress tracking API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from server.database import get_db
from server.services import progress_service

router = APIRouter(prefix="/progress", tags=["progress"])


# Request/Response schemas
class CompleteLessonRequest(BaseModel):
    lesson_id: int
    course_id: int
    time_spent_seconds: int = 0


class CompleteLessonResponse(BaseModel):
    xp_earned: int
    total_xp: int
    level_before: int
    level_after: int
    xp_to_next_level: int
    new_achievements: List[dict]
    node_completed: bool


class ProgressSummaryResponse(BaseModel):
    total_lessons_completed: int
    total_courses_completed: int
    total_xp: int
    current_level: int
    current_level_xp: int
    xp_to_next_level: int
    level_progress_percentage: int
    streak_days: int


class RoadmapProgressResponse(BaseModel):
    path_id: int
    completed_nodes: int
    total_nodes: int
    completion_percentage: float


class LessonProgressItem(BaseModel):
    lesson_id: int
    title: str
    completed: bool
    xp_reward: int


class CourseProgressResponse(BaseModel):
    course_id: int
    course_title: str
    completed_lessons: int
    total_lessons: int
    completion_percentage: float
    total_xp: int
    lessons: List[LessonProgressItem]


@router.post("/complete-lesson", response_model=CompleteLessonResponse)
async def complete_lesson(
    request: CompleteLessonRequest,
    db: Session = Depends(get_db),
):
    """Mark a lesson as complete, award XP, check achievements.
    
    Awards XP based on lesson's xp_reward, updates user level if threshold
    reached, checks for new achievements, and reports if the course node
    is now fully completed.
    """
    result = progress_service.complete_lesson(
        db,
        lesson_id=request.lesson_id,
        course_id=request.course_id,
        time_spent_seconds=request.time_spent_seconds,
    )
    return result


@router.get("/summary", response_model=ProgressSummaryResponse)
async def get_progress_summary(db: Session = Depends(get_db)):
    """Get overall progress summary.
    
    Returns total lessons completed, courses completed, XP, level, and streak.
    """
    summary = progress_service.get_progress_summary(db)
    return summary


@router.get("/roadmap/{path_id}", response_model=RoadmapProgressResponse)
async def get_roadmap_progress(path_id: int, db: Session = Depends(get_db)):
    """Get progress for a specific roadmap path.
    
    Returns completion stats for all nodes in the path.
    """
    progress = progress_service.get_roadmap_progress(db, path_id)
    if progress is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Roadmap path {path_id} not found",
        )
    return progress


@router.get("/course/{course_id}", response_model=CourseProgressResponse)
async def get_course_progress(course_id: int, db: Session = Depends(get_db)):
    """Get progress for a specific course.
    
    Returns lesson-by-lesson completion status for the course.
    """
    progress = progress_service.get_course_progress(db, course_id)
    if progress is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course {course_id} not found",
        )
    return progress
