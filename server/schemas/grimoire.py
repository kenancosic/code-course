from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class SourceDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_filename: str
    mime_type: str
    file_format: str
    file_size_bytes: int
    detected_title: Optional[str] = None
    detected_author: Optional[str] = None
    status: str
    processing_metadata: Optional[dict] = None
    processing_error: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DocumentSectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_document_id: int
    parent_id: Optional[int] = None
    title: str
    sort_order: int
    depth: int
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    char_start: Optional[int] = None
    char_end: Optional[int] = None
    raw_text: Optional[str] = None
    summary: Optional[str] = None
    keywords: Optional[List[str]] = None
    suggested_path_id: Optional[int] = None
    suggested_topic_id: Optional[int] = None
    suggested_tier: Optional[int] = None
    match_confidence: Optional[float] = None
    match_rationale: Optional[str] = None
    children: List["DocumentSectionResponse"] = []


class CreateGrimoireCourseRequest(BaseModel):
    section_ids: List[int] = []
    title: Optional[str] = None
    model: Optional[str] = None


class RoadmapProjectionRequest(BaseModel):
    section_ids: List[int]


class RoadmapPreviewItem(BaseModel):
    section_id: int
    section_title: str
    target_path_id: int
    target_path_title: str
    target_tier: int
    anchor_node_id: int
    anchor_topic_title: str
    suggested_position_x: int
    suggested_position_y: int
    match_confidence: float
    rationale: str


class RoadmapPreviewResponse(BaseModel):
    document_id: int
    suggestions: List[RoadmapPreviewItem]


class RoadmapApplyResponse(BaseModel):
    document_id: int
    inserted_count: int
    created_node_ids: List[int]
    created_topic_ids: List[int]
    affected_path_ids: List[int]


DocumentSectionResponse.model_rebuild()
