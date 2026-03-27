from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

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
