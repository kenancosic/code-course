from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class TopicBase(BaseModel):
    title: str
    description: Optional[str] = None
    ai_generated: bool = False
    keywords: Optional[str] = None

class TopicCreate(TopicBase):
    pass

class TopicResponse(TopicBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

class TopicConnectionBase(BaseModel):
    from_topic_id: int
    to_topic_id: int
    relationship_type: str = "prerequisite"
    ai_confidence: Optional[float] = None

class TopicConnectionCreate(TopicConnectionBase):
    pass

class TopicConnectionResponse(TopicConnectionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

class TopicDetailResponse(TopicResponse):
    subtopics: List[TopicResponse] = []
    outgoing_connections: List[TopicConnectionResponse] = []
    incoming_connections: List[TopicConnectionResponse] = []
