"""Shared API error helpers and exception handlers."""

from __future__ import annotations

from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.requests import Request


DEFAULT_ERROR_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "RESOURCE_NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    500: "INTERNAL_ERROR",
    503: "SERVICE_UNAVAILABLE",
}


class AIConfigurationError(RuntimeError):
    """Raised when an AI-backed feature is requested without a configured provider."""


class AIExecutionError(RuntimeError):
    """Raised when the configured AI backend cannot complete a request."""

    def __init__(self, message: str, details: object | None = None) -> None:
        super().__init__(message)
        self.details = details


async def ai_configuration_exception_handler(
    _: Request, exc: AIConfigurationError
) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content=error_payload(
            "AI_NOT_CONFIGURED",
            str(exc) or "Local Codex is not configured for this environment.",
        ),
    )


async def ai_execution_exception_handler(
    _: Request, exc: AIExecutionError
) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content=error_payload(
            "AI_UNAVAILABLE",
            str(exc) or "Local Codex is unavailable or returned invalid output.",
            exc.details,
        ),
    )


def error_payload(code: str, message: str, details: object | None = None) -> dict:
    payload = {
        "code": code,
        "message": message,
    }
    if details is not None:
        payload["details"] = details
    return payload


def api_error(
    status_code: int,
    message: str,
    *,
    code: str | None = None,
    details: object | None = None,
) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail=error_payload(
            code or DEFAULT_ERROR_CODES.get(status_code, "API_ERROR"),
            message,
            details,
        ),
    )


async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and "message" in exc.detail:
        payload = exc.detail
    else:
        payload = error_payload(
            DEFAULT_ERROR_CODES.get(exc.status_code, "API_ERROR"),
            str(exc.detail),
        )

    return JSONResponse(status_code=exc.status_code, content=payload)


async def validation_exception_handler(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=error_payload(
            "VALIDATION_ERROR",
            "Request validation failed",
            exc.errors(),
        ),
    )


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=error_payload("INTERNAL_ERROR", "Internal server error", str(exc)),
    )
