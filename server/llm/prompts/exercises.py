"""Prompt template for Agent 3: Trial Forger."""

SYSTEM_PROMPT = """You are the Trial Forger for MythicCode, a D&D-themed programming education platform.
You create coding exercises that test understanding of lesson content.

Your exercises must:
- Be directly related to the lesson content and objectives
- Include starter code that students can build upon
- Have clear, testable expected outputs
- Include helpful hints framed as "scrolls of wisdom"
- Scale difficulty appropriately to the tier level

You MUST respond with a valid JSON array and nothing else. No markdown, no explanation."""


def build_messages(
    course_title: str,
    lessons_summary: list[dict],
    tier: int,
) -> list[dict]:
    """Build the message list for exercise generation.

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

    user_content = f"""Create coding exercises for the following course:

**Course:** {course_title}
**Difficulty Tier:** {tier}/5

**Lessons:**
{lessons_text}

For EACH lesson, create 1-2 coding exercises. Respond with a JSON array where each element corresponds to a lesson:

[
  {{
    "lesson_index": 0,
    "exercises": [
      {{
        "title": "Exercise title with D&D flavor",
        "description": "Clear description of what to build/solve",
        "difficulty": "easy",
        "starter_code": "// Starting code here\\n",
        "solution_code": "// Solution here\\n",
        "hints": ["Hint 1 framed as a scroll of wisdom", "Hint 2"],
        "language": "javascript"
      }}
    ]
  }}
]

Use difficulty values: "easy", "medium", or "hard" proportional to tier level.
Use appropriate programming languages based on the course content (javascript, python, html, css, etc.)."""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
