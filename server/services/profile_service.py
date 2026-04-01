"""Profile service — business logic for user profiles, stats, and activity."""

from typing import List, Optional

from sqlalchemy.orm import Session

from server.models import (
    Achievement,
    Course,
    CourseEnrollment,
    RoadmapPath,
    UserAchievement,
    UserProgress,
    UserProfile,
)
from server.services import course_service, progression_service


def get_profile_with_stats(db: Session) -> dict:
    """Get full user profile with computed stats."""
    profile = progression_service.get_or_create_profile(db)
    snapshot = progression_service.progress_snapshot(profile.total_xp)

    if profile.level != snapshot.current_level:
        profile.level = snapshot.current_level
        db.commit()

    quests_completed = (
        db.query(UserProgress)
        .filter(UserProgress.user_id == profile.id)
        .count()
    )

    current_path = None
    if profile.current_path_id:
        path = db.query(RoadmapPath).filter(RoadmapPath.id == profile.current_path_id).first()
        if path:
            current_path = {"id": path.id, "title": path.title}

    skills = get_skill_levels(db)
    recent_activity = get_recent_activity(db, limit=5)

    return {
        "id": profile.id,
        "display_name": profile.display_name or "Coder",
        "avatar_seed": profile.avatar_seed or "Felix",
        "level": snapshot.current_level,
        "title": snapshot.title,
        "total_xp": profile.total_xp,
        "xp_to_next_level": snapshot.xp_to_next_level,
        "quests_completed": quests_completed,
        "current_path": current_path,
        "skills": skills,
        "recent_activity": recent_activity,
    }


def update_profile(
    db: Session,
    display_name: Optional[str] = None,
    avatar_seed: Optional[str] = None,
    current_path_id: Optional[int] = None,
):
    """Update user profile fields."""
    profile = progression_service.get_or_create_profile(db)

    if display_name is not None:
        profile.display_name = display_name

    if avatar_seed is not None:
        profile.avatar_seed = avatar_seed

    if current_path_id is not None:
        path = db.query(RoadmapPath).filter(RoadmapPath.id == current_path_id).first()
        if path:
            profile.current_path_id = current_path_id

    db.commit()
    db.refresh(profile)
    return profile


def get_achievements_with_status(db: Session) -> List[dict]:
    """Get all achievements with unlock status for the user."""
    profile = progression_service.get_or_create_profile(db)
    unlocked = {
        ua.achievement_id: ua
        for ua in db.query(UserAchievement)
        .filter(UserAchievement.user_id == profile.id)
        .all()
    }

    achievements = db.query(Achievement).all()
    result = []

    for achievement in achievements:
        user_achievement = unlocked.get(achievement.id)
        result.append(
            {
                "id": achievement.id,
                "title": achievement.title,
                "description": achievement.description,
                "icon": achievement.icon,
                "category": achievement.category,
                "unlocked": achievement.id in unlocked,
                "unlocked_at": user_achievement.unlocked_at if user_achievement else None,
            }
        )

    return result


def get_skill_levels(db: Session) -> List[dict]:
    """Get skill levels per topic area based on completed lessons."""
    profile = progression_service.get_or_create_profile(db)
    paths = db.query(RoadmapPath).all()

    skills = []
    for path in paths:
        topic_ids = [node.topic_id for node in path.nodes if node.topic_id]
        if not topic_ids:
            continue

        course_ids = [
            course.id
            for course in db.query(Course)
            .join(CourseEnrollment, CourseEnrollment.course_id == Course.id)
            .filter(
                Course.topic_id.in_(topic_ids),
                CourseEnrollment.user_id == profile.id,
            )
            .all()
        ]
        if not course_ids:
            continue

        progress_entries = (
            db.query(UserProgress)
            .filter(
                UserProgress.user_id == profile.id,
                UserProgress.course_id.in_(course_ids),
            )
            .all()
        )

        total_xp = sum(entry.xp_earned for entry in progress_entries)
        lessons_completed = len(progress_entries)
        if lessons_completed == 0:
            continue

        skill_level = min(lessons_completed // 5 + 1, 50)
        skills.append(
            {
                "name": path.title,
                "level": skill_level,
                "xp": total_xp,
            }
        )

    skills.sort(key=lambda item: item["xp"], reverse=True)
    return skills


def get_recent_activity(db: Session, limit: int = 20) -> List[dict]:
    """Get recent activity feed from user progress entries."""
    profile = progression_service.get_or_create_profile(db)
    progress_entries = (
        db.query(UserProgress)
        .filter(UserProgress.user_id == profile.id)
        .order_by(UserProgress.completed_at.desc())
        .limit(limit)
        .all()
    )

    activity = []
    for entry in progress_entries:
        lesson = entry.lesson
        course = entry.course

        description = f'Completed lesson "{lesson.title}"'
        if course:
            description += f" in {course.title}"

        activity.append(
            {
                "id": entry.id,
                "type": "lesson_completed",
                "description": description,
                "xp_earned": entry.xp_earned,
                "timestamp": entry.completed_at.isoformat() if entry.completed_at else None,
            }
        )

    return activity


def add_xp(db: Session, xp_amount: int) -> UserProfile:
    """Add XP to the user's profile and recalculate level."""
    profile = progression_service.get_or_create_profile(db)
    profile.total_xp += xp_amount
    profile.level = progression_service.calculate_level(profile.total_xp)
    db.commit()
    db.refresh(profile)
    return profile


def record_lesson_completion(
    db: Session,
    lesson_id: int,
    course_id: int,
    xp_earned: int,
) -> UserProgress:
    """Record a lesson completion and update profile XP."""
    profile = progression_service.get_or_create_profile(db)
    existing = (
        db.query(UserProgress)
        .filter(
            UserProgress.user_id == profile.id,
            UserProgress.lesson_id == lesson_id,
        )
        .first()
    )
    if existing:
        return existing

    course_service.ensure_course_enrollment(db, course_id, user_id=profile.id)
    progress = UserProgress(
        user_id=profile.id,
        lesson_id=lesson_id,
        course_id=course_id,
        xp_earned=xp_earned,
    )
    db.add(progress)
    add_xp(db, xp_earned)
    db.commit()
    db.refresh(progress)
    return progress


def check_achievement_unlocks(db: Session) -> List[Achievement]:
    """Check and unlock any achievements that have been earned."""
    profile = progression_service.get_or_create_profile(db)
    unlocked = []
    unlocked_ids = {
        ua.achievement_id
        for ua in db.query(UserAchievement)
        .filter(UserAchievement.user_id == profile.id)
        .all()
    }
    achievements = db.query(Achievement).all()

    for achievement in achievements:
        if achievement.id in unlocked_ids:
            continue

        should_unlock = False
        if achievement.trigger_type == "xp":
            should_unlock = profile.total_xp >= (achievement.trigger_value or 0)
        elif achievement.trigger_type == "lessons":
            lesson_count = (
                db.query(UserProgress)
                .filter(UserProgress.user_id == profile.id)
                .count()
            )
            should_unlock = lesson_count >= (achievement.trigger_value or 0)
        elif achievement.trigger_type == "level":
            should_unlock = profile.level >= (achievement.trigger_value or 0)

        if should_unlock:
            db.add(
                UserAchievement(
                    user_id=profile.id,
                    achievement_id=achievement.id,
                )
            )
            unlocked.append(achievement)

    if unlocked:
        db.commit()

    return unlocked
