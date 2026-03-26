from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from server.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True, default=1)
    display_name = Column(String(50), nullable=True)
    avatar_seed = Column(String(50), default="default")
    total_xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    current_path_id = Column(Integer, ForeignKey("roadmap_paths.id"), nullable=True)

    current_path = relationship("RoadmapPath", foreign_keys=[current_path_id])


class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    xp_earned = Column(Integer, default=0)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    lesson = relationship("Lesson", back_populates="progress_entries")
    course = relationship("Course", back_populates="progress_entries")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    category = Column(String(50), nullable=True)
    trigger_type = Column(String(50), nullable=True)
    trigger_value = Column(Integer, nullable=True)

    user_achievements = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())

    achievement = relationship("Achievement", back_populates="user_achievements")
