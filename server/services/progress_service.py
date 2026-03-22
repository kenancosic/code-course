"""Progress tracking service — XP calculation, leveling, and achievements."""
import math
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from server.models import (
    UserProfile,
    UserProgress,
    Achievement,
    UserAchievement,
    Lesson,
    Course,
    RoadmapPath,
    RoadmapNode,
)


# Level titles based on level ranges
LEVEL_TITLES = [
    (1, "Novice"),
    (5, "Apprentice"),
    (10, "Journeyman"),
    (20, "Adept"),
    (35, "Mage"),
    (50, "Archmage"),
    (75, "Sage"),
    (100, "Grandmaster"),
]


def xp_for_level(level: int) -> int:
    """Calculate XP required to reach a given level.
    
    Formula: floor(100 * N^1.5)
    """
    return int(100 * math.pow(level, 1.5))


def calculate_level(total_xp: int) -> int:
    """Calculate level based on total XP.
    
    Returns the highest level achievable with the given XP.
    """
    level = 1
    while xp_for_level(level + 1) <= total_xp:
        level += 1
    return level


def xp_to_next_level(current_level: int, total_xp: int) -> int:
    """Calculate XP needed to reach the next level."""
    next_level_xp = xp_for_level(current_level + 1)
    return next_level_xp - total_xp


def get_title_for_level(level: int) -> str:
    """Get the appropriate title for a given level."""
    title = "Novice"
    for min_level, level_title in LEVEL_TITLES:
        if level >= min_level:
            title = level_title
    return title


def get_or_create_user_profile(db: Session) -> UserProfile:
    """Get the single user profile or create if doesn't exist."""
    profile = db.query(UserProfile).first()
    if not profile:
        profile = UserProfile(
            display_name="Adventurer",
            avatar_seed="default",
            total_xp=0,
            level=1,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def complete_lesson(
    db: Session,
    lesson_id: int,
    course_id: int,
    time_spent_seconds: int = 0,
) -> dict:
    """Mark a lesson as complete and award XP.
    
    Returns:
        dict with xp_earned, total_xp, level_before, level_after, 
        xp_to_next_level, new_achievements, node_completed
    """
    # Get user profile
    profile = get_or_create_user_profile(db)
    
    # Check if lesson already completed
    existing = (
        db.query(UserProgress)
        .filter(
            UserProgress.lesson_id == lesson_id,
            UserProgress.course_id == course_id,
        )
        .first()
    )
    
    if existing:
        # Lesson already completed, return current state
        return {
            "xp_earned": 0,
            "total_xp": profile.total_xp,
            "level_before": profile.level,
            "level_after": profile.level,
            "xp_to_next_level": xp_to_next_level(profile.level, profile.total_xp),
            "new_achievements": [],
            "node_completed": False,
        }
    
    # Get lesson for XP reward
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    xp_earned = lesson.xp_reward if lesson else 10
    
    # Record level before
    level_before = profile.level
    
    # Create progress entry
    progress = UserProgress(
        lesson_id=lesson_id,
        course_id=course_id,
        xp_earned=xp_earned,
    )
    db.add(progress)
    
    # Update profile XP
    profile.total_xp += xp_earned
    
    # Calculate new level
    new_level = calculate_level(profile.total_xp)
    profile.level = new_level
    
    # Update title based on level
    profile.title = get_title_for_level(new_level)
    
    db.commit()
    db.refresh(profile)
    
    # Check for new achievements
    new_achievements = check_achievements(db, profile)
    
    # Check if course node is completed
    node_completed = check_course_completion(db, course_id)
    
    return {
        "xp_earned": xp_earned,
        "total_xp": profile.total_xp,
        "level_before": level_before,
        "level_after": profile.level,
        "xp_to_next_level": xp_to_next_level(profile.level, profile.total_xp),
        "new_achievements": new_achievements,
        "node_completed": node_completed,
    }


def check_course_completion(db: Session, course_id: int) -> bool:
    """Check if all lessons in a course are completed.
    
    Returns True if course is now fully completed.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        return False
    
    # Get total lessons in course
    total_lessons = db.query(Lesson).filter(Lesson.course_id == course_id).count()
    
    # Get completed lessons
    completed_lessons = (
        db.query(UserProgress)
        .filter(UserProgress.course_id == course_id)
        .count()
    )
    
    return completed_lessons >= total_lessons and total_lessons > 0


def check_achievements(db: Session, profile: UserProfile) -> List[dict]:
    """Check and award any newly unlocked achievements.
    
    Returns list of newly unlocked achievement dicts.
    """
    new_achievements = []
    
    # Get already unlocked achievements
    unlocked_ids = {
        ua.achievement_id 
        for ua in db.query(UserAchievement).all()
    }
    
    # Get all achievements
    all_achievements = db.query(Achievement).all()
    
    # Calculate stats
    lesson_count = db.query(UserProgress).count()
    course_count = db.query(UserProgress.course_id).distinct().count()
    total_xp = profile.total_xp
    
    for achievement in all_achievements:
        if achievement.id in unlocked_ids:
            continue
            
        triggered = False
        
        if achievement.trigger_type == "lesson_count":
            triggered = lesson_count >= (achievement.trigger_value or 0)
        elif achievement.trigger_type == "course_count":
            triggered = course_count >= (achievement.trigger_value or 0)
        elif achievement.trigger_type == "xp_total":
            triggered = total_xp >= (achievement.trigger_value or 0)
        elif achievement.trigger_type == "level":
            triggered = profile.level >= (achievement.trigger_value or 0)
        
        if triggered:
            # Award achievement
            user_achievement = UserAchievement(
                achievement_id=achievement.id,
                unlocked_at=datetime.utcnow(),
            )
            db.add(user_achievement)
            new_achievements.append({
                "id": achievement.id,
                "title": achievement.title,
                "description": achievement.description,
                "icon": achievement.icon,
                "category": achievement.category,
            })
    
    if new_achievements:
        db.commit()
    
    return new_achievements


def get_progress_summary(db: Session) -> dict:
    """Get overall progress summary."""
    profile = get_or_create_user_profile(db)
    
    # Count completed lessons
    total_lessons_completed = db.query(UserProgress).count()
    
    # Count completed courses (all lessons completed)
    completed_courses = 0
    courses = db.query(Course).all()
    for course in courses:
        total_lessons = db.query(Lesson).filter(Lesson.course_id == course.id).count()
        completed_lessons = (
            db.query(UserProgress)
            .filter(UserProgress.course_id == course.id)
            .count()
        )
        if completed_lessons >= total_lessons and total_lessons > 0:
            completed_courses += 1
    
    # Calculate streak (simplified - count unique days with progress in last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    streak_days = (
        db.query(func.date(UserProgress.completed_at))
        .filter(UserProgress.completed_at >= week_ago)
        .distinct()
        .count()
    )
    
    return {
        "total_lessons_completed": total_lessons_completed,
        "total_courses_completed": completed_courses,
        "total_xp": profile.total_xp,
        "current_level": profile.level,
        "streak_days": streak_days,
    }


def get_roadmap_progress(db: Session, path_id: int) -> Optional[dict]:
    """Get progress for a specific roadmap path."""
    # Verify path exists
    path = db.query(RoadmapPath).filter(RoadmapPath.id == path_id).first()
    if not path:
        return None
    
    # Get all nodes for this path
    nodes = db.query(RoadmapNode).filter(RoadmapNode.path_id == path_id).all()
    total_nodes = len(nodes)
    
    if total_nodes == 0:
        return {
            "path_id": path_id,
            "completed_nodes": 0,
            "total_nodes": 0,
            "completion_percentage": 0.0,
        }
    
    # Count completed nodes (nodes with all courses completed)
    completed_nodes = 0
    for node in nodes:
        # Get courses for this node
        node_courses = db.query(Course).filter(
            Course.roadmap_node_id == node.id
        ).all()
        
        if not node_courses:
            continue
        
        # Check if all courses are completed
        all_courses_complete = True
        for course in node_courses:
            total_lessons = db.query(Lesson).filter(
                Lesson.course_id == course.id
            ).count()
            completed_lessons = (
                db.query(UserProgress)
                .filter(UserProgress.course_id == course.id)
                .count()
            )
            if completed_lessons < total_lessons:
                all_courses_complete = False
                break
        
        if all_courses_complete:
            completed_nodes += 1
    
    completion_percentage = round((completed_nodes / total_nodes) * 100, 1)
    
    return {
        "path_id": path_id,
        "completed_nodes": completed_nodes,
        "total_nodes": total_nodes,
        "completion_percentage": completion_percentage,
    }


def get_course_progress(db: Session, course_id: int) -> Optional[dict]:
    """Get progress for a specific course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        return None
    
    # Get all lessons for this course
    lessons = db.query(Lesson).filter(Lesson.course_id == course_id).all()
    total_lessons = len(lessons)
    
    # Get completed lessons
    completed_lesson_ids = {
        p.lesson_id 
        for p in db.query(UserProgress).filter(
            UserProgress.course_id == course_id
        ).all()
    }
    
    completed_lessons = len(completed_lesson_ids)
    
    # Build lesson progress list
    lessons_progress = []
    for lesson in lessons:
        lessons_progress.append({
            "lesson_id": lesson.id,
            "title": lesson.title,
            "completed": lesson.id in completed_lesson_ids,
            "xp_reward": lesson.xp_reward,
        })
    
    completion_percentage = round((completed_lessons / total_lessons) * 100, 1) if total_lessons > 0 else 0.0
    
    return {
        "course_id": course_id,
        "course_title": course.title,
        "completed_lessons": completed_lessons,
        "total_lessons": total_lessons,
        "completion_percentage": completion_percentage,
        "total_xp": course.total_xp,
        "lessons": lessons_progress,
    }


def get_user_achievements(db: Session) -> List[dict]:
    """Get all achievements with unlock status."""
    # Get unlocked achievement IDs
    unlocked = {
        ua.achievement_id: ua.unlocked_at
        for ua in db.query(UserAchievement).all()
    }
    
    # Get all achievements
    achievements = db.query(Achievement).all()
    
    result = []
    for achievement in achievements:
        result.append({
            "id": achievement.id,
            "title": achievement.title,
            "description": achievement.description,
            "icon": achievement.icon,
            "requirement": f"{achievement.trigger_type}: {achievement.trigger_value}",
            "earned_at": unlocked.get(achievement.achievement_id),
        })
    
    return result


def get_user_profile(db: Session) -> dict:
    """Get full user profile with calculated fields."""
    profile = get_or_create_user_profile(db)
    
    # Count completed quests (lessons)
    quests_completed = db.query(UserProgress).count()
    
    return {
        "id": profile.id,
        "username": "adventurer",  # Default for single-user mode
        "email": "adventurer@mythiccode.app",
        "display_name": profile.display_name,
        "avatar_url": None,  # Could be generated from avatar_seed
        "created_at": datetime.utcnow().isoformat(),  # Placeholder
        "level": profile.level,
        "title": profile.title or get_title_for_level(profile.level),
        "total_xp": profile.total_xp,
        "xp_to_next_level": xp_to_next_level(profile.level, profile.total_xp),
        "quests_completed": quests_completed,
    }


def update_profile(db: Session, display_name: Optional[str] = None, avatar_seed: Optional[str] = None) -> dict:
    """Update user profile."""
    profile = get_or_create_user_profile(db)
    
    if display_name is not None:
        profile.display_name = display_name
    
    if avatar_seed is not None:
        profile.avatar_seed = avatar_seed
    
    db.commit()
    db.refresh(profile)
    
    return get_user_profile(db)
