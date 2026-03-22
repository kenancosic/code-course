"""Course generation service — orchestrates pipeline and DB persistence."""
import logging
from typing import AsyncGenerator

from sqlalchemy.orm import Session

from server.models import Course, Lesson, RoadmapNode
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
    node: RoadmapNode,
    model: str | None = None,
) -> AsyncGenerator[str, None]:
    """Generate a full course from a roadmap node via the LLM pipeline.

    This is an async generator that yields SSE events throughout
    the generation process. The final event contains the course_id.

    Args:
        db: Database session
        node: The roadmap node to generate a course for
        model: Optional model override

    Yields:
        SSE-formatted event strings
    """
    # Parse keywords from the comma-separated string
    keywords = [k.strip() for k in (node.topic_keywords or "").split(",") if k.strip()]

    # Build pipeline context from the roadmap node
    ctx = PipelineContext(
        topic=node.title,
        description=node.description or node.title,
        tier=node.tier or 1,
        keywords=keywords,
        model=model,
    )

    # Create the course record in "generating" state
    course = Course(
        title=node.title,  # Will be updated with LLM-generated title
        description=node.description,
        roadmap_node_id=node.id,
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
        logger.error("Course generation failed for node %d: %s", node.id, str(e))
        # Mark course as errored
        course = db.query(Course).filter(Course.id == course_id).first()
        if course:
            course.status = "error"
            db.commit()

        yield sse_event("error", {"message": f"Course generation failed: {str(e)}"})
