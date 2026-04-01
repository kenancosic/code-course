"""Document-backed grimoire ingestion endpoints."""

from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from server.database import get_db
from server.errors import api_error
from server.schemas.course import CourseResponse
from server.schemas.grimoire import (
    CreateGrimoireCourseRequest,
    DocumentSectionResponse,
    RoadmapApplyResponse,
    RoadmapPreviewResponse,
    RoadmapProjectionRequest,
    SourceDocumentResponse,
)
from server.services import grimoire_service

router = APIRouter(prefix="/grimoires", tags=["grimoires"])


@router.post("/upload", response_model=SourceDocumentResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_grimoire(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a grimoire source file and kick off background processing."""
    try:
        document = await grimoire_service.create_source_document_from_upload(db, file)
    except ValueError as exc:
        raise api_error(status.HTTP_400_BAD_REQUEST, str(exc))

    database_url = str(db.get_bind().url) if db.get_bind() is not None else None
    background_tasks.add_task(grimoire_service.process_document_job, document.id, database_url)
    return document


@router.get("/{document_id}", response_model=SourceDocumentResponse)
async def get_grimoire(document_id: int, db: Session = Depends(get_db)):
    """Fetch the current processing state for a grimoire."""
    document = grimoire_service.get_document(db, document_id)
    if not document:
        raise api_error(status.HTTP_404_NOT_FOUND, f"Document {document_id} not found")
    return document


@router.get("/{document_id}/sections", response_model=List[DocumentSectionResponse])
async def get_grimoire_sections(document_id: int, db: Session = Depends(get_db)):
    """Return the normalized section tree for a processed grimoire."""
    document = grimoire_service.get_document(db, document_id)
    if not document:
        raise api_error(status.HTTP_404_NOT_FOUND, f"Document {document_id} not found")
    sections = grimoire_service.get_document_sections(db, document_id)
    return grimoire_service.build_section_tree(sections)


@router.post("/{document_id}/courses", response_model=CourseResponse)
async def create_grimoire_course(
    document_id: int,
    request: CreateGrimoireCourseRequest,
    db: Session = Depends(get_db),
):
    """Forge a dedicated course from a processed grimoire and enroll the current user."""
    try:
        course = await grimoire_service.create_course_from_document(
            db,
            document_id,
            section_ids=request.section_ids,
            title=request.title,
            model=request.model,
        )
    except ValueError as exc:
        raise api_error(status.HTTP_400_BAD_REQUEST, str(exc))
    return course


@router.post("/{document_id}/roadmap-preview", response_model=RoadmapPreviewResponse)
async def preview_grimoire_projection(
    document_id: int,
    request: RoadmapProjectionRequest,
    db: Session = Depends(get_db),
):
    """Preview where selected sections would land in visible roadmap paths."""
    if not request.section_ids:
        raise api_error(status.HTTP_400_BAD_REQUEST, "Select at least one section to preview")
    try:
        suggestions = grimoire_service.preview_roadmap_projection(db, document_id, request.section_ids)
    except ValueError as exc:
        raise api_error(status.HTTP_400_BAD_REQUEST, str(exc))
    return {"document_id": document_id, "suggestions": suggestions}


@router.post("/{document_id}/roadmap-apply", response_model=RoadmapApplyResponse)
async def apply_grimoire_projection(
    document_id: int,
    request: RoadmapProjectionRequest,
    db: Session = Depends(get_db),
):
    """Insert selected grimoire sections into visible roadmap paths."""
    if not request.section_ids:
        raise api_error(status.HTTP_400_BAD_REQUEST, "Select at least one section to project")
    try:
        result = grimoire_service.apply_roadmap_projection(db, document_id, request.section_ids)
    except ValueError as exc:
        raise api_error(status.HTTP_400_BAD_REQUEST, str(exc))
    return result
