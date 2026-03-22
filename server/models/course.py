from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    roadmap_node_id = Column(Integer, ForeignKey("roadmap_nodes.id"), nullable=False)
    status = Column(String(20), default="locked")
    total_lessons = Column(Integer, default=0)
    total_xp = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    roadmap_node = relationship("RoadmapNode", back_populates="courses")
    lessons = relationship("Lesson", back_populates="course", cascade="all, delete-orphan")
    progress_entries = relationship("UserProgress", back_populates="course")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(150), nullable=False)
    content_markdown = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    xp_reward = Column(Integer, default=10)

    course = relationship("Course", back_populates="lessons")
    progress_entries = relationship("UserProgress", back_populates="lesson")
