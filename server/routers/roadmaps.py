"""Roadmap API endpoints."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from server.database import get_db
from server.models import RoadmapPath
from server.schemas.roadmap import RoadmapPathResponse
from server.services import progression_service

router = APIRouter(prefix="/roadmaps", tags=["roadmaps"])


@router.get("/", response_model=List[RoadmapPathResponse])
async def list_roadmaps(db: Session = Depends(get_db)):
    """Get all public roadmap paths plus the current user's custom paths."""
    profile = progression_service.get_or_create_profile(db)
    paths = (
        db.query(RoadmapPath)
        .filter(
            RoadmapPath.is_locked == False,  # noqa: E712
            or_(RoadmapPath.user_id.is_(None), RoadmapPath.user_id == profile.id),
        )
        .all()
    )
    return paths


@router.get("/{path_id}", response_model=RoadmapPathResponse)
async def get_roadmap(path_id: int, db: Session = Depends(get_db)):
    """Get a public roadmap path or one owned by the current user."""
    profile = progression_service.get_or_create_profile(db)
    path = (
        db.query(RoadmapPath)
        .filter(
            RoadmapPath.id == path_id,
            RoadmapPath.is_locked == False,  # noqa: E712
            or_(RoadmapPath.user_id.is_(None), RoadmapPath.user_id == profile.id),
        )
        .first()
    )
    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Roadmap path {path_id} not found"
        )
    return path
