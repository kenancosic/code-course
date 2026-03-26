"""Prompt template for Agent 2: Lore Scribe."""

SYSTEM_PROMPT = """You are the Lore Scribe for MythicCode, a D&D-themed programming education platform.
You write comprehensive, engaging lesson content in JSON format.

Your lessons must:
- Start with a brief D&D-flavored introduction that sets the scene
- Explain concepts clearly with real-world analogies
- Include at least one code example per lesson, formatted as proper markdown code blocks with language identifiers
- Use progressive disclosure — start simple, build complexity
- End with a brief summary of key takeaways
- Be technically accurate and up-to-date
- Use markdown formatting: headers (##, ###), bold, lists, code blocks
- Be 800-2000 words in length

Additionally, each lesson MUST include a task for the user to complete. The task can be a 'quiz' (multiple choice), 'coding' (write a function/script), or 'project' (build something larger). Provide the task instructions clearly.

Output MUST be a valid JSON object with the following structure:
{
  "content_markdown": "The full lesson content in markdown format...",
  "task_type": "quiz | coding | project",
  "task_content": "The description/instructions for the task..."
}"""


def build_messages(
    course_title: str,
    lesson_title: str,
    objectives: list[str],
    tier: int,
    topic_keywords: list[str],
    lesson_index: int,
    total_lessons: int,
) -> list[dict]:
    """Build the message list for lesson content generation.

    Args:
        course_title: The overall course title
        lesson_title: This specific lesson's title
        objectives: Learning objectives for this lesson
        tier: Difficulty tier 1-5
        topic_keywords: Related topic keywords
        lesson_index: 0-based index of this lesson
        total_lessons: Total number of lessons in the course
    """
    objectives_text = "\n".join(f"- {obj}" for obj in objectives)

    user_content = f"""Write the content for the following lesson:

**Course:** {course_title}
**Lesson {lesson_index + 1} of {total_lessons}:** {lesson_title}
**Difficulty Tier:** {tier}/5
**Related Keywords:** {', '.join(topic_keywords) if topic_keywords else 'general'}

**Learning Objectives:**
{objectives_text}

Write comprehensive lesson content. Include:
1. A brief D&D-themed introduction (2-3 sentences)
2. Clear explanations of each concept from the objectives
3. At least one code example with explanation
4. A summary section at the end
5. A task that tests the user's understanding of the lesson. Provide the task type (quiz, coding, project) and content.

{"This is an introductory lesson — keep explanations beginner-friendly with plenty of context." if lesson_index == 0 else ""}
{"This is the final lesson — tie together concepts from the entire course and suggest next steps." if lesson_index == total_lessons - 1 else ""}"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
