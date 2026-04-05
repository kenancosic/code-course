"""Shared LLM client with local Codex CLI default and optional OpenAI fallback."""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncGenerator

try:
    import litellm
except ImportError:  # pragma: no cover - exercised in local test environments
    litellm = None

from server.config import get_settings
from server.errors import AIConfigurationError
from server.llm.codex_broker import CodexJob, OutputKind, get_codex_queue

logger = logging.getLogger(__name__)

# Suppress litellm's verbose logging
if litellm is not None:
    litellm.suppress_debug_info = True


def _normalize_temperature(
    model: str,
    temperature: float | None,
    reasoning_effort: str | None,
) -> float | None:
    """Adjust temperature for model families with stricter parameter support."""
    if temperature is None or not model.startswith("gpt-5"):
        return temperature

    # LiteLLM/OpenAI currently only accept temperature=1 for GPT-5 models,
    # except GPT-5.1 when reasoning is disabled.
    if model.startswith("gpt-5.1") and (reasoning_effort is None or reasoning_effort == "none"):
        return temperature

    if temperature != 1:
        logger.info(
            "Overriding unsupported temperature=%s to 1 for model=%s reasoning_effort=%s",
            temperature,
            model,
            reasoning_effort,
        )
    return 1


def _serialize_message_content(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        chunks: list[str] = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text") or item.get("content")
                if text:
                    chunks.append(str(text))
            elif item:
                chunks.append(str(item))
        return "\n".join(chunks)
    return json.dumps(content, ensure_ascii=False, indent=2)


def _render_codex_prompt(messages: list[dict]) -> str:
    transcript: list[str] = []
    for message in messages:
        role = str(message.get("role", "user")).upper()
        content = _serialize_message_content(message.get("content", ""))
        transcript.append(f"[{role}]\n{content.strip()}")
    return "\n\n".join(part for part in transcript if part.strip())


def _resolve_codex_timeout(kwargs: dict[str, Any]) -> int:
    settings = get_settings()
    timeout_seconds = kwargs.get("timeout_seconds")
    return int(timeout_seconds or settings.CODEX_TIMEOUT_SECONDS)


def _resolve_codex_output_kind(
    output_kind: OutputKind | None,
    response_format: dict | None,
) -> OutputKind:
    if output_kind:
        return output_kind
    if response_format and response_format.get("type") == "json_object":
        return "json_object"
    return "json_object"


async def _codex_completion_text(
    messages: list[dict],
    model: str | None,
    **kwargs,
) -> str:
    settings = get_settings()
    queue = get_codex_queue()
    prompt = _render_codex_prompt(messages)
    job = CodexJob(
        prompt=prompt,
        output_kind="text",
        timeout_seconds=_resolve_codex_timeout(kwargs),
        retry_count=int(kwargs.get("retry_count", settings.CODEX_MAX_RETRIES)),
        model=model or settings.LLM_DEFAULT_MODEL,
    )
    return await queue.submit(job)


async def _codex_completion_json(
    messages: list[dict],
    model: str | None,
    output_kind: OutputKind,
    **kwargs,
) -> Any:
    settings = get_settings()
    queue = get_codex_queue()
    prompt = _render_codex_prompt(messages)
    job = CodexJob(
        prompt=prompt,
        output_kind=output_kind,
        timeout_seconds=_resolve_codex_timeout(kwargs),
        retry_count=int(kwargs.get("retry_count", settings.CODEX_MAX_RETRIES)),
        model=model or settings.LLM_DEFAULT_MODEL,
    )
    return await queue.submit(job)


async def completion(
    messages: list[dict],
    model: str | None = None,
    stream: bool = False,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    response_format: dict | None = None,
    **kwargs,
):
    """Send a completion request through litellm -> OpenAI.

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
    if settings.uses_codex_cli():
        if stream:
            return stream_completion(messages, model=model, temperature=temperature, max_tokens=max_tokens, **kwargs)
        return await _codex_completion_text(messages, model=model, temperature=temperature, max_tokens=max_tokens, **kwargs)

    resolved_model = model or settings.LLM_DEFAULT_MODEL

    if not settings.OPENAI_API_KEY:
        raise AIConfigurationError(
            "AI is not configured. Set OPENAI_API_KEY to use this feature."
        )
    if litellm is None:
        raise RuntimeError("litellm is required for the OpenAI fallback backend.")

    reasoning_effort = kwargs.get("reasoning_effort", settings.LLM_REASONING_EFFORT)
    normalized_temperature = _normalize_temperature(
        resolved_model,
        temperature,
        reasoning_effort,
    )

    params = {
        "model": resolved_model,
        "messages": messages,
        "stream": stream,
        "temperature": normalized_temperature,
        "max_tokens": max_tokens,
        "api_key": settings.OPENAI_API_KEY,
        **kwargs,
    }
    if "reasoning_effort" not in params and settings.LLM_REASONING_EFFORT:
        params["reasoning_effort"] = settings.LLM_REASONING_EFFORT
    if response_format:
        params["response_format"] = response_format

    logger.info(
        "LLM request: model=%s stream=%s tokens=%d reasoning_effort=%s",
        resolved_model,
        stream,
        max_tokens,
        params.get("reasoning_effort"),
    )

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
    settings = get_settings()
    if settings.uses_codex_cli():
        return await _codex_completion_text(messages, model=model, **kwargs)

    response = await completion(messages, model=model, stream=False, **kwargs)
    return response.choices[0].message.content


async def completion_json(
    messages: list[dict],
    model: str | None = None,
    output_kind: OutputKind | None = None,
    **kwargs,
) -> Any:
    """Convenience: get parsed JSON from a non-streaming completion.

    Attempts to parse the response as JSON, falling back to extracting
    JSON from markdown code blocks if needed.
    """
    settings = get_settings()
    if settings.uses_codex_cli():
        response_format = kwargs.get("response_format")
        return await _codex_completion_json(
            messages,
            model=model,
            output_kind=_resolve_codex_output_kind(output_kind, response_format),
            **kwargs,
        )

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
    settings = get_settings()
    if settings.uses_codex_cli():
        yield await _codex_completion_text(messages, model=model, **kwargs)
        return

    response = await completion(messages, model=model, stream=True, **kwargs)
    async for chunk in response:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content
