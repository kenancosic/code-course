"""Course generation pipeline — 4-agent sequential pipeline."""
import asyncio
import logging
from dataclasses import dataclass, field
from typing import AsyncGenerator, Callable

from server.config import get_settings
from server.llm import client
from server.llm.prompts import outline, lesson, exercises, quiz

logger = logging.getLogger(__name__)


@dataclass
class CourseOutline:
    """Output of Agent 1."""
    title: str
    description: str
    lessons: list[dict]  # Each has 'title', 'objectives', 'estimated_minutes'


@dataclass
class LessonContent:
    """Output of Agent 2 for a single lesson."""
    index: int
    title: str
    objectives: list[str]
    content_markdown: str
    estimated_minutes: int


@dataclass
class PipelineContext:
    """Shared state passed through all agents in the pipeline."""
    topic: str
    description: str
    tier: int
    keywords: list[str]
    model: str | None = None

    # Filled by pipeline stages
    outline: CourseOutline | None = None
    lessons: list[LessonContent] = field(default_factory=list)
    exercises_data: list[dict] = field(default_factory=list)
    quiz_data: list[dict] = field(default_factory=list)


async def agent_outline(ctx: PipelineContext) -> AsyncGenerator[str, None]:
    """Agent 1: Outline Architect — generates course structure.

    Yields SSE event strings.
    """
    from server.llm.streaming import sse_event

    settings = get_settings()
    yield sse_event("status", {"stage": "outline", "message": "The Outline Architect is mapping your quest..."})

    messages = outline.build_messages(
        topic=ctx.topic,
        description=ctx.description,
        tier=ctx.tier,
        keywords=ctx.keywords,
    )

    try:
        result = await client.completion_json(
            messages=messages,
            model=settings.LLM_FAST_MODEL,
            temperature=0.7,
            max_tokens=2000,
        )

        ctx.outline = CourseOutline(
            title=result.get("title", ctx.topic),
            description=result.get("description", ctx.description),
            lessons=result.get("lessons", []),
        )

        lesson_titles = [l["title"] for l in ctx.outline.lessons]
        yield sse_event("status", {
            "stage": "outline",
            "message": f"Outline complete: {len(ctx.outline.lessons)} lessons planned",
            "lessons": lesson_titles,
        })

    except Exception as e:
        logger.error("Outline agent failed: %s", str(e))
        yield sse_event("error", {"stage": "outline", "message": f"Outline generation failed: {str(e)}"})
        raise


async def agent_lessons(ctx: PipelineContext) -> AsyncGenerator[str, None]:
    """Agent 2: Lore Scribe — generates lesson content one at a time.

    Yields SSE event strings including content chunks.
    """
    from server.llm.streaming import sse_event

    if not ctx.outline:
        raise ValueError("No outline available — run agent_outline first")

    settings = get_settings()
    total = len(ctx.outline.lessons)

    for i, lesson_outline in enumerate(ctx.outline.lessons):
        yield sse_event("status", {
            "stage": "lesson",
            "message": f"The Lore Scribe is writing lesson {i + 1}/{total}: {lesson_outline['title']}...",
            "lesson_index": i,
        })

        messages = lesson.build_messages(
            course_title=ctx.outline.title,
            lesson_title=lesson_outline["title"],
            objectives=lesson_outline.get("objectives", []),
            tier=ctx.tier,
            topic_keywords=ctx.keywords,
            lesson_index=i,
            total_lessons=total,
        )

        # Stream lesson content
        content_parts = []
        async for chunk in client.stream_completion(
            messages=messages,
            model=ctx.model or settings.LLM_DEFAULT_MODEL,
            temperature=0.7,
            max_tokens=4096,
        ):
            content_parts.append(chunk)
            yield sse_event("chunk", {
                "stage": "lesson",
                "lesson_index": i,
                "content_delta": chunk,
            })

        full_content = "".join(content_parts)
        ctx.lessons.append(LessonContent(
            index=i,
            title=lesson_outline["title"],
            objectives=lesson_outline.get("objectives", []),
            content_markdown=full_content,
            estimated_minutes=lesson_outline.get("estimated_minutes", 15),
        ))

        yield sse_event("status", {
            "stage": "lesson",
            "message": f"Lesson {i + 1}/{total} complete",
            "lesson_index": i,
        })

        # Small delay between lessons for rate limiting
        if i < total - 1:
            await asyncio.sleep(0.1)


async def agent_exercises(ctx: PipelineContext) -> AsyncGenerator[str, None]:
    """Agent 3: Trial Forger — generates coding exercises.

    Yields SSE event strings.
    """
    from server.llm.streaming import sse_event

    if not ctx.lessons:
        raise ValueError("No lessons available — run agent_lessons first")

    settings = get_settings()
    yield sse_event("status", {"stage": "exercises", "message": "The Trial Forger is crafting your challenges..."})

    lessons_summary = [
        {
            "title": l.title,
            "objectives": l.objectives,
            "content_preview": l.content_markdown[:500] if l.content_markdown else "",
        }
        for l in ctx.lessons
    ]

    messages = exercises.build_messages(
        course_title=ctx.outline.title,
        lessons_summary=lessons_summary,
        tier=ctx.tier,
    )

    try:
        result = await client.completion_json(
            messages=messages,
            model=ctx.model or settings.LLM_DEFAULT_MODEL,
            temperature=0.7,
            max_tokens=4096,
        )

        ctx.exercises_data = result if isinstance(result, list) else []
        exercise_count = sum(len(entry.get("exercises", [])) for entry in ctx.exercises_data)

        yield sse_event("status", {
            "stage": "exercises",
            "message": f"Trial Forger complete: {exercise_count} exercises crafted",
        })

    except Exception as e:
        logger.error("Exercises agent failed: %s", str(e))
        # Non-fatal — course can exist without exercises
        ctx.exercises_data = []
        yield sse_event("status", {
            "stage": "exercises",
            "message": "Exercise generation skipped (non-fatal error)",
        })


async def agent_quiz(ctx: PipelineContext) -> AsyncGenerator[str, None]:
    """Agent 4: Quiz Master — generates quiz questions.

    Yields SSE event strings.
    """
    from server.llm.streaming import sse_event

    if not ctx.lessons:
        raise ValueError("No lessons available — run agent_lessons first")

    settings = get_settings()
    yield sse_event("status", {"stage": "quiz", "message": "The Quiz Master is preparing your trials..."})

    lessons_summary = [
        {
            "title": l.title,
            "objectives": l.objectives,
            "content_preview": l.content_markdown[:500] if l.content_markdown else "",
        }
        for l in ctx.lessons
    ]

    messages = quiz.build_messages(
        course_title=ctx.outline.title,
        lessons_summary=lessons_summary,
        tier=ctx.tier,
    )

    try:
        result = await client.completion_json(
            messages=messages,
            model=settings.LLM_FAST_MODEL,
            temperature=0.7,
            max_tokens=4096,
        )

        ctx.quiz_data = result if isinstance(result, list) else []
        quiz_count = sum(len(entry.get("questions", [])) for entry in ctx.quiz_data)

        yield sse_event("status", {
            "stage": "quiz",
            "message": f"Quiz Master complete: {quiz_count} questions prepared",
        })

    except Exception as e:
        logger.error("Quiz agent failed: %s", str(e))
        # Non-fatal
        ctx.quiz_data = []
        yield sse_event("status", {
            "stage": "quiz",
            "message": "Quiz generation skipped (non-fatal error)",
        })


async def run_pipeline(ctx: PipelineContext) -> AsyncGenerator[str, None]:
    """Run the full 4-agent course generation pipeline.

    Yields SSE event strings for the entire generation process.
    """
    from server.llm.streaming import sse_event

    try:
        # Agent 1: Generate outline
        async for event in agent_outline(ctx):
            yield event

        if not ctx.outline or not ctx.outline.lessons:
            yield sse_event("error", {"message": "Failed to generate course outline"})
            return

        # Agent 2: Generate lesson content (streamed)
        async for event in agent_lessons(ctx):
            yield event

        # Agent 3: Generate exercises
        async for event in agent_exercises(ctx):
            yield event

        # Agent 4: Generate quizzes
        async for event in agent_quiz(ctx):
            yield event

        yield sse_event("status", {"stage": "saving", "message": "Inscribing course into the archives..."})

    except Exception as e:
        logger.error("Pipeline error: %s", str(e))
        yield sse_event("error", {"message": f"Pipeline failed: {str(e)}"})
        raise
