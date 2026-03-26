"""Topics API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from server.database import get_db
from server.models import Topic, RoadmapPath, RoadmapNode, RoadmapConnection
from server.models.topic import TopicConnection
from server.schemas.topic import TopicResponse, TopicDetailResponse
from server.schemas.roadmap import RoadmapPathResponse

class GenerateRoadmapRequest(BaseModel):
    topic: str

router = APIRouter(prefix="/topics", tags=["topics"])

@router.get("/", response_model=List[TopicResponse])
async def list_topics(
    query: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List topics or search by title/keywords."""
    db_query = db.query(Topic)
    if query:
        search_term = f"%{query}%"
        db_query = db_query.filter(
            or_(
                Topic.title.ilike(search_term),
                Topic.keywords.ilike(search_term)
            )
        )
    return db_query.all()

@router.post("/generate-roadmap", response_model=RoadmapPathResponse)
async def generate_roadmap(
    request: GenerateRoadmapRequest,
    db: Session = Depends(get_db)
):
    """Stub endpoint to generate a custom roadmap path."""
    # 1. Create main topic
    main_topic = Topic(title=request.topic, description=f"Custom path for {request.topic}", ai_generated=True)
    db.add(main_topic)
    
    # 2. Create some dummy child topics
    child_topic_1 = Topic(title=f"Introduction to {request.topic}", description="Basics", ai_generated=True)
    child_topic_2 = Topic(title=f"Advanced {request.topic}", description="Advanced concepts", ai_generated=True)
    db.add(child_topic_1)
    db.add(child_topic_2)
    
    db.commit()
    db.refresh(main_topic)
    db.refresh(child_topic_1)
    db.refresh(child_topic_2)
    
    # 3. Create the roadmap path
    roadmap_path = RoadmapPath(
        title=request.topic,
        description=f"AI-generated roadmap for {request.topic}",
        is_custom=True,
        icon="Star",
        colors="from-indigo-500 to-purple-500"
    )
    db.add(roadmap_path)
    db.commit()
    db.refresh(roadmap_path)
    
    # 4. Create nodes
    node_main = RoadmapNode(path_id=roadmap_path.id, topic_id=main_topic.id, tier=1, position_x=0, position_y=0, status="unlocked")
    node_child_1 = RoadmapNode(path_id=roadmap_path.id, topic_id=child_topic_1.id, tier=2, position_x=-100, position_y=100)
    node_child_2 = RoadmapNode(path_id=roadmap_path.id, topic_id=child_topic_2.id, tier=2, position_x=100, position_y=100)
    
    db.add(node_main)
    db.add(node_child_1)
    db.add(node_child_2)
    db.commit()
    db.refresh(node_main)
    db.refresh(node_child_1)
    db.refresh(node_child_2)
    
    # 5. Create connections
    conn_1 = RoadmapConnection(path_id=roadmap_path.id, from_node_id=node_main.id, to_node_id=node_child_1.id)
    conn_2 = RoadmapConnection(path_id=roadmap_path.id, from_node_id=node_main.id, to_node_id=node_child_2.id)
    db.add(conn_1)
    db.add(conn_2)
    db.commit()
    
    # Refresh to include nodes and connections in response
    db.refresh(roadmap_path)
    return roadmap_path

@router.get("/{topic_id}", response_model=TopicDetailResponse)
async def get_topic(topic_id: int, db: Session = Depends(get_db)):
    """Get a single topic by ID with subtopics and connections."""
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic {topic_id} not found"
        )

    # Fetch all connections involving this topic
    outgoing = db.query(TopicConnection).filter(TopicConnection.from_topic_id == topic_id).all()
    incoming = db.query(TopicConnection).filter(TopicConnection.to_topic_id == topic_id).all()

    # Subtopics: child topics linked via "subtopic" relationship where this topic is the parent
    subtopic_ids = [
        conn.to_topic_id for conn in outgoing
        if conn.relationship_type == "subtopic"
    ]
    subtopics = db.query(Topic).filter(Topic.id.in_(subtopic_ids)).all() if subtopic_ids else []

    return TopicDetailResponse(
        id=topic.id,
        title=topic.title,
        description=topic.description,
        ai_generated=topic.ai_generated,
        keywords=topic.keywords,
        subtopics=subtopics,
        outgoing_connections=outgoing,
        incoming_connections=incoming,
    )
