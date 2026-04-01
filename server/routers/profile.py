"""Profile API endpoints."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from server.database import get_db
from server.schemas.progress import (
    AchievementResponse,
    ActivityListResponse,
    ProfileResponse,
    ProfileUpdateRequest,
    ProfileUpdateResponse,
    SkillsListResponse,
)
from server.services import profile_service

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/", response_model=ProfileResponse)
async def get_profile(db: Session = Depends(get_db)):
    """Get the current local profile with stats, skills, and recent activity."""
    return profile_service.get_profile_with_stats(db)


@router.put("/", response_model=ProfileUpdateResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update the current local profile's display name, avatar seed, and/or current path."""
    profile = profile_service.update_profile(
        db,
        display_name=request.display_name,
        avatar_seed=request.avatar_seed,
        current_path_id=request.current_path_id,
    )
    return profile


@router.get("/achievements", response_model=List[AchievementResponse])
async def get_achievements(db: Session = Depends(get_db)):
    """List all achievements with current-user unlock status."""
    achievements = profile_service.get_achievements_with_status(db)
    return achievements


@router.get("/skills", response_model=SkillsListResponse)
async def get_skills(db: Session = Depends(get_db)):
    """Get current-user skill levels per topic area."""
    skills = profile_service.get_skill_levels(db)
    return {"skills": skills}


@router.get("/activity", response_model=ActivityListResponse)
async def get_activity(
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Get the current user's recent activity feed (last N activities)."""
    if limit < 1:
        limit = 1
    if limit > 100:
        limit = 100
    
    activities = profile_service.get_recent_activity(db, limit=limit)
    return {"activities": activities}
