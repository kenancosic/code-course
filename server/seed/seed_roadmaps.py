"""Seed script to populate database with roadmap data from JSON files."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import json
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from server.database import Base
from server.models import RoadmapPath, RoadmapNode, RoadmapConnection
from server.models.progress import UserProfile


def load_json_data(filename: str) -> dict:
    """Load JSON data from the data directory."""
    data_path = Path(__file__).parent / "data" / filename
    with open(data_path, "r", encoding="utf-8") as f:
        return json.load(f)


def seed_roadmap(db, data: dict):
    """Seed a single roadmap path with its nodes and connections."""
    path_data = data["path"]
    
    # Create or update path
    path = db.query(RoadmapPath).filter(RoadmapPath.id == path_data["id"]).first()
    if path:
        path.title = path_data["title"]
        path.description = path_data.get("description")
        path.icon = path_data.get("icon")
        path.colors = path_data.get("colors")
        path.sort_order = path_data.get("sort_order", 0)
        path.is_locked = path_data.get("is_locked", False)
    else:
        path = RoadmapPath(
            id=path_data["id"],
            title=path_data["title"],
            description=path_data.get("description"),
            icon=path_data.get("icon"),
            colors=path_data.get("colors"),
            sort_order=path_data.get("sort_order", 0),
            is_locked=path_data.get("is_locked", False),
        )
        db.add(path)
    
    db.flush()  # Ensure path.id is available
    
    # Create or update nodes
    node_id_map = {}  # Map old IDs to database IDs
    for node_data in data["nodes"]:
        node = db.query(RoadmapNode).filter(
            RoadmapNode.id == node_data["id"]
        ).first()
        
        if node:
            node.path_id = path.id
            node.title = node_data["title"]
            node.description = node_data.get("description")
            node.position_x = node_data.get("position_x", 0)
            node.position_y = node_data.get("position_y", 0)
            node.tier = node_data.get("tier", 1)
            node.topic_keywords = node_data.get("topic_keywords")
        else:
            node = RoadmapNode(
                id=node_data["id"],
                path_id=path.id,
                title=node_data["title"],
                description=node_data.get("description"),
                position_x=node_data.get("position_x", 0),
                position_y=node_data.get("position_y", 0),
                tier=node_data.get("tier", 1),
                topic_keywords=node_data.get("topic_keywords"),
            )
            db.add(node)
        
        node_id_map[node_data["id"]] = node_data["id"]
    
    db.flush()  # Ensure all nodes have IDs
    
    # Create or update connections
    for conn_data in data.get("connections", []):
        from_id = conn_data["from_node_id"]
        to_id = conn_data["to_node_id"]
        
        # Check if connection already exists
        existing = db.query(RoadmapConnection).filter(
            RoadmapConnection.path_id == path.id,
            RoadmapConnection.from_node_id == from_id,
            RoadmapConnection.to_node_id == to_id,
        ).first()
        
        if not existing:
            conn = RoadmapConnection(
                path_id=path.id,
                from_node_id=from_id,
                to_node_id=to_id,
                connection_type=conn_data.get("connection_type", "default"),
            )
            db.add(conn)


def seed_default_user(db):
    """Create default user profile if it doesn't exist."""
    user = db.query(UserProfile).filter(UserProfile.id == 1).first()
    if not user:
        user = UserProfile(
            id=1,
            display_name="Developer",
            avatar_seed="default",
            total_xp=0,
            level=1,
            current_path_id=None,
        )
        db.add(user)


def main():
    """Main seeding function."""
    # Get database URL from environment or use default
    database_url = os.getenv("DATABASE_URL", "sqlite:///./mythiccode.db")
    
    # Create engine
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False} if "sqlite" in database_url else {},
    )
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Seed all roadmaps
        roadmap_files = ["frontend.json", "backend.json", "devops.json", "database.json"]
        
        for filename in roadmap_files:
            print(f"Seeding {filename}...")
            data = load_json_data(filename)
            seed_roadmap(db, data)
        
        # Seed default user
        print("Creating default user profile...")
        seed_default_user(db)
        
        # Commit all changes
        db.commit()
        print("Seeding completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
