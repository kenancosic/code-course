"""SSE streaming utilities for FastAPI."""
import json
import logging
from typing import AsyncGenerator

from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)


def sse_event(event: str, data: dict) -> str:
    """Format a single SSE event string.

    Args:
        event: Event type (e.g., 'status', 'chunk', 'complete', 'error')
        data: JSON-serializable data dict

    Returns:
        Formatted SSE string with event type and data.
    """
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def sse_response(generator: AsyncGenerator[str, None]) -> StreamingResponse:
    """Create a FastAPI StreamingResponse for SSE.

    Args:
        generator: Async generator yielding SSE-formatted strings.

    Returns:
        StreamingResponse with text/event-stream content type.
    """
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
