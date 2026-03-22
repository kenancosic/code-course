"""User progress and achievement schemas."""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class UserProfileBase(BaseModel):
    username: str
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileResponse(UserProfileBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime


class UserProgressBase(BaseModel):
    user_id: int
    lesson_id: int
    is_completed: bool = False
    completion_percentage: float = 0.0


class UserProgressCreate(UserProgressBase):
    pass


class UserProgressResponse(UserProgressBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    completed_at: Optional[datetime] = None


class AchievementBase(BaseModel):
    title: str
    description: str
    icon_url: Optional[str] = None
    requirement: str


class AchievementResponse(AchievementBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    earned_at: Optional[datetime] = None
