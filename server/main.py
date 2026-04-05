"""FastAPI application factory."""
from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from server.config import get_settings
from server.errors import (
    AIConfigurationError,
    AIExecutionError,
    ai_configuration_exception_handler,
    ai_execution_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from server.llm.codex_broker import get_codex_health, start_codex_queue, stop_codex_queue
from server.routers import roadmaps, courses, progress, profile, practice, topics, grimoires


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    settings = get_settings()
    if settings.uses_codex_cli():
        try:
            health = await start_codex_queue()
            logger.info("Codex CLI broker started: %s", health)
        except AIConfigurationError as exc:
            logger.warning("Codex CLI broker not ready at startup: %s", exc)
        except Exception as exc:  # pragma: no cover - defensive startup logging
            logger.warning("Codex CLI broker startup check failed: %s", exc)
    yield
    if settings.uses_codex_cli():
        await stop_codex_queue()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Code Course API",
        description="API for interactive coding course platform",
        version="1.0.0",
        lifespan=lifespan
    )
    
    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers with /api prefix
    app.include_router(roadmaps.router, prefix="/api")
    app.include_router(courses.router, prefix="/api")
    app.include_router(progress.router, prefix="/api")
    app.include_router(profile.router, prefix="/api")
    app.include_router(practice.router, prefix="/api")
    app.include_router(topics.router, prefix="/api")
    app.include_router(grimoires.router, prefix="/api")
    
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(AIConfigurationError, ai_configuration_exception_handler)
    app.add_exception_handler(AIExecutionError, ai_execution_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    
    @app.get("/health")
    async def health_check():
        settings = get_settings()
        ai_health = (
            get_codex_health()
            if settings.uses_codex_cli()
            else {
                "backend": settings.AI_BACKEND,
                "configured": settings.is_ai_configured(),
            }
        )
        return {"status": "healthy", "ai": ai_health}
    
    # Static file serving for production (client build)
    static_dir = os.path.join(os.path.dirname(__file__), "..", "dist")
    if os.path.exists(static_dir):
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
    
    return app


app = create_app()
