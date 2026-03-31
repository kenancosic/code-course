from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from server.database import Base


def _utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)
    title = Column(String(200), nullable=False)
    language = Column(String(32), nullable=False)
    code = Column(Text, nullable=False)
    output = Column(Text, nullable=True)
    status = Column(String(32), default="in_progress", nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(
        DateTime,
        default=_utc_now,
        onupdate=_utc_now,
        nullable=False,
    )


class PracticeChallenge(Base):
    __tablename__ = "practice_challenges"

    id = Column(Integer, primary_key=True, index=True)
    path_id = Column(Integer, ForeignKey("roadmap_paths.id"), nullable=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)
    title = Column(String(200), nullable=False)
    summary = Column(Text, nullable=False)
    instructions = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    language = Column(String(32), nullable=False)
    difficulty = Column(String(16), nullable=False)
    challenge_kind = Column(String(16), default="standard", nullable=False)
    entrypoint_name = Column(String(100), nullable=False)
    starter_code = Column(Text, nullable=False)
    solution_code = Column(Text, nullable=True)
    xp_reward = Column(Integer, default=100, nullable=False)
    visible_tests = Column(JSON, nullable=False, default=list)
    hidden_tests = Column(JSON, nullable=False, default=list)
    hints = Column(JSON, nullable=False, default=list)
    examples = Column(JSON, nullable=False, default=list)
    constraints = Column(JSON, nullable=False, default=list)
    tags = Column(JSON, nullable=False, default=list)
    source_prompt = Column(Text, nullable=True)
    grounding_context = Column(JSON, nullable=True)
    ai_generated = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now, nullable=False)

    path = relationship("RoadmapPath")
    topic = relationship("Topic")
    lesson = relationship("Lesson")
    encounters = relationship("PracticeEncounter", back_populates="challenge")


class PracticeRoom(Base):
    __tablename__ = "practice_rooms"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    floor_id = Column(Integer, ForeignKey("roadmap_nodes.id"), nullable=False)
    title = Column(String(200), nullable=False)
    language = Column(String(32), nullable=False)
    difficulty = Column(String(16), nullable=False)
    selected_subtopic = Column(String(150), nullable=True)
    practice_goal = Column(Text, nullable=True)
    attempt_tokens = Column(Integer, default=3, nullable=False)
    max_attempt_tokens = Column(Integer, default=3, nullable=False)
    status = Column(String(32), default="active", nullable=False)
    boss_defeated = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now, nullable=False)

    floor = relationship("RoadmapNode")
    encounters = relationship(
        "PracticeEncounter",
        back_populates="room",
        cascade="all, delete-orphan",
        order_by="PracticeEncounter.encounter_order",
    )
    submissions = relationship("PracticeSubmission", back_populates="room")


class PracticeEncounter(Base):
    __tablename__ = "practice_encounters"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id = Column(String, ForeignKey("practice_rooms.id"), nullable=False)
    challenge_id = Column(Integer, ForeignKey("practice_challenges.id"), nullable=False)
    encounter_order = Column(Integer, nullable=False)
    encounter_type = Column(String(16), default="standard", nullable=False)
    status = Column(String(16), default="available", nullable=False)
    attempts_used = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now, nullable=False)

    room = relationship("PracticeRoom", back_populates="encounters")
    challenge = relationship("PracticeChallenge", back_populates="encounters")
    submissions = relationship(
        "PracticeSubmission",
        back_populates="encounter",
        cascade="all, delete-orphan",
        order_by="PracticeSubmission.created_at",
    )


class PracticeSubmission(Base):
    __tablename__ = "practice_submissions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    room_id = Column(String, ForeignKey("practice_rooms.id"), nullable=False)
    encounter_id = Column(String, ForeignKey("practice_encounters.id"), nullable=False)
    code = Column(Text, nullable=False)
    language = Column(String(32), nullable=False)
    stdout = Column(Text, nullable=True)
    stderr = Column(Text, nullable=True)
    exit_code = Column(Integer, nullable=False, default=0)
    execution_time_ms = Column(Integer, nullable=False, default=0)
    passed = Column(Boolean, default=False, nullable=False)
    score = Column(Integer, nullable=True)
    visible_results = Column(JSON, nullable=True)
    hidden_results = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)

    room = relationship("PracticeRoom", back_populates="submissions")
    encounter = relationship("PracticeEncounter", back_populates="submissions")
