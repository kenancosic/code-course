"""Roadmap schemas for node-based learning paths."""
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class RoadmapNodeBase(BaseModel):
    title: str
    description: Optional[str] = None
    position_x: int = 0
    position_y: int = 0
    tier: int = 1
    topic_keywords: Optional[str] = None


class RoadmapNodeCreate(RoadmapNodeBase):
    pass


class RoadmapNodeResponse(RoadmapNodeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    path_id: int


class RoadmapConnectionBase(BaseModel):
    from_node_id: int
    to_node_id: int
    connection_type: str = "default"


class RoadmapConnectionCreate(RoadmapConnectionBase):
    pass


class RoadmapConnectionResponse(RoadmapConnectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    path_id: int


class RoadmapPathBase(BaseModel):
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    colors: Optional[str] = None
    sort_order: int = 0
    is_locked: bool = False


class RoadmapPathCreate(RoadmapPathBase):
    pass


class RoadmapPathResponse(RoadmapPathBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nodes: List[RoadmapNodeResponse] = []
    connections: List[RoadmapConnectionResponse] = []
