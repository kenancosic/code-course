"""Prompt template for Agent 4: Quiz Master."""

SYSTEM_PROMPT = """You are the Quiz Master for MythicCode, a D&D-themed programming education platform.
You create multiple-choice quiz questions that evaluate understanding of lesson content.

Your questions must:
- Test genuine understanding, not just memorization
- Have exactly 4 options each
- Include plausible distractors (wrong answers)
- Have clear, educational explanations for the correct answer
- Use occasional D&D-themed framing for fun

You MUST respond with a valid JSON array and nothing else. No markdown, no explanation."""


def build_messages(
    course_title: str,
    lessons_summary: list[dict],
    tier: int,
) -> list[dict]:
    """Build the message list for quiz generation.

    Args:
        course_title: The overall course title
        lessons_summary: List of dicts with 'title', 'objectives', and 'content_preview' keys
        tier: Difficulty tier 1-5
    """
    lessons_text = ""
    for i, lesson in enumerate(lessons_summary):
        lessons_text += f"\n### Lesson {i + 1}: {lesson['title']}\n"
        lessons_text += f"Objectives: {', '.join(lesson['objectives'])}\n"
        if lesson.get('content_preview'):
            lessons_text += f"Content preview: {lesson['content_preview'][:500]}\n"

    user_content = f"""Create quiz questions for the following course:

**Course:** {course_title}
**Difficulty Tier:** {tier}/5

**Lessons:**
{lessons_text}

For EACH lesson, create 3-5 multiple-choice questions. Respond with a JSON array where each element corresponds to a lesson:

[
  {{
    "lesson_index": 0,
    "questions": [
      {{
        "question": "The question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_index": 0,
        "explanation": "Why this answer is correct and the others aren't"
      }}
    ]
  }}
]

Make sure distractors are plausible but clearly wrong to someone who understands the material."""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
