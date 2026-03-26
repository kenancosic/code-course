"""Roadmap schemas for node-based learning paths."""
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from .topic import TopicResponse


class RoadmapNodeBase(BaseModel):
    topic_id: int
    position_x: int = 0
    position_y: int = 0
    tier: int = 1
    status: str = "locked"


class RoadmapNodeCreate(RoadmapNodeBase):
    pass


class RoadmapNodeResponse(RoadmapNodeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    path_id: int
    topic: Optional[TopicResponse] = None


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
    user_id: Optional[int] = None
    is_custom: bool = False


class RoadmapPathCreate(RoadmapPathBase):
    pass


class RoadmapPathResponse(RoadmapPathBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nodes: List[RoadmapNodeResponse] = []
    connections: List[RoadmapConnectionResponse] = []
