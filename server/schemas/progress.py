"""Live single-user profile and progress schemas."""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


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
    skills: List[SkillResponse] = Field(default_factory=list)
    recent_activity: List[ActivityResponse] = Field(default_factory=list)


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


class AchievementUnlockResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None


class SkillsListResponse(BaseModel):
    skills: List[SkillResponse] = Field(default_factory=list)


class ActivityListResponse(BaseModel):
    activities: List[ActivityResponse] = Field(default_factory=list)


class CompleteLessonRequest(BaseModel):
    lesson_id: int
    course_id: int
    time_spent_seconds: int = 0


class CompleteLessonResponse(BaseModel):
    xp_earned: int
    total_xp: int
    level_before: int
    level_after: int
    xp_to_next_level: int
    new_achievements: List[AchievementUnlockResponse] = Field(default_factory=list)
    node_completed: bool


class ProgressSummaryResponse(BaseModel):
    total_lessons_completed: int
    total_courses_completed: int
    total_xp: int
    current_level: int
    current_level_xp: int
    xp_to_next_level: int
    level_progress_percentage: int
    streak_days: int


class RoadmapProgressResponse(BaseModel):
    path_id: int
    completed_nodes: int
    total_nodes: int
    completion_percentage: float


class LessonProgressItem(BaseModel):
    lesson_id: int
    title: str
    completed: bool
    xp_reward: int


class CourseProgressResponse(BaseModel):
    course_id: int
    course_title: str
    completed_lessons: int
    total_lessons: int
    completion_percentage: float
    total_xp: int
    lessons: List[LessonProgressItem] = Field(default_factory=list)
