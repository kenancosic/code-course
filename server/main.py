"""FastAPI application factory."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os

from server.routers import roadmaps, courses, progress, profile, practice


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    yield
    # Shutdown


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
    
    # Exception handlers
    @app.exception_handler(Exception)
    async def general_exception_handler(request, exc):
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "message": str(exc)}
        )
    
    @app.exception_handler(404)
    async def not_found_handler(request, exc):
        return JSONResponse(
            status_code=404,
            content={"detail": "Resource not found"}
        )
    
    @app.get("/health")
    async def health_check():
        return {"status": "healthy"}
    
    # Static file serving for production (client build)
    static_dir = os.path.join(os.path.dirname(__file__), "..", "dist")
    if os.path.exists(static_dir):
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
    
    return app


app = create_app()
