from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from server.database import Base


class SourceDocument(Base):
    __tablename__ = "source_documents"

    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    storage_path = Column(Text, nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_format = Column(String(20), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    checksum_sha256 = Column(String(64), nullable=False, index=True)
    detected_title = Column(String(255), nullable=True)
    detected_author = Column(String(255), nullable=True)
    status = Column(String(20), default="uploaded")
    extracted_text = Column(Text, nullable=True)
    processing_metadata = Column(JSON, nullable=True)
    processing_error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sections = relationship("DocumentSection", back_populates="source_document", cascade="all, delete-orphan")
    courses = relationship("Course", back_populates="source_document")
    topics = relationship("Topic", back_populates="source_document", foreign_keys="Topic.source_document_id")
    roadmap_nodes = relationship("RoadmapNode", back_populates="source_document", foreign_keys="RoadmapNode.source_document_id")


class DocumentSection(Base):
    __tablename__ = "document_sections"

    id = Column(Integer, primary_key=True, index=True)
    source_document_id = Column(Integer, ForeignKey("source_documents.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("document_sections.id"), nullable=True)
    title = Column(String(255), nullable=False)
    sort_order = Column(Integer, default=0)
    depth = Column(Integer, default=1)
    page_start = Column(Integer, nullable=True)
    page_end = Column(Integer, nullable=True)
    char_start = Column(Integer, nullable=True)
    char_end = Column(Integer, nullable=True)
    raw_text = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    keywords = Column(JSON, nullable=True)
    suggested_path_id = Column(Integer, ForeignKey("roadmap_paths.id"), nullable=True)
    suggested_topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    suggested_tier = Column(Integer, nullable=True)
    match_confidence = Column(Float, nullable=True)
    match_rationale = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    source_document = relationship("SourceDocument", back_populates="sections")
    parent = relationship("DocumentSection", remote_side=[id], back_populates="children")
    children = relationship("DocumentSection", back_populates="parent", cascade="all, delete-orphan")
    lessons = relationship("Lesson", back_populates="source_section")
    topics = relationship("Topic", back_populates="source_section", foreign_keys="Topic.source_section_id")
    roadmap_nodes = relationship("RoadmapNode", back_populates="source_section", foreign_keys="RoadmapNode.source_section_id")
    suggested_path = relationship("RoadmapPath")
    suggested_topic = relationship("Topic", foreign_keys=[suggested_topic_id])
