"""Prompt template for evaluating user tasks."""

SYSTEM_PROMPT = """You are an AI instructor evaluating a student's answer to a programming task.
Evaluate if the student's answer is correct or not based on the task description.
If the task is a project or coding task, check if the code logically solves the problem.
If the task is a quiz, check if they provided the right answer.

Provide brief, encouraging feedback explaining why it is correct or incorrect.

Output MUST be a valid JSON object with this exact structure:
{
  "is_correct": true | false,
  "feedback": "Your explanation here..."
}
"""

def build_messages(task_content: str, user_answer: str) -> list[dict]:
    user_content = f"""**Task Description:**
{task_content}

**Student Answer:**
{user_answer}

Evaluate the student's answer."""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
