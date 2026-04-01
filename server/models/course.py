from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from server.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    source_document_id = Column(Integer, ForeignKey("source_documents.id"), nullable=True)
    status = Column(String(20), default="generating")
    generation_mode = Column(String(20), default="topic")
    total_lessons = Column(Integer, default=0)
    total_xp = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    topic = relationship("Topic", back_populates="courses")
    source_document = relationship("SourceDocument", back_populates="courses")
    lessons = relationship("Lesson", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("CourseEnrollment", back_populates="course", cascade="all, delete-orphan")
    progress_entries = relationship("UserProgress", back_populates="course")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    source_section_id = Column(Integer, ForeignKey("document_sections.id"), nullable=True)
    title = Column(String(150), nullable=False)
    content_markdown = Column(Text, nullable=True)
    task_type = Column(String(50), nullable=True)
    task_content = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    xp_reward = Column(Integer, default=10)

    course = relationship("Course", back_populates="lessons")
    source_section = relationship("DocumentSection", back_populates="lessons")
    progress_entries = relationship("UserProgress", back_populates="lesson")
