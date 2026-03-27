"""Profile API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from server.database import get_db
from server.services import profile_service

router = APIRouter(prefix="/profile", tags=["profile"])


# Request/Response Schemas
class CurrentPathResponse(BaseModel):
    id: int
    title: str


class SkillResponse(BaseModel):
    name: str
    level: int
    xp: int


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    type: str
    description: str
    xp_earned: int
    timestamp: Optional[str] = None


class ProfileResponse(BaseModel):
    id: int
    display_name: str
    avatar_seed: str
    level: int
    title: str
    total_xp: int
    xp_to_next_level: int
    quests_completed: int
    current_path: Optional[CurrentPathResponse] = None
    skills: List[SkillResponse]
    recent_activity: List[ActivityResponse]


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    avatar_seed: Optional[str] = None
    current_path_id: Optional[int] = None


class ProfileUpdateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    display_name: Optional[str] = None
    avatar_seed: str
    total_xp: int
    level: int
    current_path_id: Optional[int] = None


class AchievementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    unlocked: bool
    unlocked_at: Optional[str] = None


class SkillsListResponse(BaseModel):
    skills: List[SkillResponse]


class ActivityListResponse(BaseModel):
    activities: List[ActivityResponse]


@router.get("/", response_model=ProfileResponse)
async def get_profile(db: Session = Depends(get_db)):
    """Get full user profile with stats, skills, and recent activity."""
    return profile_service.get_profile_with_stats(db)


@router.put("/", response_model=ProfileUpdateResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update display name, avatar seed, and/or current path."""
    profile = profile_service.update_profile(
        db,
        display_name=request.display_name,
        avatar_seed=request.avatar_seed,
        current_path_id=request.current_path_id,
    )
    return profile


@router.get("/achievements", response_model=List[AchievementResponse])
async def get_achievements(db: Session = Depends(get_db)):
    """List all achievements with unlock status."""
    achievements = profile_service.get_achievements_with_status(db)
    return achievements


@router.get("/skills", response_model=SkillsListResponse)
async def get_skills(db: Session = Depends(get_db)):
    """Get skill levels per topic area (aggregated from completed courses)."""
    skills = profile_service.get_skill_levels(db)
    return {"skills": skills}


@router.get("/activity", response_model=ActivityListResponse)
async def get_activity(
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Get recent activity feed (last N activities)."""
    if limit < 1:
        limit = 1
    if limit > 100:
        limit = 100
    
    activities = profile_service.get_recent_activity(db, limit=limit)
    return {"activities": activities}
