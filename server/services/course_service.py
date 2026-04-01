"""Course generation service — orchestrates pipeline and DB persistence."""
import logging
from datetime import UTC, datetime
from typing import AsyncGenerator

from sqlalchemy import func
from sqlalchemy.orm import Session

from server.models import Course, CourseEnrollment, Lesson, Topic, UserProgress
from server.llm.agents.course_pipeline import PipelineContext, run_pipeline
from server.llm.streaming import sse_event
from server.services import progression_service

logger = logging.getLogger(__name__)


def _utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def current_user_id(db: Session) -> int:
    return progression_service.get_current_profile_id(db)


def ensure_course_enrollment(
    db: Session,
    course_id: int,
    user_id: int | None = None,
    started_at: datetime | None = None,
    last_accessed_at: datetime | None = None,
) -> CourseEnrollment:
    user_id = user_id or current_user_id(db)
    enrollment = (
        db.query(CourseEnrollment)
        .filter(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.course_id == course_id,
        )
        .first()
    )
    if enrollment is None:
        enrollment = CourseEnrollment(
            user_id=user_id,
            course_id=course_id,
            started_at=started_at or _utc_now(),
            last_accessed_at=last_accessed_at,
        )
        db.add(enrollment)
        db.flush()
        return enrollment

    if enrollment.started_at is None and started_at is not None:
        enrollment.started_at = started_at
    if last_accessed_at is not None:
        enrollment.last_accessed_at = last_accessed_at
    db.flush()
    return enrollment


def attach_user_progress(
    db: Session,
    courses: list[Course],
    user_id: int | None = None,
) -> list[Course]:
    if not courses:
        return courses

    user_id = user_id or current_user_id(db)
    course_ids = [course.id for course in courses]
    enrollments = {
        enrollment.course_id: enrollment
        for enrollment in db.query(CourseEnrollment)
        .filter(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.course_id.in_(course_ids),
        )
        .all()
    }
    completed_counts = {
        course_id: count
        for course_id, count in db.query(
            UserProgress.course_id,
            func.count(UserProgress.id),
        )
        .filter(
            UserProgress.user_id == user_id,
            UserProgress.course_id.in_(course_ids),
        )
        .group_by(UserProgress.course_id)
        .all()
    }

    for course in courses:
        enrollment = enrollments.get(course.id)
        total_lessons = course.total_lessons or len(course.lessons)
        completed_lessons = int(completed_counts.get(course.id, 0))
        completion_percentage = (
            round((completed_lessons / total_lessons) * 100, 1)
            if total_lessons
            else 0.0
        )
        course.user_progress = {
            "completed_lessons": completed_lessons,
            "completion_percentage": completion_percentage,
            "started_at": enrollment.started_at if enrollment else None,
            "last_accessed_at": enrollment.last_accessed_at if enrollment else None,
            "completed_at": enrollment.completed_at if enrollment else None,
        }
    return courses


def _current_user_course_query(db: Session, user_id: int | None = None):
    user_id = user_id or current_user_id(db)
    return (
        db.query(Course)
        .join(CourseEnrollment, CourseEnrollment.course_id == Course.id)
        .filter(CourseEnrollment.user_id == user_id)
    )


def get_course_with_lessons(db: Session, course_id: int) -> Course | None:
    """Fetch a course with all its lessons eagerly loaded."""
    course = (
        _current_user_course_query(db)
        .filter(Course.id == course_id)
        .first()
    )
    if not course:
        return None
    return attach_user_progress(db, [course])[0]


def list_courses(db: Session) -> list[Course]:
    """List all courses ordered by creation date."""
    courses = _current_user_course_query(db).order_by(Course.created_at.desc()).all()
    return attach_user_progress(db, courses)


def delete_course(db: Session, course_id: int) -> bool:
    """Delete a course and its lessons. Returns True if found and deleted."""
    course = _current_user_course_query(db).filter(Course.id == course_id).first()
    if not course:
        return False
    db.delete(course)
    db.commit()
    return True


async def generate_course(
    db: Session,
    topics: list[Topic],
    model: str | None = None,
) -> AsyncGenerator[str, None]:
    """Generate a full course from topics via the LLM pipeline.

    This is an async generator that yields SSE events throughout
    the generation process. The final event contains the course_id.

    Args:
        db: Database session
        topics: The topics to generate a course for
        model: Optional model override

    Yields:
        SSE-formatted event strings
    """
    primary_topic = topics[0]
    user_id = current_user_id(db)
    
    # Parse keywords from all topics
    keywords = set()
    for topic in topics:
        if topic.keywords:
            keywords.update([k.strip() for k in topic.keywords.split(",") if k.strip()])
    keywords = list(keywords)
    
    # Combined topic title and description
    topic_title = " and ".join([t.title for t in topics])
    topic_description = " ".join([t.description or t.title for t in topics])

    # Build pipeline context
    ctx = PipelineContext(
        topic=topic_title,
        description=topic_description,
        tier=1,
        keywords=keywords,
        model=model,
    )

    # Create the course record in "generating" state
    course = Course(
        title=topic_title,  # Will be updated with LLM-generated title
        description=topic_description,
        topic_id=primary_topic.id,
        status="generating",
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    ensure_course_enrollment(
        db,
        course.id,
        user_id=user_id,
        started_at=course.created_at or _utc_now(),
        last_accessed_at=course.created_at or _utc_now(),
    )
    db.commit()

    course_id = course.id

    try:
        # Run the pipeline, yielding SSE events as they come
        async for event in run_pipeline(ctx):
            yield event

        # --- Save results to database ---

        # Update course with LLM-generated title/description
        if ctx.outline:
            course.title = ctx.outline.title
            course.description = ctx.outline.description

        # Create lesson records
        for lesson_content in ctx.lessons:
            lesson = Lesson(
                course_id=course_id,
                title=lesson_content.title,
                content_markdown=lesson_content.content_markdown,
                task_type=lesson_content.task_type,
                task_content=lesson_content.task_content,
                sort_order=lesson_content.index,
                xp_reward=10 + (ctx.tier * 5),  # Scale XP by tier
            )
            db.add(lesson)

        course.total_lessons = len(ctx.lessons)
        course.total_xp = sum(10 + (ctx.tier * 5) for _ in ctx.lessons)
        course.status = "ready"

        db.commit()
        db.refresh(course)

        yield sse_event("complete", {
            "course_id": course_id,
            "title": course.title,
            "total_lessons": course.total_lessons,
            "total_xp": course.total_xp,
        })

    except Exception as e:
        logger.error("Course generation failed for topics %s: %s", [t.id for t in topics], str(e))
        # Mark course as errored
        course = db.query(Course).filter(Course.id == course_id).first()
        if course:
            course.status = "error"
            db.commit()

        yield sse_event("error", {"message": f"Course generation failed: {str(e)}"})
