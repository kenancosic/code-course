"""Services for document-backed grimoire ingestion and roadmap projection."""

from __future__ import annotations

import hashlib
import mimetypes
import re
from collections import defaultdict
from pathlib import Path
from typing import Iterable

from fastapi import UploadFile
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.orm import sessionmaker

from server.config import get_settings
from server.database import SessionLocal
from server.llm import client
from server.models import (
    Course,
    DocumentSection,
    Lesson,
    RoadmapConnection,
    RoadmapNode,
    RoadmapPath,
    SourceDocument,
    Topic,
)


ALLOWED_FORMATS = {".pdf": "pdf", ".epub": "epub", ".txt": "txt"}
STOPWORDS = {
    "about",
    "after",
    "again",
    "also",
    "among",
    "because",
    "been",
    "before",
    "being",
    "between",
    "could",
    "document",
    "from",
    "have",
    "into",
    "lesson",
    "many",
    "more",
    "most",
    "only",
    "other",
    "over",
    "section",
    "should",
    "their",
    "there",
    "these",
    "they",
    "this",
    "those",
    "through",
    "topic",
    "very",
    "what",
    "when",
    "where",
    "which",
    "with",
    "would",
    "your",
}


def _normalize_tokens(*parts: str | None) -> set[str]:
    tokens: set[str] = set()
    for part in parts:
        if not part:
            continue
        for token in re.findall(r"[a-z0-9]+", part.lower()):
            if len(token) > 2 and token not in STOPWORDS:
                tokens.add(token)
    return tokens


def _extract_keywords_fallback(title: str, text: str, limit: int = 6) -> list[str]:
    counts: dict[str, int] = {}
    lowered = text.lower()
    for token in _normalize_tokens(title, text):
        counts[token] = counts.get(token, 0) + lowered.count(token)
    ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    keywords = [token for token, _ in ranked[:limit]]
    if not keywords and title:
        keywords = list(_normalize_tokens(title))[:limit]
    return keywords


def _summarize_text_fallback(text: str, limit: int = 280) -> str:
    compact = re.sub(r"\s+", " ", text).strip()
    if not compact:
        return "No extractable content was found for this section."
    if len(compact) <= limit:
        return compact
    return compact[: limit - 3].rstrip() + "..."


def _detect_format(filename: str | None) -> tuple[str, str]:
    suffix = Path(filename or "").suffix.lower()
    if suffix not in ALLOWED_FORMATS:
        raise ValueError("Unsupported file type. Upload a PDF, EPUB, or TXT file.")
    mime_type = mimetypes.guess_type(filename or "")[0] or "application/octet-stream"
    return ALLOWED_FORMATS[suffix], mime_type


def _grimoire_storage_dir() -> Path:
    settings = get_settings()
    storage_dir = Path(settings.GRIMOIRE_UPLOAD_DIR).resolve()
    storage_dir.mkdir(parents=True, exist_ok=True)
    return storage_dir


async def create_source_document_from_upload(db: Session, upload: UploadFile) -> SourceDocument:
    file_format, mime_type = _detect_format(upload.filename)
    content = await upload.read()
    if not content:
        raise ValueError("Uploaded file is empty.")

    checksum = hashlib.sha256(content).hexdigest()
    original_name = Path(upload.filename or f"grimoire.{file_format}").name
    stored_name = f"{checksum}{Path(original_name).suffix.lower()}"
    storage_path = _grimoire_storage_dir() / stored_name
    if not storage_path.exists():
        storage_path.write_bytes(content)

    document = SourceDocument(
        original_filename=original_name,
        stored_filename=stored_name,
        storage_path=str(storage_path),
        mime_type=mime_type,
        file_format=file_format,
        file_size_bytes=len(content),
        checksum_sha256=checksum,
        status="uploaded",
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def process_document_job(document_id: int, database_url: str | None = None) -> None:
    if database_url:
        engine = create_engine(
            database_url,
            connect_args={"check_same_thread": False} if "sqlite" in database_url else {},
        )
        session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = session_factory()
    else:
        engine = None
        db = SessionLocal()
    try:
        process_document(db, document_id)
    finally:
        db.close()
        if engine is not None:
            engine.dispose()


def process_document(db: Session, document_id: int) -> None:
    document = db.query(SourceDocument).filter(SourceDocument.id == document_id).first()
    if not document:
        return

    try:
        document.status = "extracting"
        document.processing_error = None
        db.commit()

        raw_sections, full_text, metadata = _extract_document(
            document.storage_path,
            document.file_format,
            document.original_filename,
        )
        document.detected_title = metadata.get("title") or Path(document.original_filename).stem
        document.detected_author = metadata.get("author")
        document.extracted_text = full_text
        document.processing_metadata = metadata
        document.status = "structuring"
        db.commit()

        db.query(DocumentSection).filter(
            DocumentSection.source_document_id == document.id
        ).delete(synchronize_session=False)
        db.commit()

        section_rows = _persist_sections(db, document, raw_sections)
        _enrich_and_match_sections(db, section_rows)

        document.status = "ready"
        document.processing_error = None
        db.commit()
    except Exception as exc:
        document = db.query(SourceDocument).filter(SourceDocument.id == document_id).first()
        if document:
            document.status = "failed"
            document.processing_error = str(exc)
            db.commit()
        raise


def get_document(db: Session, document_id: int) -> SourceDocument | None:
    return db.query(SourceDocument).filter(SourceDocument.id == document_id).first()


def get_document_sections(db: Session, document_id: int) -> list[DocumentSection]:
    return (
        db.query(DocumentSection)
        .filter(DocumentSection.source_document_id == document_id)
        .order_by(DocumentSection.sort_order.asc(), DocumentSection.id.asc())
        .all()
    )


def build_section_tree(sections: list[DocumentSection]) -> list[DocumentSection]:
    by_id = {section.id: section for section in sections}
    children_map: dict[int | None, list[DocumentSection]] = defaultdict(list)
    for section in sections:
        section.children = []
        children_map[section.parent_id].append(section)
    for parent_id, children in children_map.items():
        children.sort(key=lambda item: (item.sort_order, item.id))
        if parent_id is not None and parent_id in by_id:
            by_id[parent_id].children = children
    return children_map.get(None, [])


async def create_course_from_document(
    db: Session,
    document_id: int,
    section_ids: list[int] | None = None,
    title: str | None = None,
    model: str | None = None,
) -> Course:
    document = get_document(db, document_id)
    if not document:
        raise ValueError(f"Document {document_id} not found")
    if document.status != "ready":
        raise ValueError("Document is not ready for course generation")

    sections = _sections_for_course(db, document_id, section_ids or [])
    if not sections:
        raise ValueError("No sections with content are available to forge into a course")

    course_title = title or f"{document.detected_title or Path(document.original_filename).stem} Grimoire"
    course = Course(
        title=course_title,
        description=f"A source-grounded course forged from {document.original_filename}.",
        topic_id=None,
        source_document_id=document.id,
        status="generating",
        generation_mode="document",
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    total_xp = 0
    for index, section in enumerate(sections):
        lesson_payload = await _generate_lesson_from_section(document, section, model=model)
        xp_reward = 15
        lesson = Lesson(
            course_id=course.id,
            source_section_id=section.id,
            title=lesson_payload["title"],
            content_markdown=lesson_payload["content_markdown"],
            task_type=lesson_payload["task_type"],
            task_content=lesson_payload["task_content"],
            sort_order=index,
            xp_reward=xp_reward,
        )
        total_xp += xp_reward
        db.add(lesson)

    course.total_lessons = len(sections)
    course.total_xp = total_xp
    course.status = "ready"
    db.commit()
    db.refresh(course)
    return course


def preview_roadmap_projection(
    db: Session,
    document_id: int,
    section_ids: list[int],
) -> list[dict]:
    document = get_document(db, document_id)
    if not document:
        raise ValueError(f"Document {document_id} not found")

    sections = _projection_sections(db, document_id, section_ids)
    if not sections:
        return []

    paths = (
        db.query(RoadmapPath)
        .filter(RoadmapPath.is_locked == False)  # noqa: E712
        .all()
    )
    path_lookup = {path.id: path for path in paths}
    max_x_by_tier: dict[tuple[int, int], int] = {}
    for path in paths:
        for node in path.nodes:
            key = (path.id, node.tier or 1)
            max_x_by_tier[key] = max(max_x_by_tier.get(key, 0), node.position_x or 0)

    suggestions: list[dict] = []
    for section in sorted(sections, key=lambda item: (item.sort_order, item.id)):
        match = _ensure_section_match(db, section)
        if not match:
            continue
        path = path_lookup.get(match["path_id"])
        if not path:
            continue

        tier = match["tier"]
        key = (path.id, tier)
        next_x = max_x_by_tier.get(key, 0) + 220 if max_x_by_tier.get(key, 0) else 100
        max_x_by_tier[key] = next_x
        next_y = 100 + ((tier - 1) * 200)
        anchor_node = _find_anchor_node(path, match["topic_id"], tier)
        if not anchor_node:
            continue

        suggestions.append(
            {
                "section_id": section.id,
                "section_title": section.title,
                "target_path_id": path.id,
                "target_path_title": path.title,
                "target_tier": tier,
                "anchor_node_id": anchor_node.id,
                "anchor_topic_title": anchor_node.topic.title if anchor_node.topic else section.title,
                "suggested_position_x": next_x,
                "suggested_position_y": next_y,
                "match_confidence": float(match["confidence"]),
                "rationale": match["rationale"],
            }
        )

    return suggestions


def apply_roadmap_projection(
    db: Session,
    document_id: int,
    section_ids: list[int],
) -> dict:
    document = get_document(db, document_id)
    if not document:
        raise ValueError(f"Document {document_id} not found")

    section_lookup = {section.id: section for section in get_document_sections(db, document_id)}
    suggestions = preview_roadmap_projection(db, document_id, section_ids)
    created_node_ids: list[int] = []
    created_topic_ids: list[int] = []
    affected_path_ids: set[int] = set()

    for suggestion in suggestions:
        section = section_lookup.get(suggestion["section_id"])
        if not section:
            continue

        topic = Topic(
            title=section.title,
            description=section.summary or _summarize_text_fallback(section.raw_text or ""),
            ai_generated=True,
            keywords=", ".join(section.keywords or []),
            source_document_id=document.id,
            source_section_id=section.id,
        )
        db.add(topic)
        db.flush()
        created_topic_ids.append(topic.id)

        node = RoadmapNode(
            path_id=suggestion["target_path_id"],
            topic_id=topic.id,
            source_document_id=document.id,
            source_section_id=section.id,
            position_x=suggestion["suggested_position_x"],
            position_y=suggestion["suggested_position_y"],
            tier=suggestion["target_tier"],
            status="available",
        )
        db.add(node)
        db.flush()
        created_node_ids.append(node.id)
        affected_path_ids.add(node.path_id)

        anchor_node = db.query(RoadmapNode).filter(RoadmapNode.id == suggestion["anchor_node_id"]).first()
        if anchor_node:
            if (anchor_node.tier or 1) <= (node.tier or 1):
                _ensure_connection(db, node.path_id, anchor_node.id, node.id)
                successor = _find_successor_node(anchor_node.path, anchor_node.id, node.position_x)
                if successor:
                    _ensure_connection(db, node.path_id, node.id, successor.id)
            else:
                _ensure_connection(db, node.path_id, node.id, anchor_node.id)

    db.commit()
    return {
        "document_id": document.id,
        "inserted_count": len(created_node_ids),
        "created_node_ids": created_node_ids,
        "created_topic_ids": created_topic_ids,
        "affected_path_ids": sorted(affected_path_ids),
    }


def _ensure_connection(db: Session, path_id: int, from_node_id: int, to_node_id: int) -> None:
    existing = (
        db.query(RoadmapConnection)
        .filter(
            RoadmapConnection.path_id == path_id,
            RoadmapConnection.from_node_id == from_node_id,
            RoadmapConnection.to_node_id == to_node_id,
        )
        .first()
    )
    if not existing:
        db.add(
            RoadmapConnection(
                path_id=path_id,
                from_node_id=from_node_id,
                to_node_id=to_node_id,
            )
        )


def _find_anchor_node(path: RoadmapPath, topic_id: int | None, tier: int) -> RoadmapNode | None:
    if topic_id is not None:
        for node in path.nodes:
            if node.topic_id == topic_id:
                return node
    same_tier = [node for node in path.nodes if (node.tier or 1) == tier]
    if same_tier:
        return sorted(same_tier, key=lambda item: item.position_x or 0)[-1]
    if not path.nodes:
        return None
    return sorted(path.nodes, key=lambda item: (item.tier or 1, item.position_x or 0))[-1]


def _find_successor_node(path: RoadmapPath, anchor_node_id: int, inserted_x: int) -> RoadmapNode | None:
    candidates = [
        node for node in path.nodes
        if node.id != anchor_node_id and (node.position_x or 0) > inserted_x
    ]
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: item.position_x or 0)[0]


def _projection_sections(db: Session, document_id: int, section_ids: list[int]) -> list[DocumentSection]:
    sections = get_document_sections(db, document_id)
    lookup = {section.id: section for section in sections}
    return [lookup[section_id] for section_id in section_ids if section_id in lookup]


def _sections_for_course(
    db: Session,
    document_id: int,
    section_ids: list[int],
) -> list[DocumentSection]:
    sections = get_document_sections(db, document_id)
    by_id = {section.id: section for section in sections}
    children: dict[int | None, list[DocumentSection]] = defaultdict(list)
    for section in sections:
        children[section.parent_id].append(section)

    def leaf_descendants(section: DocumentSection) -> list[DocumentSection]:
        branch = children.get(section.id, [])
        if not branch:
            return [section] if (section.raw_text or "").strip() else []
        collected: list[DocumentSection] = []
        for child in branch:
            collected.extend(leaf_descendants(child))
        return collected

    selected: list[DocumentSection]
    if section_ids:
        selected = []
        for section_id in section_ids:
            section = by_id.get(section_id)
            if not section:
                continue
            selected.extend(leaf_descendants(section))
    else:
        selected = []
        for section in sections:
            if section.id not in children and (section.raw_text or "").strip():
                selected.append(section)

    deduped: dict[int, DocumentSection] = {}
    for section in selected:
        deduped[section.id] = section
    return sorted(deduped.values(), key=lambda item: (item.sort_order, item.id))


def _persist_sections(
    db: Session,
    document: SourceDocument,
    raw_sections: list[dict],
) -> list[DocumentSection]:
    if not raw_sections:
        raw_sections = [
            {
                "title": document.detected_title or Path(document.original_filename).stem,
                "depth": 1,
                "sort_order": 1,
                "page_start": None,
                "page_end": None,
                "char_start": 0,
                "char_end": len(document.extracted_text or ""),
                "raw_text": document.extracted_text or "",
            }
        ]

    stack: dict[int, DocumentSection] = {}
    persisted: list[DocumentSection] = []
    for raw in raw_sections:
        depth = max(int(raw.get("depth", 1) or 1), 1)
        parent = stack.get(depth - 1)
        section = DocumentSection(
            source_document_id=document.id,
            parent_id=parent.id if parent else None,
            title=raw["title"],
            sort_order=raw["sort_order"],
            depth=depth,
            page_start=raw.get("page_start"),
            page_end=raw.get("page_end"),
            char_start=raw.get("char_start"),
            char_end=raw.get("char_end"),
            raw_text=(raw.get("raw_text") or "").strip() or None,
        )
        db.add(section)
        db.flush()
        persisted.append(section)
        stack[depth] = section
        for key in list(stack.keys()):
            if key > depth:
                stack.pop(key, None)
    db.commit()
    for section in persisted:
        db.refresh(section)
    return persisted


def _enrich_and_match_sections(db: Session, sections: list[DocumentSection]) -> None:
    for section in sections:
        summary = _summarize_text_fallback(section.raw_text or section.title)
        keywords = _extract_keywords_fallback(section.title, section.raw_text or summary)
        match = _match_section_to_visible_path(db, section.title, summary, keywords)
        section.summary = summary
        section.keywords = keywords
        if match:
            section.suggested_path_id = match["path_id"]
            section.suggested_topic_id = match["topic_id"]
            section.suggested_tier = match["tier"]
            section.match_confidence = match["confidence"]
            section.match_rationale = match["rationale"]
        else:
            section.suggested_tier = max(1, min(5, section.depth))
            section.match_confidence = 0.0
            section.match_rationale = "No confident roadmap match was found."
    db.commit()


def _ensure_section_match(db: Session, section: DocumentSection) -> dict | None:
    if section.suggested_path_id and section.suggested_topic_id and section.suggested_tier:
        return {
            "path_id": section.suggested_path_id,
            "topic_id": section.suggested_topic_id,
            "tier": section.suggested_tier,
            "confidence": section.match_confidence or 0.5,
            "rationale": section.match_rationale or "Matched from stored section metadata.",
        }
    match = _match_section_to_visible_path(
        db,
        section.title,
        section.summary or section.title,
        section.keywords or [],
    )
    if match:
        section.suggested_path_id = match["path_id"]
        section.suggested_topic_id = match["topic_id"]
        section.suggested_tier = match["tier"]
        section.match_confidence = match["confidence"]
        section.match_rationale = match["rationale"]
        db.commit()
    return match


def _match_section_to_visible_path(
    db: Session,
    title: str,
    summary: str,
    keywords: list[str],
) -> dict | None:
    title_tokens = _normalize_tokens(title)
    summary_tokens = _normalize_tokens(summary)
    keyword_tokens = _normalize_tokens(" ".join(keywords))
    best_match: dict | None = None
    best_score = 0

    visible_paths = (
        db.query(RoadmapPath)
        .filter(RoadmapPath.is_locked == False)  # noqa: E712
        .all()
    )
    for path in visible_paths:
        for node in path.nodes:
            topic = node.topic
            if not topic:
                continue
            topic_tokens = _normalize_tokens(topic.title, topic.description, topic.keywords)
            score = 0
            if title.strip().lower() == topic.title.strip().lower():
                score += 10
            elif title.strip().lower() in topic.title.strip().lower() or topic.title.strip().lower() in title.strip().lower():
                score += 6
            score += len(title_tokens & topic_tokens) * 3
            score += len(keyword_tokens & topic_tokens) * 2
            score += len(summary_tokens & topic_tokens)
            if score > best_score:
                best_score = score
                confidence = min(0.95, 0.35 + (score * 0.05))
                best_match = {
                    "path_id": path.id,
                    "topic_id": topic.id,
                    "tier": node.tier or 1,
                    "confidence": round(confidence, 2),
                    "rationale": f"Matched to '{topic.title}' in '{path.title}' from title and keyword overlap.",
                }

    if best_score <= 0:
        return None
    return best_match


async def _generate_lesson_from_section(
    document: SourceDocument,
    section: DocumentSection,
    model: str | None = None,
) -> dict:
    settings = get_settings()
    raw_text = (section.raw_text or "").strip()
    summary = section.summary or _summarize_text_fallback(raw_text or section.title)
    task_type = _infer_task_type(section.keywords or [])
    if settings.OPENAI_API_KEY:
        try:
            result = await client.completion_json(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You turn source material into grounded lessons. "
                            "Return JSON only with keys lesson_title, content_markdown, task_type, task_content. "
                            "Do not invent core concepts not supported by the source; brief explanatory enrichment is allowed."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Document title: {document.detected_title or document.original_filename}\n"
                            f"Section title: {section.title}\n"
                            f"Section summary: {summary}\n"
                            f"Keywords: {', '.join(section.keywords or [])}\n"
                            f"Source text:\n{raw_text[:5000]}"
                        ),
                    },
                ],
                model=model or settings.LLM_DEFAULT_MODEL,
                temperature=0.4,
                max_tokens=4096,
            )
            content_markdown = result.get("content_markdown")
            generated_task_type = result.get("task_type")
            generated_task_content = result.get("task_content")
            if isinstance(content_markdown, str) and content_markdown.strip():
                return {
                    "title": result.get("lesson_title") or section.title,
                    "content_markdown": content_markdown,
                    "task_type": generated_task_type or task_type,
                    "task_content": generated_task_content or _fallback_task_content(section, task_type),
                }
        except Exception:
            pass

    excerpt = raw_text[:2200] if raw_text else summary
    content_markdown = (
        f"## {section.title}\n\n"
        f"### Why This Matters\n\n{summary}\n\n"
        f"### Source-Grounded Notes\n\n{excerpt}\n\n"
        f"### Key Takeaways\n\n"
        f"- Focus on the concepts emphasized in this section.\n"
        f"- Translate the source material into practical understanding.\n"
        f"- Be ready to explain or apply the ideas in your own words.\n"
    )
    return {
        "title": section.title,
        "content_markdown": content_markdown,
        "task_type": task_type,
        "task_content": _fallback_task_content(section, task_type),
    }


def _infer_task_type(keywords: list[str]) -> str:
    keyword_blob = " ".join(keywords).lower()
    coding_terms = {"code", "coding", "api", "function", "class", "script", "python", "javascript", "react", "fastapi"}
    if any(term in keyword_blob for term in coding_terms):
        return "coding"
    return "quiz"


def _fallback_task_content(section: DocumentSection, task_type: str) -> str:
    if task_type == "coding":
        return (
            f"Write a short example that applies the main idea from '{section.title}'. "
            "Include a brief note describing why your example reflects the source section."
        )
    return (
        f"Summarize the main idea of '{section.title}' and list two practical takeaways "
        "that a learner should remember before moving on."
    )


def _extract_document(storage_path: str, file_format: str, original_filename: str) -> tuple[list[dict], str, dict]:
    if file_format == "pdf":
        return _extract_pdf_sections(storage_path, original_filename)
    if file_format == "epub":
        return _extract_epub_sections(storage_path, original_filename)
    return _extract_txt_sections(storage_path, original_filename)


def _extract_pdf_sections(storage_path: str, original_filename: str) -> tuple[list[dict], str, dict]:
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("PDF support requires PyMuPDF to be installed") from exc

    document = fitz.open(storage_path)
    metadata = {
        "title": document.metadata.get("title") or Path(original_filename).stem,
        "author": document.metadata.get("author"),
        "page_count": document.page_count,
    }
    full_text = "\n\n".join(document.load_page(index).get_text("text") for index in range(document.page_count))
    toc = document.get_toc(simple=True)
    raw_sections: list[dict] = []

    if toc:
        for index, entry in enumerate(toc):
            level, title, page = entry
            next_page = toc[index + 1][2] - 1 if index + 1 < len(toc) else document.page_count
            page_start = max(page, 1)
            page_end = max(page_start, next_page)
            text = "\n".join(
                document.load_page(page_index).get_text("text")
                for page_index in range(page_start - 1, page_end)
            )
            raw_sections.append(
                {
                    "title": title.strip() or f"Section {index + 1}",
                    "depth": max(level, 1),
                    "sort_order": index + 1,
                    "page_start": page_start,
                    "page_end": page_end,
                    "raw_text": text,
                }
            )
    else:
        chunk_size = 3
        for start in range(0, document.page_count, chunk_size):
            end = min(document.page_count, start + chunk_size)
            text = "\n".join(document.load_page(page_index).get_text("text") for page_index in range(start, end))
            title = _first_meaningful_line(text) or f"Pages {start + 1}-{end}"
            raw_sections.append(
                {
                    "title": title,
                    "depth": 1,
                    "sort_order": len(raw_sections) + 1,
                    "page_start": start + 1,
                    "page_end": end,
                    "raw_text": text,
                }
            )

    return _finalize_raw_sections(raw_sections, metadata, full_text)


def _extract_epub_sections(storage_path: str, original_filename: str) -> tuple[list[dict], str, dict]:
    try:
        from bs4 import BeautifulSoup
        from ebooklib import ITEM_DOCUMENT, epub
    except ImportError as exc:
        raise RuntimeError("EPUB support requires ebooklib and beautifulsoup4") from exc

    book = epub.read_epub(storage_path)
    items = [item for item in book.get_items() if item.get_type() == ITEM_DOCUMENT]
    metadata = {
        "title": _first_metadata(book.get_metadata("DC", "title")) or Path(original_filename).stem,
        "author": _first_metadata(book.get_metadata("DC", "creator")),
        "section_count": len(items),
    }
    raw_sections: list[dict] = []
    text_fragments: list[str] = []
    for item in items:
        soup = BeautifulSoup(item.get_content(), "html.parser")
        title = None
        for selector in ("h1", "h2", "title"):
            node = soup.find(selector)
            if node and node.get_text(strip=True):
                title = node.get_text(" ", strip=True)
                break
        text = soup.get_text("\n", strip=True)
        if not text.strip():
            continue
        text_fragments.append(text)
        raw_sections.append(
            {
                "title": title or f"Section {len(raw_sections) + 1}",
                "depth": 1,
                "sort_order": len(raw_sections) + 1,
                "page_start": None,
                "page_end": None,
                "raw_text": text,
            }
        )

    full_text = "\n\n".join(text_fragments)
    return _finalize_raw_sections(raw_sections, metadata, full_text)


def _extract_txt_sections(storage_path: str, original_filename: str) -> tuple[list[dict], str, dict]:
    text = Path(storage_path).read_text(encoding="utf-8", errors="ignore")
    metadata = {
        "title": Path(original_filename).stem,
        "author": None,
    }
    heading_pattern = re.compile(r"^(chapter|section|part)\b", re.IGNORECASE)
    shouty_pattern = re.compile(r"^[A-Z][A-Z0-9 &\-:]{4,}$")
    sections: list[dict] = []
    current_title = metadata["title"]
    current_lines: list[str] = []

    def flush_current() -> None:
        nonlocal current_lines, current_title
        content = "\n".join(current_lines).strip()
        if content:
            sections.append(
                {
                    "title": current_title or f"Section {len(sections) + 1}",
                    "depth": 1,
                    "sort_order": len(sections) + 1,
                    "page_start": None,
                    "page_end": None,
                    "raw_text": content,
                }
            )
        current_lines = []

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            current_lines.append(raw_line)
            continue
        is_heading = bool(heading_pattern.match(line) or shouty_pattern.match(line))
        if is_heading and current_lines:
            flush_current()
            current_title = line.title()
        elif is_heading:
            current_title = line.title()
        else:
            current_lines.append(raw_line)

    flush_current()

    if not sections:
        words = text.split()
        chunk_size = 700
        for index, start in enumerate(range(0, len(words), chunk_size)):
            chunk = " ".join(words[start:start + chunk_size])
            sections.append(
                {
                    "title": f"Passage {index + 1}",
                    "depth": 1,
                    "sort_order": index + 1,
                    "page_start": None,
                    "page_end": None,
                    "raw_text": chunk,
                }
            )

    return _finalize_raw_sections(sections, metadata, text)


def _finalize_raw_sections(
    raw_sections: list[dict],
    metadata: dict,
    full_text: str,
) -> tuple[list[dict], str, dict]:
    normalized: list[dict] = []
    cursor = 0
    for index, raw in enumerate(raw_sections):
        text = (raw.get("raw_text") or "").strip()
        if not text:
            continue
        start = cursor
        end = start + len(text)
        cursor = end + 1
        normalized.append(
            {
                "title": raw["title"],
                "depth": raw.get("depth", 1),
                "sort_order": index + 1,
                "page_start": raw.get("page_start"),
                "page_end": raw.get("page_end"),
                "char_start": start,
                "char_end": end,
                "raw_text": text,
            }
        )
    metadata["section_count"] = len(normalized)
    return normalized, full_text, metadata


def _first_meaningful_line(text: str) -> str | None:
    for line in text.splitlines():
        compact = line.strip()
        if compact and len(compact) > 4:
            return compact[:120]
    return None


def _first_metadata(items: Iterable[tuple[str, dict]]) -> str | None:
    for value, _attrs in items:
        if value:
            return value
    return None
