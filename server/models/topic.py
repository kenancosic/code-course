from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from server.database import Base

class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    ai_generated = Column(Boolean, default=False)
    keywords = Column(String(255), nullable=True)
    source_document_id = Column(Integer, ForeignKey("source_documents.id"), nullable=True)
    source_section_id = Column(Integer, ForeignKey("document_sections.id"), nullable=True)

    courses = relationship("Course", back_populates="topic")
    roadmap_nodes = relationship("RoadmapNode", back_populates="topic")
    source_document = relationship("SourceDocument", back_populates="topics", foreign_keys=[source_document_id])
    source_section = relationship("DocumentSection", back_populates="topics", foreign_keys=[source_section_id])
    
    connections_out = relationship("TopicConnection", foreign_keys="[TopicConnection.from_topic_id]", back_populates="from_topic")
    connections_in = relationship("TopicConnection", foreign_keys="[TopicConnection.to_topic_id]", back_populates="to_topic")

class TopicConnection(Base):
    __tablename__ = "topic_connections"

    id = Column(Integer, primary_key=True, index=True)
    from_topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    to_topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    relationship_type = Column(String(50), default="prerequisite")
    ai_confidence = Column(Float, nullable=True)

    from_topic = relationship("Topic", foreign_keys=[from_topic_id], back_populates="connections_out")
    to_topic = relationship("Topic", foreign_keys=[to_topic_id], back_populates="connections_in")
