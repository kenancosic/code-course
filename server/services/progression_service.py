"""Shared progression rules for XP, levels, and profile state."""

from __future__ import annotations

import math
from dataclasses import dataclass

from sqlalchemy.orm import Session

from server.models import UserProfile


LEVEL_TITLES = [
    (1, "Novice Coder"),
    (5, "Script Apprentice"),
    (10, "Frontend Mage"),
    (20, "Backend Sage"),
    (35, "Fullstack Knight"),
    (50, "System Architect"),
    (75, "Code Legend"),
    (100, "Mythic Developer"),
]


@dataclass(frozen=True)
class ProgressSnapshot:
    current_level: int
    current_level_xp: int
    xp_to_next_level: int
    level_progress_percentage: int
    title: str


def xp_threshold_for_level(level: int) -> int:
    """Total XP required to reach the given level."""
    if level <= 1:
        return 0
    return int(100 * math.pow(level, 1.5))


def get_level_title(level: int) -> str:
    title = LEVEL_TITLES[0][1]
    for min_level, level_title in LEVEL_TITLES:
        if level >= min_level:
            title = level_title
    return title


def calculate_level(total_xp: int) -> int:
    level = 1
    while xp_threshold_for_level(level + 1) <= total_xp:
        level += 1
    return level


def progress_snapshot(total_xp: int) -> ProgressSnapshot:
    current_level = calculate_level(total_xp)
    current_floor = xp_threshold_for_level(current_level)
    next_floor = xp_threshold_for_level(current_level + 1)
    current_level_xp = total_xp - current_floor
    xp_span = max(next_floor - current_floor, 1)
    xp_to_next_level = next_floor - total_xp
    level_progress_percentage = round((current_level_xp / xp_span) * 100)

    return ProgressSnapshot(
        current_level=current_level,
        current_level_xp=current_level_xp,
        xp_to_next_level=xp_to_next_level,
        level_progress_percentage=level_progress_percentage,
        title=get_level_title(current_level),
    )


def get_or_create_profile(db: Session) -> UserProfile:
    profile = db.query(UserProfile).first()
    if not profile:
        profile = UserProfile(
            display_name="Adventurer",
            avatar_seed="Felix",
            total_xp=0,
            level=1,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def get_current_profile_id(db: Session) -> int:
    return get_or_create_profile(db).id
