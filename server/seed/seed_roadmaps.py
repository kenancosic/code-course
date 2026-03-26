"""Seed script to populate database with roadmap data."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from server.database import Base
from server.models.roadmap import RoadmapPath, RoadmapNode, RoadmapConnection
from server.models.topic import Topic, TopicConnection
from server.models.progress import UserProfile

def create_topic_with_subtopics(db, main_title, subtopics):
    # Check if main topic exists
    main_topic = db.query(Topic).filter(Topic.title == main_title).first()
    if not main_topic:
        main_topic = Topic(title=main_title, description=f"Learn {main_title}")
        db.add(main_topic)
        db.flush()

    for sub_title in subtopics:
        sub_topic = db.query(Topic).filter(Topic.title == sub_title).first()
        if not sub_topic:
            sub_topic = Topic(title=sub_title, description=f"Subtopic: {sub_title}")
            db.add(sub_topic)
            db.flush()
        
        # Check connection
        conn = db.query(TopicConnection).filter(
            TopicConnection.from_topic_id == main_topic.id,
            TopicConnection.to_topic_id == sub_topic.id,
            TopicConnection.relationship_type == "subtopic"
        ).first()
        if not conn:
            conn = TopicConnection(
                from_topic_id=main_topic.id,
                to_topic_id=sub_topic.id,
                relationship_type="subtopic"
            )
            db.add(conn)
    return main_topic

def get_or_create_path(db, title, description, icon, colors, sort_order):
    path = db.query(RoadmapPath).filter(RoadmapPath.title == title, RoadmapPath.is_custom == False).first()
    if not path:
        path = RoadmapPath(
            title=title,
            description=description,
            icon=icon,
            colors=colors,
            sort_order=sort_order,
            is_locked=False,
            is_custom=False
        )
        db.add(path)
        db.flush()
    return path

def create_roadmap_node(db, path_id, topic_id, pos_x, pos_y, tier):
    node = db.query(RoadmapNode).filter(
        RoadmapNode.path_id == path_id,
        RoadmapNode.topic_id == topic_id
    ).first()
    if not node:
        node = RoadmapNode(
            path_id=path_id,
            topic_id=topic_id,
            position_x=pos_x,
            position_y=pos_y,
            tier=tier,
            status="locked"
        )
        db.add(node)
        db.flush()
    return node

def create_roadmap_connection(db, path_id, from_node_id, to_node_id):
    conn = db.query(RoadmapConnection).filter(
        RoadmapConnection.path_id == path_id,
        RoadmapConnection.from_node_id == from_node_id,
        RoadmapConnection.to_node_id == to_node_id
    ).first()
    if not conn:
        conn = RoadmapConnection(
            path_id=path_id,
            from_node_id=from_node_id,
            to_node_id=to_node_id,
            connection_type="default"
        )
        db.add(conn)

def seed_data(db):
    print("Creating topics and subtopics...")
    # 1. Create Topics and Subtopics
    html_topic = create_topic_with_subtopics(db, "HTML", [
        "HTML Basics", "Semantic HTML", "Forms and Validation", "Accessibility"
    ])
    css_topic = create_topic_with_subtopics(db, "CSS", [
        "CSS Selectors", "CSS Specificity", "CSS Box Model", "CSS Display", 
        "CSS Flexbox", "CSS Grid", "CSS Animations"
    ])
    js_topic = create_topic_with_subtopics(db, "JavaScript", [
        "Syntax & Basic Constructs", "DOM Manipulation", "Fetch API / Ajax", "ES6+ Features"
    ])

    internet_topic = create_topic_with_subtopics(db, "Internet Fundamentals", [
        "How does the internet work?", "What is HTTP?", "Browsers and how they work", "DNS and how it works"
    ])
    os_topic = create_topic_with_subtopics(db, "Operating Systems", [
        "Terminal Usage", "How OS works in General", "Process Management", "Threads and Concurrency"
    ])
    lang_topic = create_topic_with_subtopics(db, "Programming Languages", [
        "Python", "Java", "C#", "Go", "Rust", "Node.js"
    ])

    print("Creating roadmap paths...")
    # 2. Create Roadmap Paths
    frontend_path = get_or_create_path(
        db, 
        "Frontend Developer", 
        "Step by step guide to becoming a modern frontend developer.", 
        "Layout", 
        "bg-gradient-to-br from-blue-500 to-cyan-500", 
        1
    )
    backend_path = get_or_create_path(
        db, 
        "Backend Developer", 
        "Step by step guide to becoming a modern backend developer.", 
        "Server", 
        "bg-gradient-to-br from-green-500 to-emerald-500", 
        2
    )

    print("Creating roadmap nodes...")
    # 3. Create Roadmap Nodes
    # Frontend Nodes
    fe_node_html = create_roadmap_node(db, frontend_path.id, html_topic.id, 0, 0, 1)
    fe_node_css = create_roadmap_node(db, frontend_path.id, css_topic.id, 0, 100, 2)
    fe_node_js = create_roadmap_node(db, frontend_path.id, js_topic.id, 0, 200, 3)

    create_roadmap_connection(db, frontend_path.id, fe_node_html.id, fe_node_css.id)
    create_roadmap_connection(db, frontend_path.id, fe_node_css.id, fe_node_js.id)

    # Backend Nodes
    be_node_internet = create_roadmap_node(db, backend_path.id, internet_topic.id, 0, 0, 1)
    be_node_os = create_roadmap_node(db, backend_path.id, os_topic.id, 0, 100, 2)
    be_node_lang = create_roadmap_node(db, backend_path.id, lang_topic.id, 0, 200, 3)

    create_roadmap_connection(db, backend_path.id, be_node_internet.id, be_node_os.id)
    create_roadmap_connection(db, backend_path.id, be_node_os.id, be_node_lang.id)

    print("Creating default user profile...")
    # 4. Create Default User Profile if needed
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

    db.commit()

def main():
    from server.config import get_settings
    settings = get_settings()
    database_url = settings.DATABASE_URL
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False} if "sqlite" in database_url else {},
    )
    
    # In case there are missing tables, create them
    Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("Seeding database with updated schema...")
        seed_data(db)
        print("Seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
