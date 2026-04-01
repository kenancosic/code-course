"""Topics API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_

from server.database import get_db
from server.errors import api_error
from server.models import Topic
from server.models.topic import TopicConnection
from server.schemas.topic import TopicResponse, TopicDetailResponse
from server.schemas.roadmap import RoadmapPathResponse
from server.services import topic_service

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
    """Generate a custom roadmap path for the current local user."""
    topic_name = request.topic.strip()
    if not topic_name:
        raise api_error(status.HTTP_400_BAD_REQUEST, "Topic is required")

    return await topic_service.generate_custom_roadmap(db, topic_name)

@router.get("/{topic_id}", response_model=TopicDetailResponse)
async def get_topic(topic_id: int, db: Session = Depends(get_db)):
    """Get a single topic by ID with subtopics and connections."""
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise api_error(status.HTTP_404_NOT_FOUND, f"Topic {topic_id} not found")

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
