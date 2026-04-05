"""Topic and roadmap generation service."""

from __future__ import annotations

import logging
import math

from sqlalchemy.orm import Session

from server.config import get_settings
from server.llm import client
from server.models import RoadmapConnection, RoadmapNode, RoadmapPath, Topic, TopicConnection
from server.services import progression_service

logger = logging.getLogger(__name__)


def _fallback_roadmap(topic: str) -> dict:
    title = topic.strip().title()
    nodes = [
        {
            "title": f"{title} Foundations",
            "description": f"Understand the fundamentals of {topic}.",
            "keywords": [topic, "basics", "fundamentals"],
            "tier": 1,
        },
        {
            "title": f"{title} Core Concepts",
            "description": f"Build a working mental model for core {topic} concepts.",
            "keywords": [topic, "core concepts"],
            "tier": 2,
        },
        {
            "title": f"{title} Tooling",
            "description": f"Learn the common tools and workflows used with {topic}.",
            "keywords": [topic, "tooling", "workflow"],
            "tier": 2,
        },
        {
            "title": f"{title} Applied Practice",
            "description": f"Apply {topic} through guided exercises and small projects.",
            "keywords": [topic, "practice", "projects"],
            "tier": 3,
        },
        {
            "title": f"{title} Production Patterns",
            "description": f"Study real-world patterns, tradeoffs, and maintenance concerns.",
            "keywords": [topic, "production", "patterns"],
            "tier": 4,
        },
    ]

    connections = [
        {"from": nodes[0]["title"], "to": nodes[1]["title"]},
        {"from": nodes[0]["title"], "to": nodes[2]["title"]},
        {"from": nodes[1]["title"], "to": nodes[3]["title"]},
        {"from": nodes[2]["title"], "to": nodes[3]["title"]},
        {"from": nodes[3]["title"], "to": nodes[4]["title"]},
    ]

    return {
        "title": title,
        "description": f"An AI-shaped roadmap for learning {topic} in practical stages.",
        "nodes": nodes,
        "connections": connections,
    }


async def _llm_roadmap(topic: str) -> dict:
    settings = get_settings()
    if not settings.is_ai_configured():
        return _fallback_roadmap(topic)

    messages = [
        {
            "role": "system",
            "content": (
                "You generate concise learning roadmaps for software topics. "
                "Return JSON with keys title, description, nodes, connections. "
                "nodes must be 5-8 objects with title, description, keywords, tier. "
                "connections must be objects with from and to matching node titles. "
                "Keep the roadmap practical and staged from fundamentals to advanced application."
            ),
        },
        {
            "role": "user",
            "content": f"Create a learning roadmap for: {topic}",
        },
    ]

    try:
        result = await client.completion_json(
            messages=messages,
            model=settings.LLM_FAST_MODEL,
            temperature=0.4,
            max_tokens=2048,
            output_kind="json_object",
        )
    except Exception as exc:
        logger.warning("Falling back to deterministic roadmap for %s: %s", topic, exc)
        return _fallback_roadmap(topic)

    if not isinstance(result, dict) or not result.get("nodes"):
        return _fallback_roadmap(topic)

    return result


def _resolve_positions(nodes: list[dict]) -> list[dict]:
    tiers: dict[int, list[dict]] = {}
    for node in nodes:
        tier = max(int(node.get("tier", 1)), 1)
        node["tier"] = tier
        tiers.setdefault(tier, []).append(node)

    max_width = max((len(group) for group in tiers.values()), default=1)
    for tier, group in tiers.items():
        spread = max(len(group), 1)
        for index, node in enumerate(group):
            centered = index - (spread - 1) / 2
            node["position_x"] = int(centered * 220)
            node["position_y"] = int((tier - 1) * 180)
    return nodes


async def generate_custom_roadmap(db: Session, topic_name: str) -> RoadmapPath:
    roadmap_data = await _llm_roadmap(topic_name)
    nodes_data = _resolve_positions(list(roadmap_data.get("nodes", [])))
    profile = progression_service.get_or_create_profile(db)

    roadmap_path = RoadmapPath(
        title=roadmap_data.get("title", topic_name.strip().title()),
        description=roadmap_data.get(
            "description",
            f"An AI-generated roadmap for {topic_name.strip()}",
        ),
        is_custom=True,
        user_id=profile.id,
        icon="Sparkles",
        colors="from-cyan-500 to-blue-500",
    )
    db.add(roadmap_path)
    db.commit()
    db.refresh(roadmap_path)

    topic_lookup: dict[str, Topic] = {}
    node_lookup: dict[str, RoadmapNode] = {}

    for index, node_data in enumerate(nodes_data):
        topic = Topic(
            title=node_data["title"],
            description=node_data.get("description"),
            ai_generated=True,
            keywords=", ".join(node_data.get("keywords", [])) or None,
        )
        db.add(topic)
        db.commit()
        db.refresh(topic)
        topic_lookup[topic.title] = topic

        roadmap_node = RoadmapNode(
            path_id=roadmap_path.id,
            topic_id=topic.id,
            tier=node_data["tier"],
            position_x=node_data["position_x"],
            position_y=node_data["position_y"],
            status="available" if index == 0 else "locked",
        )
        db.add(roadmap_node)
        db.commit()
        db.refresh(roadmap_node)
        node_lookup[topic.title] = roadmap_node

    for connection in roadmap_data.get("connections", []):
        from_title = connection.get("from")
        to_title = connection.get("to")
        if not from_title or not to_title:
            continue
        from_topic = topic_lookup.get(from_title)
        to_topic = topic_lookup.get(to_title)
        from_node = node_lookup.get(from_title)
        to_node = node_lookup.get(to_title)
        if not from_topic or not to_topic or not from_node or not to_node:
            continue

        db.add(
            TopicConnection(
                from_topic_id=from_topic.id,
                to_topic_id=to_topic.id,
                relationship_type="subtopic"
                if to_node.tier == from_node.tier + 1
                else "related",
                ai_confidence=round(max(0.35, 1 - math.fabs(to_node.tier - from_node.tier) * 0.2), 2),
            )
        )
        db.add(
            RoadmapConnection(
                path_id=roadmap_path.id,
                from_node_id=from_node.id,
                to_node_id=to_node.id,
            )
        )

    db.commit()
    db.refresh(roadmap_path)
    return roadmap_path
