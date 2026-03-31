from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from server.database import Base


class RoadmapPath(Base):
    __tablename__ = "roadmap_paths"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)
    colors = Column(String(100), nullable=True)
    sort_order = Column(Integer, default=0)
    is_locked = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=True)
    is_custom = Column(Boolean, default=False)

    nodes = relationship("RoadmapNode", back_populates="path", cascade="all, delete-orphan")
    connections = relationship("RoadmapConnection", back_populates="path", cascade="all, delete-orphan")


class RoadmapNode(Base):
    __tablename__ = "roadmap_nodes"

    id = Column(Integer, primary_key=True, index=True)
    path_id = Column(Integer, ForeignKey("roadmap_paths.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    source_document_id = Column(Integer, ForeignKey("source_documents.id"), nullable=True)
    source_section_id = Column(Integer, ForeignKey("document_sections.id"), nullable=True)
    position_x = Column(Integer, default=0)
    position_y = Column(Integer, default=0)
    tier = Column(Integer, default=1)
    status = Column(String(20), default="locked")

    path = relationship("RoadmapPath", back_populates="nodes")
    topic = relationship("Topic", back_populates="roadmap_nodes")
    source_document = relationship("SourceDocument", back_populates="roadmap_nodes", foreign_keys=[source_document_id])
    source_section = relationship("DocumentSection", back_populates="roadmap_nodes", foreign_keys=[source_section_id])


class RoadmapConnection(Base):
    __tablename__ = "roadmap_connections"

    id = Column(Integer, primary_key=True, index=True)
    path_id = Column(Integer, ForeignKey("roadmap_paths.id"), nullable=False)
    from_node_id = Column(Integer, ForeignKey("roadmap_nodes.id"), nullable=False)
    to_node_id = Column(Integer, ForeignKey("roadmap_nodes.id"), nullable=False)
    connection_type = Column(String(20), default="default")

    path = relationship("RoadmapPath", back_populates="connections")
    from_node = relationship("RoadmapNode", foreign_keys=[from_node_id])
    to_node = relationship("RoadmapNode", foreign_keys=[to_node_id])

    __table_args__ = (
        UniqueConstraint('path_id', 'from_node_id', 'to_node_id', name='unique_connection'),
    )
