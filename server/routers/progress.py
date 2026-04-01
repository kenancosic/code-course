"""Progress tracking API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from server.database import get_db
from server.schemas.progress import (
    CompleteLessonRequest,
    CompleteLessonResponse,
    CourseProgressResponse,
    ProgressSummaryResponse,
    RoadmapProgressResponse,
)
from server.services import progress_service

router = APIRouter(prefix="/progress", tags=["progress"])


@router.post("/complete-lesson", response_model=CompleteLessonResponse)
async def complete_lesson(
    request: CompleteLessonRequest,
    db: Session = Depends(get_db),
):
    """Mark a lesson complete for the current user, award XP, and check achievements.
    
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
    """Get the current user's overall progress summary.
    
    Returns total lessons completed, courses completed, XP, level, and streak.
    """
    summary = progress_service.get_progress_summary(db)
    return summary


@router.get("/roadmap/{path_id}", response_model=RoadmapProgressResponse)
async def get_roadmap_progress(path_id: int, db: Session = Depends(get_db)):
    """Get current-user progress for a specific roadmap path.
    
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
    """Get current-user progress for a specific course.
    
    Returns lesson-by-lesson completion status for the course.
    """
    progress = progress_service.get_course_progress(db, course_id)
    if progress is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course {course_id} not found",
        )
    return progress
