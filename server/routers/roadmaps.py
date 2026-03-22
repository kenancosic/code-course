"""Roadmap API endpoints."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from server.schemas.roadmap import RoadmapPathResponse
from server.database import get_db
from server.models import RoadmapPath

router = APIRouter(prefix="/roadmaps", tags=["roadmaps"])


@router.get("/", response_model=List[RoadmapPathResponse])
async def list_roadmaps(db: Session = Depends(get_db)):
    """Get all published roadmap paths."""
    paths = db.query(RoadmapPath).filter(RoadmapPath.is_locked == False).all()
    return paths


@router.get("/{path_id}", response_model=RoadmapPathResponse)
async def get_roadmap(path_id: int, db: Session = Depends(get_db)):
    """Get a single roadmap path with all nodes and connections."""
    path = db.query(RoadmapPath).filter(
        RoadmapPath.id == path_id,
        RoadmapPath.is_locked == False
    ).first()
    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Roadmap path {path_id} not found"
        )
    return path
