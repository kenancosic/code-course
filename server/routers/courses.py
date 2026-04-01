"""Course API endpoints."""

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from server.database import get_db
from server.errors import api_error
from server.models import Course, CourseEnrollment, Topic
from server.schemas.course import CourseResponse, LessonResponse, GenerateCourseRequest, EvaluateTaskRequest
from server.services import course_service
from server.llm.streaming import sse_response

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/", response_model=List[CourseResponse])
async def list_courses(db: Session = Depends(get_db)):
    """List the current user's courses."""
    courses = course_service.list_courses(db)
    return courses


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(course_id: int, db: Session = Depends(get_db)):
    """Get one of the current user's courses with all its lessons."""
    course = course_service.get_course_with_lessons(db, course_id)
    if not course:
        raise api_error(status.HTTP_404_NOT_FOUND, f"Course {course_id} not found")
    return course


@router.get("/{course_id}/lessons/{lesson_id}", response_model=LessonResponse)
async def get_lesson(course_id: int, lesson_id: int, db: Session = Depends(get_db)):
    """Get a single lesson from the current user's course."""
    from server.models import Lesson

    course = course_service.get_course_with_lessons(db, course_id)
    if not course:
        raise api_error(status.HTTP_404_NOT_FOUND, f"Course {course_id} not found")

    lesson = (
        db.query(Lesson)
        .filter(Lesson.id == lesson_id, Lesson.course_id == course_id)
        .first()
    )
    if not lesson:
        raise api_error(
            status.HTTP_404_NOT_FOUND,
            f"Lesson {lesson_id} not found in course {course_id}",
        )
    return lesson


@router.post("/{course_id}/lessons/{lesson_id}/evaluate")
async def evaluate_lesson_task(
    course_id: int,
    lesson_id: int,
    request: EvaluateTaskRequest,
    db: Session = Depends(get_db),
):
    """Evaluate a user's answer to a lesson task in the current user's course."""
    from server.models import Lesson
    from server.llm import client
    from server.llm.prompts import evaluate
    from server.config import get_settings

    course = course_service.get_course_with_lessons(db, course_id)
    if not course:
        raise api_error(status.HTTP_404_NOT_FOUND, f"Course {course_id} not found")

    lesson = (
        db.query(Lesson)
        .filter(Lesson.id == lesson_id, Lesson.course_id == course_id)
        .first()
    )
    if not lesson:
        raise api_error(
            status.HTTP_404_NOT_FOUND,
            f"Lesson {lesson_id} not found in course {course_id}",
        )
        
    if not lesson.task_content:
        raise api_error(
            status.HTTP_400_BAD_REQUEST,
            "This lesson does not have a task to evaluate",
        )

    settings = get_settings()
    messages = evaluate.build_messages(
        task_content=lesson.task_content,
        user_answer=request.answer,
    )
    
    try:
        result = await client.completion_json(
            messages=messages,
            model=settings.LLM_FAST_MODEL,
        )
        return {
            "is_correct": result.get("is_correct", False),
            "feedback": result.get("feedback", "Evaluation failed to return feedback."),
            "suggestions": result.get("suggestions"),
            "xp_earned": result.get("xp_earned", lesson.xp_reward or 0),
        }
    except Exception as e:
        raise api_error(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"Evaluation failed: {str(e)}",
        )


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(course_id: int, db: Session = Depends(get_db)):
    """Delete one of the current user's courses and all its lessons."""
    deleted = course_service.delete_course(db, course_id)
    if not deleted:
        raise api_error(status.HTTP_404_NOT_FOUND, f"Course {course_id} not found")

@router.post("/generate")
async def generate_course(
    request: GenerateCourseRequest,
    db: Session = Depends(get_db),
):
    """Generate a course from topics for the current local user.

    Returns an SSE stream with generation progress and content chunks.

    SSE Events:
        - status: Pipeline stage updates
        - chunk: Lesson content streaming chunks
        - complete: Generation finished with course_id
        - error: Something went wrong
    """
    if not request.topic_ids:
        raise api_error(
            status.HTTP_400_BAD_REQUEST,
            "At least one topic ID must be provided",
        )

    # Validate the topics exist
    topics = db.query(Topic).filter(Topic.id.in_(request.topic_ids)).all()
    if not topics or len(topics) != len(request.topic_ids):
        raise api_error(
            status.HTTP_404_NOT_FOUND,
            "One or more topics not found",
        )

    # Use the first topic for course association
    primary_topic_id = request.topic_ids[0]

    # Check if a course is already being generated for this primary topic
    existing = (
        db.query(Course)
        .join(CourseEnrollment, CourseEnrollment.course_id == Course.id)
        .filter(
            Course.topic_id == primary_topic_id,
            Course.status == "generating",
            CourseEnrollment.user_id == course_service.current_user_id(db),
        )
        .first()
    )
    if existing:
        raise api_error(
            status.HTTP_409_CONFLICT,
            f"Course generation already in progress for topic {primary_topic_id}",
        )

    # Return SSE stream
    return sse_response(
        course_service.generate_course(db, topics, model=request.model)
    )
