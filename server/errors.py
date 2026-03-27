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
}


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
