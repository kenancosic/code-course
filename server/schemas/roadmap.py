"""Roadmap schemas for node-based learning paths."""
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class RoadmapNodeBase(BaseModel):
    title: str
    description: Optional[str] = None
    position_x: int = 0
    position_y: int = 0
    node_type: str = "default"
    course_id: Optional[int] = None


class RoadmapNodeCreate(RoadmapNodeBase):
    pass


class RoadmapNodeResponse(RoadmapNodeBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    path_id: int


class RoadmapConnectionBase(BaseModel):
    source_node_id: int
    target_node_id: int
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
    category: Optional[str] = None
    is_published: bool = False


class RoadmapPathCreate(RoadmapPathBase):
    pass


class RoadmapPathResponse(RoadmapPathBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    nodes: List[RoadmapNodeResponse] = []
    connections: List[RoadmapConnectionResponse] = []
