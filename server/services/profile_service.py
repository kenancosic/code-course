"""Profile service — business logic for user profiles, stats, and activity."""
from typing import List, Optional

from sqlalchemy.orm import Session

from server.models import (
    UserProgress,
    UserProfile,
    Achievement,
    UserAchievement,
    Course,
    RoadmapPath,
)
from server.services import progression_service


def get_profile_with_stats(db: Session) -> dict:
    """Get full user profile with computed stats."""
    profile = progression_service.get_or_create_profile(db)
    snapshot = progression_service.progress_snapshot(profile.total_xp)

    if profile.level != snapshot.current_level:
        profile.level = snapshot.current_level
        db.commit()
    
    # Count completed quests (lessons)
    quests_completed = db.query(UserProgress).count()
    
    # Get current path info
    current_path = None
    if profile.current_path_id:
        path = db.query(RoadmapPath).filter(RoadmapPath.id == profile.current_path_id).first()
        if path:
            current_path = {"id": path.id, "title": path.title}
    
    # Get skills and recent activity
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
        # Validate path exists
        path = db.query(RoadmapPath).filter(RoadmapPath.id == current_path_id).first()
        if path:
            profile.current_path_id = current_path_id
    
    db.commit()
    db.refresh(profile)
    return profile


def get_achievements_with_status(db: Session) -> List[dict]:
    """Get all achievements with unlock status for the user."""
    # Get unlocked achievement IDs
    unlocked_ids = {
        ua.achievement_id for ua in db.query(UserAchievement).all()
    }
    
    achievements = db.query(Achievement).all()
    result = []
    
    for achievement in achievements:
        user_achievement = None
        if achievement.id in unlocked_ids:
            user_achievement = (
                db.query(UserAchievement)
                .filter(UserAchievement.achievement_id == achievement.id)
                .first()
            )
        
        result.append({
            "id": achievement.id,
            "title": achievement.title,
            "description": achievement.description,
            "icon": achievement.icon,
            "category": achievement.category,
            "unlocked": achievement.id in unlocked_ids,
            "unlocked_at": user_achievement.unlocked_at if user_achievement else None,
        })
    
    return result


def get_skill_levels(db: Session) -> List[dict]:
    """Get skill levels per topic area based on completed lessons.
    
    Skills are aggregated by roadmap path, with XP calculated from
    completed lessons in courses belonging to nodes in each path.
    """
    # Get all paths
    paths = db.query(RoadmapPath).all()
    
    skills = []
    for path in paths:
        # Get all nodes in this path
        topic_ids = [node.topic_id for node in path.nodes if node.topic_id]
        
        if not topic_ids:
            continue
        
        # Get all courses for these topics
        course_ids = [
            c.id for c in 
            db.query(Course).filter(Course.topic_id.in_(topic_ids)).all()
        ]
        
        if not course_ids:
            continue
        
        # Get all completed lessons in these courses
        progress_entries = (
            db.query(UserProgress)
            .filter(UserProgress.course_id.in_(course_ids))
            .all()
        )
        
        total_xp = sum(entry.xp_earned for entry in progress_entries)
        lessons_completed = len(progress_entries)
        
        if lessons_completed == 0:
            continue
        
        # Calculate skill level (1 level per 500 XP, max 50)
        skill_level = min(lessons_completed // 5 + 1, 50)
        
        skills.append({
            "name": path.title,
            "level": skill_level,
            "xp": total_xp,
        })
    
    # Sort by XP descending
    skills.sort(key=lambda x: x["xp"], reverse=True)
    return skills


def get_recent_activity(db: Session, limit: int = 20) -> List[dict]:
    """Get recent activity feed from user progress entries."""
    progress_entries = (
        db.query(UserProgress)
        .order_by(UserProgress.completed_at.desc())
        .limit(limit)
        .all()
    )
    
    activity = []
    for entry in progress_entries:
        lesson = entry.lesson
        course = entry.course
        
        activity_type = "lesson_completed"
        description = f"Completed lesson \"{lesson.title}\""
        
        if course:
            description += f" in {course.title}"
        
        activity.append({
            "id": entry.id,
            "type": activity_type,
            "description": description,
            "xp_earned": entry.xp_earned,
            "timestamp": entry.completed_at.isoformat() if entry.completed_at else None,
        })
    
    return activity


def add_xp(db: Session, xp_amount: int) -> UserProfile:
    """Add XP to the user's profile and recalculate level."""
    profile = progression_service.get_or_create_profile(db)
    
    profile.total_xp += xp_amount
    
    # Recalculate level
    profile.level = progression_service.calculate_level(profile.total_xp)
    
    db.commit()
    db.refresh(profile)
    return profile


def record_lesson_completion(db: Session, lesson_id: int, course_id: int, xp_earned: int) -> UserProgress:
    """Record a lesson completion and update profile XP."""
    # Check if already completed
    existing = (
        db.query(UserProgress)
        .filter(UserProgress.lesson_id == lesson_id)
        .first()
    )
    
    if existing:
        return existing
    
    # Create progress entry
    progress = UserProgress(
        lesson_id=lesson_id,
        course_id=course_id,
        xp_earned=xp_earned,
    )
    db.add(progress)
    
    # Add XP to profile
    add_xp(db, xp_earned)
    
    db.commit()
    db.refresh(progress)
    return progress


def check_achievement_unlocks(db: Session) -> List[Achievement]:
    """Check and unlock any achievements that have been earned."""
    profile = progression_service.get_or_create_profile(db)
    unlocked = []
    
    # Get already unlocked achievement IDs
    unlocked_ids = {
        ua.achievement_id for ua in db.query(UserAchievement).all()
    }
    
    # Get all achievements
    achievements = db.query(Achievement).all()
    
    for achievement in achievements:
        if achievement.id in unlocked_ids:
            continue
        
        should_unlock = False
        
        if achievement.trigger_type == "xp":
            should_unlock = profile.total_xp >= (achievement.trigger_value or 0)
        elif achievement.trigger_type == "lessons":
            lesson_count = db.query(UserProgress).count()
            should_unlock = lesson_count >= (achievement.trigger_value or 0)
        elif achievement.trigger_type == "level":
            should_unlock = profile.level >= (achievement.trigger_value or 0)
        
        if should_unlock:
            user_achievement = UserAchievement(
                achievement_id=achievement.id,
            )
            db.add(user_achievement)
            unlocked.append(achievement)
    
    if unlocked:
        db.commit()
    
    return unlocked
