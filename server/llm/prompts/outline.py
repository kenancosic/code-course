"""Prompt template for Agent 1: Outline Architect."""

SYSTEM_PROMPT = """You are the Outline Architect for MythicCode, a D&D-themed programming education platform. 
You create structured course outlines that transform technical topics into epic quest narratives.

Your outlines must:
- Contain 4-8 lessons that progress from foundational to advanced
- Use D&D quest terminology for lesson titles (e.g., "The First Incantation", "Forging the Sacred Component")
- Include clear learning objectives for each lesson
- Calibrate difficulty based on the tier level (1=beginner, 5=expert)

You MUST respond with a valid JSON object and nothing else. No markdown, no explanation."""


def build_messages(topic: str, description: str, tier: int, keywords: list[str]) -> list[dict]:
    """Build the message list for outline generation.

    Args:
        topic: The roadmap node title (e.g., "CSS Basics")
        description: The roadmap node description
        tier: Difficulty tier 1-5
        keywords: Topic keywords from the roadmap node
    """
    user_content = f"""Create a course outline for the following topic:

**Topic:** {topic}
**Description:** {description}
**Difficulty Tier:** {tier}/5
**Related Keywords:** {', '.join(keywords) if keywords else 'general'}

Respond with a JSON object in this exact format:
{{
  "title": "A D&D-themed course title",
  "description": "A brief 1-2 sentence course description with D&D flavor",
  "lessons": [
    {{
      "title": "Lesson title with D&D flavor",
      "objectives": ["Learning objective 1", "Learning objective 2"],
      "estimated_minutes": 15
    }}
  ]
}}

Generate between 4 and 8 lessons. Each lesson should have 2-4 learning objectives.
The lessons should progress logically from foundational concepts to more advanced applications."""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
