"""Course generation service — orchestrates pipeline and DB persistence."""
import logging
from typing import AsyncGenerator

from sqlalchemy.orm import Session

from server.models import Course, Lesson, Topic
from server.llm.agents.course_pipeline import PipelineContext, run_pipeline
from server.llm.streaming import sse_event

logger = logging.getLogger(__name__)


def get_course_with_lessons(db: Session, course_id: int) -> Course | None:
    """Fetch a course with all its lessons eagerly loaded."""
    return (
        db.query(Course)
        .filter(Course.id == course_id)
        .first()
    )


def list_courses(db: Session) -> list[Course]:
    """List all courses ordered by creation date."""
    return db.query(Course).order_by(Course.created_at.desc()).all()


def delete_course(db: Session, course_id: int) -> bool:
    """Delete a course and its lessons. Returns True if found and deleted."""
    course = db.query(Course).filter(Course.id == course_id).first()
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
