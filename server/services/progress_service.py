"""Progress tracking service."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from server.models import (
    Achievement,
    Course,
    CourseEnrollment,
    Lesson,
    RoadmapNode,
    RoadmapPath,
    UserAchievement,
    UserProgress,
)
from server.services import course_service, progression_service


def _utc_now() -> datetime:
    """Return a naive UTC datetime without using deprecated utcnow()."""
    return datetime.now(UTC).replace(tzinfo=None)


def _user_scoped_course(
    db: Session,
    course_id: int,
    user_id: int,
) -> Course | None:
    return (
        db.query(Course)
        .join(CourseEnrollment, CourseEnrollment.course_id == Course.id)
        .filter(
            Course.id == course_id,
            CourseEnrollment.user_id == user_id,
        )
        .first()
    )


def _sync_enrollment_state(
    db: Session,
    course_id: int,
    user_id: int,
    touched_at: datetime | None = None,
) -> CourseEnrollment:
    enrollment = course_service.ensure_course_enrollment(
        db,
        course_id,
        user_id=user_id,
        last_accessed_at=touched_at,
    )
    completed = check_course_completion(db, course_id, user_id=user_id)
    if touched_at is not None:
        enrollment.last_accessed_at = touched_at
    if completed:
        enrollment.completed_at = touched_at or enrollment.completed_at or _utc_now()
    else:
        enrollment.completed_at = None
    db.flush()
    return enrollment


def complete_lesson(
    db: Session,
    lesson_id: int,
    course_id: int,
    time_spent_seconds: int = 0,
) -> dict:
    del time_spent_seconds

    profile = progression_service.get_or_create_profile(db)
    touched_at = _utc_now()
    _sync_enrollment_state(db, course_id, profile.id, touched_at=touched_at)

    existing = (
        db.query(UserProgress)
        .filter(
            UserProgress.user_id == profile.id,
            UserProgress.lesson_id == lesson_id,
            UserProgress.course_id == course_id,
        )
        .first()
    )
    if existing:
        snapshot = progression_service.progress_snapshot(profile.total_xp)
        db.commit()
        return {
            "xp_earned": 0,
            "total_xp": profile.total_xp,
            "level_before": snapshot.current_level,
            "level_after": snapshot.current_level,
            "xp_to_next_level": snapshot.xp_to_next_level,
            "new_achievements": [],
            "node_completed": check_course_completion(db, course_id, user_id=profile.id),
        }

    lesson = (
        db.query(Lesson)
        .filter(Lesson.id == lesson_id, Lesson.course_id == course_id)
        .first()
    )
    xp_earned = lesson.xp_reward if lesson else 10
    level_before = progression_service.calculate_level(profile.total_xp)

    db.add(
        UserProgress(
            user_id=profile.id,
            lesson_id=lesson_id,
            course_id=course_id,
            xp_earned=xp_earned,
            completed_at=touched_at,
        )
    )

    profile.total_xp += xp_earned
    snapshot = progression_service.progress_snapshot(profile.total_xp)
    profile.level = snapshot.current_level
    _sync_enrollment_state(db, course_id, profile.id, touched_at=touched_at)
    db.commit()
    db.refresh(profile)

    new_achievements = check_achievements(db, profile.id, profile.total_xp, snapshot.current_level)
    node_completed = check_course_completion(db, course_id, user_id=profile.id)
    _sync_enrollment_state(db, course_id, profile.id, touched_at=touched_at)
    db.commit()

    return {
        "xp_earned": xp_earned,
        "total_xp": profile.total_xp,
        "level_before": level_before,
        "level_after": snapshot.current_level,
        "xp_to_next_level": snapshot.xp_to_next_level,
        "new_achievements": new_achievements,
        "node_completed": node_completed,
    }


def check_course_completion(
    db: Session,
    course_id: int,
    user_id: int | None = None,
) -> bool:
    user_id = user_id or progression_service.get_current_profile_id(db)
    total_lessons = db.query(Lesson).filter(Lesson.course_id == course_id).count()
    completed_lessons = (
        db.query(UserProgress)
        .filter(
            UserProgress.user_id == user_id,
            UserProgress.course_id == course_id,
        )
        .count()
    )
    return total_lessons > 0 and completed_lessons >= total_lessons


def check_achievements(
    db: Session,
    user_id: int,
    total_xp: int,
    current_level: int,
) -> List[dict]:
    new_achievements = []
    unlocked_ids = {
        ua.achievement_id
        for ua in db.query(UserAchievement)
        .filter(UserAchievement.user_id == user_id)
        .all()
    }
    lesson_count = (
        db.query(UserProgress)
        .filter(UserProgress.user_id == user_id)
        .count()
    )
    course_count = (
        db.query(UserProgress.course_id)
        .filter(UserProgress.user_id == user_id)
        .distinct()
        .count()
    )

    for achievement in db.query(Achievement).all():
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
            triggered = current_level >= (achievement.trigger_value or 0)

        if not triggered:
            continue

        db.add(
            UserAchievement(
                user_id=user_id,
                achievement_id=achievement.id,
                unlocked_at=_utc_now(),
            )
        )
        new_achievements.append(
            {
                "id": achievement.id,
                "title": achievement.title,
                "description": achievement.description,
                "icon": achievement.icon,
                "category": achievement.category,
            }
        )

    if new_achievements:
        db.commit()

    return new_achievements


def get_progress_summary(db: Session) -> dict:
    profile = progression_service.get_or_create_profile(db)
    snapshot = progression_service.progress_snapshot(profile.total_xp)

    total_lessons_completed = (
        db.query(UserProgress)
        .filter(UserProgress.user_id == profile.id)
        .count()
    )
    total_courses_completed = (
        db.query(CourseEnrollment)
        .filter(
            CourseEnrollment.user_id == profile.id,
            CourseEnrollment.completed_at.isnot(None),
        )
        .count()
    )

    week_ago = _utc_now() - timedelta(days=7)
    streak_days = (
        db.query(func.date(UserProgress.completed_at))
        .filter(
            UserProgress.user_id == profile.id,
            UserProgress.completed_at >= week_ago,
        )
        .distinct()
        .count()
    )

    return {
        "total_lessons_completed": total_lessons_completed,
        "total_courses_completed": total_courses_completed,
        "total_xp": profile.total_xp,
        "current_level": snapshot.current_level,
        "current_level_xp": snapshot.current_level_xp,
        "xp_to_next_level": snapshot.xp_to_next_level,
        "level_progress_percentage": snapshot.level_progress_percentage,
        "streak_days": streak_days,
    }


def get_roadmap_progress(db: Session, path_id: int) -> Optional[dict]:
    path = db.query(RoadmapPath).filter(RoadmapPath.id == path_id).first()
    if not path:
        return None

    profile = progression_service.get_or_create_profile(db)
    nodes = db.query(RoadmapNode).filter(RoadmapNode.path_id == path_id).all()
    total_nodes = len(nodes)
    if total_nodes == 0:
        return {
            "path_id": path_id,
            "completed_nodes": 0,
            "total_nodes": 0,
            "completion_percentage": 0.0,
        }

    completed_topic_ids = {
        topic_id
        for (topic_id,) in db.query(Course.topic_id)
        .join(CourseEnrollment, CourseEnrollment.course_id == Course.id)
        .filter(
            CourseEnrollment.user_id == profile.id,
            CourseEnrollment.completed_at.isnot(None),
            Course.topic_id.isnot(None),
        )
        .distinct()
        .all()
    }
    completed_nodes = sum(1 for node in nodes if node.topic_id in completed_topic_ids)

    return {
        "path_id": path_id,
        "completed_nodes": completed_nodes,
        "total_nodes": total_nodes,
        "completion_percentage": round((completed_nodes / total_nodes) * 100, 1),
    }


def get_course_progress(db: Session, course_id: int) -> Optional[dict]:
    profile = progression_service.get_or_create_profile(db)
    course = _user_scoped_course(db, course_id, profile.id)
    if not course:
        return None

    lessons = (
        db.query(Lesson)
        .filter(Lesson.course_id == course_id)
        .order_by(Lesson.sort_order)
        .all()
    )
    completed_lesson_ids = {
        progress.lesson_id
        for progress in db.query(UserProgress)
        .filter(
            UserProgress.user_id == profile.id,
            UserProgress.course_id == course_id,
        )
        .all()
    }
    completed_lessons = len(completed_lesson_ids)
    total_lessons = len(lessons)

    return {
        "course_id": course_id,
        "course_title": course.title,
        "completed_lessons": completed_lessons,
        "total_lessons": total_lessons,
        "completion_percentage": round((completed_lessons / total_lessons) * 100, 1)
        if total_lessons
        else 0.0,
        "total_xp": course.total_xp,
        "lessons": [
            {
                "lesson_id": lesson.id,
                "title": lesson.title,
                "completed": lesson.id in completed_lesson_ids,
                "xp_reward": lesson.xp_reward,
            }
            for lesson in lessons
        ],
    }
