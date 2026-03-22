"""LLM client wrapper using litellm with OpenRouter."""
import json
import logging
from typing import AsyncGenerator

import litellm

from server.config import get_settings

logger = logging.getLogger(__name__)

# Suppress litellm's verbose logging
litellm.suppress_debug_info = True


async def completion(
    messages: list[dict],
    model: str | None = None,
    stream: bool = False,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    response_format: dict | None = None,
    **kwargs,
):
    """Send a completion request through litellm -> OpenRouter.

    Args:
        messages: Chat messages list
        model: Model identifier (defaults to LLM_DEFAULT_MODEL)
        stream: Whether to stream the response
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate
        response_format: Optional JSON response format
        **kwargs: Additional litellm parameters

    Returns:
        If stream=False: litellm ModelResponse
        If stream=True: AsyncGenerator yielding chunks
    """
    settings = get_settings()
    resolved_model = model or settings.LLM_DEFAULT_MODEL

    # Prepend openrouter/ prefix if not already present
    if not resolved_model.startswith("openrouter/"):
        resolved_model = f"openrouter/{resolved_model}"

    params = {
        "model": resolved_model,
        "messages": messages,
        "stream": stream,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "api_key": settings.OPENROUTER_API_KEY,
        **kwargs,
    }
    if response_format:
        params["response_format"] = response_format

    logger.info("LLM request: model=%s stream=%s tokens=%d", resolved_model, stream, max_tokens)

    try:
        response = await litellm.acompletion(**params)
        return response
    except Exception as e:
        logger.error("LLM error: %s", str(e))
        raise


async def completion_text(
    messages: list[dict],
    model: str | None = None,
    **kwargs,
) -> str:
    """Convenience: get the text content from a non-streaming completion."""
    response = await completion(messages, model=model, stream=False, **kwargs)
    return response.choices[0].message.content


async def completion_json(
    messages: list[dict],
    model: str | None = None,
    **kwargs,
) -> dict:
    """Convenience: get parsed JSON from a non-streaming completion.

    Attempts to parse the response as JSON, falling back to extracting
    JSON from markdown code blocks if needed.
    """
    text = await completion_text(messages, model=model, **kwargs)

    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code block
    if "```json" in text:
        start = text.index("```json") + 7
        end = text.index("```", start)
        return json.loads(text[start:end].strip())

    if "```" in text:
        start = text.index("```") + 3
        # Skip language identifier on same line
        newline = text.index("\n", start)
        end = text.index("```", newline)
        return json.loads(text[newline:end].strip())

    raise ValueError(f"Could not parse JSON from LLM response: {text[:200]}...")


async def stream_completion(
    messages: list[dict],
    model: str | None = None,
    **kwargs,
) -> AsyncGenerator[str, None]:
    """Stream text chunks from a completion.

    Yields:
        String chunks of the generated content.
    """
    response = await completion(messages, model=model, stream=True, **kwargs)
    async for chunk in response:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content
