"""Course API endpoints."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from server.database import get_db
from server.models import Course, RoadmapNode
from server.schemas.course import CourseResponse, LessonResponse, GenerateCourseRequest
from server.services import course_service
from server.llm.streaming import sse_response

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/", response_model=List[CourseResponse])
async def list_courses(db: Session = Depends(get_db)):
    """List all generated courses."""
    courses = course_service.list_courses(db)
    return courses


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(course_id: int, db: Session = Depends(get_db)):
    """Get a course with all its lessons."""
    course = course_service.get_course_with_lessons(db, course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course {course_id} not found",
        )
    return course


@router.get("/{course_id}/lessons/{lesson_id}", response_model=LessonResponse)
async def get_lesson(course_id: int, lesson_id: int, db: Session = Depends(get_db)):
    """Get a single lesson by ID."""
    from server.models import Lesson

    lesson = (
        db.query(Lesson)
        .filter(Lesson.id == lesson_id, Lesson.course_id == course_id)
        .first()
    )
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lesson {lesson_id} not found in course {course_id}",
        )
    return lesson


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(course_id: int, db: Session = Depends(get_db)):
    """Delete a course and all its lessons."""
    deleted = course_service.delete_course(db, course_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course {course_id} not found",
        )


@router.post("/generate")
async def generate_course(
    request: GenerateCourseRequest,
    db: Session = Depends(get_db),
):
    """Generate a course from a roadmap node.

    Returns an SSE stream with generation progress and content chunks.

    SSE Events:
        - status: Pipeline stage updates
        - chunk: Lesson content streaming chunks
        - complete: Generation finished with course_id
        - error: Something went wrong
    """
    # Validate the roadmap node exists
    node = db.query(RoadmapNode).filter(RoadmapNode.id == request.roadmap_node_id).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Roadmap node {request.roadmap_node_id} not found",
        )

    # Check if a course is already being generated for this node
    existing = (
        db.query(Course)
        .filter(
            Course.roadmap_node_id == request.roadmap_node_id,
            Course.status == "generating",
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Course generation already in progress for node {request.roadmap_node_id}",
        )

    # Return SSE stream
    return sse_response(
        course_service.generate_course(db, node, model=request.model)
    )
