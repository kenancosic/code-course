"""Seed script to populate database with roadmap data from JSON files."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from server.database import Base
from server.models.roadmap import RoadmapPath, RoadmapNode, RoadmapConnection
from server.models.topic import Topic, TopicConnection
from server.models.progress import UserProfile

# ── Data directory ──────────────────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

JSON_FILES = ["frontend.json", "backend.json", "devops.json", "database.json"]

# ── Subtopic definitions per node title (all 4 roadmaps) ───────────────────
SUBTOPICS = {
    # Frontend Development
    "Internet Basics": ["How the Internet Works", "HTTP/HTTPS", "DNS and Domain Names", "Web Browsers", "Hosting and Deployment"],
    "HTML Fundamentals": ["HTML Document Structure", "Semantic HTML", "Forms and Validation", "Accessibility (a11y)", "SEO Basics"],
    "CSS Basics": ["CSS Selectors", "CSS Specificity", "CSS Box Model", "CSS Display", "CSS Positioning", "Colors and Typography"],
    "CSS Layouts": ["CSS Flexbox", "CSS Grid", "Responsive Design", "Media Queries", "CSS Variables", "CSS Animations", "CSS Transforms"],
    "JavaScript Basics": ["Variables and Data Types", "Functions and Scope", "Control Flow", "Arrays and Objects", "Error Handling"],
    "DOM Manipulation": ["Selecting Elements", "Event Handling", "Creating and Removing Elements", "DOM Traversal", "Event Delegation"],
    "Async JavaScript": ["Callbacks", "Promises", "Async/Await", "Fetch API", "Error Handling in Async Code"],
    "ES6+ Features": ["Arrow Functions", "Destructuring", "Template Literals", "Modules (Import/Export)", "Spread and Rest Operators", "Classes"],
    "Git & GitHub": ["Git Basics", "Branching and Merging", "Pull Requests", "Conflict Resolution", "Git Workflows"],
    "Package Managers": ["npm Basics", "package.json", "Semantic Versioning", "npm Scripts", "Dependency Management"],
    "Build Tools": ["Vite", "Webpack Basics", "Babel and Transpiling", "Code Splitting", "Environment Variables"],
    "React Basics": ["Components and JSX", "Props and State", "Conditional Rendering", "Lists and Keys", "Event Handling in React"],
    "React Hooks": ["useState", "useEffect", "useContext", "useRef", "useMemo and useCallback", "Custom Hooks"],
    "React Router": ["Route Configuration", "Navigation and Links", "URL Parameters", "Nested Routes", "Protected Routes"],
    "State Management": ["Context API", "Redux Toolkit", "Zustand", "State Patterns", "Server State vs Client State"],
    "Styled Components": ["CSS-in-JS Basics", "Theming", "Dynamic Styles", "Global Styles"],
    "Tailwind CSS": ["Utility Classes", "Responsive Design", "Customization", "Component Patterns"],
    "TypeScript": ["Basic Types", "Interfaces and Types", "Generics", "Type Guards", "Utility Types"],
    "Testing Basics": ["Unit Testing with Jest", "React Testing Library", "Integration Tests", "E2E with Cypress", "Test Patterns"],
    "Next.js": ["Pages and Routing", "SSR vs SSG", "API Routes", "Data Fetching", "Middleware"],
    "Performance": ["Lazy Loading", "Code Splitting", "Core Web Vitals", "Image Optimization", "Caching Strategies"],
    "Authentication": ["JWT Basics", "OAuth 2.0", "Session Management", "Protected Routes", "Security Best Practices"],
    "PWA": ["Service Workers", "Web App Manifest", "Offline Support", "Push Notifications", "Cache Strategies"],
    "Deployment": ["Vercel", "Netlify", "CI/CD Pipelines", "Environment Config", "Monitoring"],
    # Backend Development
    "Internet & Networking": ["TCP/IP Model", "HTTP Methods", "Status Codes", "REST Principles", "WebSockets"],
    "OS Basics": ["Process Management", "Threads and Concurrency", "Memory Management", "File Systems", "Shell Scripting"],
    "Programming Language": ["Python Fundamentals", "Node.js Fundamentals", "Java Fundamentals", "Go Fundamentals", "Language Selection Guide"],
    "Version Control": ["Git Basics", "Branching Strategies", "Code Review", "Git Hooks", "Monorepo Management"],
    "Relational Databases": ["SQL Fundamentals", "Database Design", "Normalization", "Joins and Subqueries", "Indexing"],
    "NoSQL Databases": ["MongoDB Basics", "Redis Basics", "Document vs Key-Value", "When to Use NoSQL", "Data Modeling"],
    "APIs & REST": ["RESTful Design", "Request/Response Cycle", "Authentication", "Rate Limiting", "API Versioning", "OpenAPI/Swagger"],
    # NOTE: "Authentication" is already defined in Frontend, same subtopics key is reused
    # DevOps
    "Linux Fundamentals": ["Command Line Basics", "File Permissions", "Shell Scripting", "Package Management", "System Monitoring"],
    # NOTE: "Version Control" already defined above (Backend), same key reused
    "Containers": ["Docker Basics", "Dockerfile", "Docker Compose", "Image Optimization", "Container Networking"],
    "CI/CD": ["GitHub Actions", "Pipeline Design", "Automated Testing", "Deployment Strategies", "Secrets Management"],
    "Cloud Platforms": ["AWS Basics", "Azure Basics", "GCP Basics", "Infrastructure as Code", "Cost Management"],
    "Kubernetes": ["Pods and Deployments", "Services and Networking", "ConfigMaps and Secrets", "Scaling", "Helm Charts"],
    # Database Engineering
    "SQL Fundamentals": ["SELECT Queries", "Joins", "Aggregations", "Subqueries", "Data Manipulation"],
    "Database Design": ["ER Diagrams", "Normalization Forms", "Relationships", "Schema Patterns", "Denormalization"],
    "Advanced SQL": ["CTEs", "Window Functions", "Stored Procedures", "Triggers", "Views"],
    "Indexing & Optimization": ["Index Types", "Query Plans", "Query Optimization", "Profiling Tools", "Partitioning"],
    "NoSQL Systems": ["MongoDB Queries", "Redis Data Structures", "Cassandra Basics", "Graph Databases", "Choosing NoSQL"],
    "Transactions & ACID": ["Transaction Basics", "Isolation Levels", "Locking Mechanisms", "Distributed Transactions", "CAP Theorem"],
}


# ── Helper functions ────────────────────────────────────────────────────────

def get_or_create_topic(db, title, description=None, keywords=None):
    """Return existing topic or create a new one."""
    topic = db.query(Topic).filter(Topic.title == title).first()
    if not topic:
        topic = Topic(
            title=title,
            description=description or f"Learn {title}",
            ai_generated=False,
            keywords=keywords,
        )
        db.add(topic)
        db.flush()
    return topic


def create_subtopic_connections(db, parent_topic, subtopic_titles):
    """Create subtopic Topic records and TopicConnection records."""
    for sub_title in subtopic_titles:
        sub_topic = get_or_create_topic(db, sub_title, description=f"Subtopic: {sub_title}")
        conn = db.query(TopicConnection).filter(
            TopicConnection.from_topic_id == parent_topic.id,
            TopicConnection.to_topic_id == sub_topic.id,
            TopicConnection.relationship_type == "subtopic",
        ).first()
        if not conn:
            db.add(TopicConnection(
                from_topic_id=parent_topic.id,
                to_topic_id=sub_topic.id,
                relationship_type="subtopic",
            ))


def get_or_create_path(db, path_data):
    """Return existing RoadmapPath or create from JSON path data."""
    path = db.query(RoadmapPath).filter(
        RoadmapPath.title == path_data["title"],
        RoadmapPath.is_custom == False,  # noqa: E712
    ).first()
    if not path:
        path = RoadmapPath(
            title=path_data["title"],
            description=path_data["description"],
            icon=path_data["icon"],
            colors=path_data["colors"],
            sort_order=path_data["sort_order"],
            is_locked=path_data.get("is_locked", False),
            is_custom=False,
        )
        db.add(path)
        db.flush()
    return path


def get_or_create_node(db, path_id, topic_id, pos_x, pos_y, tier, status="locked"):
    """Return existing RoadmapNode or create a new one."""
    node = db.query(RoadmapNode).filter(
        RoadmapNode.path_id == path_id,
        RoadmapNode.topic_id == topic_id,
    ).first()
    if not node:
        node = RoadmapNode(
            path_id=path_id,
            topic_id=topic_id,
            position_x=pos_x,
            position_y=pos_y,
            tier=tier,
            status=status,
        )
        db.add(node)
        db.flush()
    return node


def get_or_create_connection(db, path_id, from_node_id, to_node_id, connection_type="default"):
    """Create a RoadmapConnection if it doesn't already exist."""
    conn = db.query(RoadmapConnection).filter(
        RoadmapConnection.path_id == path_id,
        RoadmapConnection.from_node_id == from_node_id,
        RoadmapConnection.to_node_id == to_node_id,
    ).first()
    if not conn:
        db.add(RoadmapConnection(
            path_id=path_id,
            from_node_id=from_node_id,
            to_node_id=to_node_id,
            connection_type=connection_type,
        ))


# ── Core seeding logic ─────────────────────────────────────────────────────

def seed_roadmap_from_json(db, filepath):
    """Load a single JSON file and seed its roadmap, nodes, topics, and connections."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    path_data = data["path"]
    nodes_data = data["nodes"]
    connections_data = data["connections"]

    print(f"  Seeding roadmap: {path_data['title']} ({len(nodes_data)} nodes, {len(connections_data)} connections)")

    # 1. Create topics (with subtopics) for every node
    topic_by_node_title = {}
    for node in nodes_data:
        topic = get_or_create_topic(
            db,
            title=node["title"],
            description=node["description"],
            keywords=node.get("topic_keywords"),
        )
        topic_by_node_title[node["title"]] = topic

        # Create subtopics if mapping exists
        subtopics = SUBTOPICS.get(node["title"])
        if subtopics:
            create_subtopic_connections(db, topic, subtopics)

    # 2. Create the RoadmapPath
    path = get_or_create_path(db, path_data)

    # 3. Create RoadmapNode records and build json_id → db_node_id mapping
    json_id_to_db_node = {}
    for idx, node in enumerate(nodes_data):
        topic = topic_by_node_title[node["title"]]
        # First node in the roadmap gets status="available"
        status = "available" if idx == 0 else "locked"
        db_node = get_or_create_node(
            db,
            path_id=path.id,
            topic_id=topic.id,
            pos_x=node["position_x"],
            pos_y=node["position_y"],
            tier=node["tier"],
            status=status,
        )
        json_id_to_db_node[node["id"]] = db_node

    # 4. Create RoadmapConnection records using the id mapping
    for conn in connections_data:
        from_db_node = json_id_to_db_node[conn["from_node_id"]]
        to_db_node = json_id_to_db_node[conn["to_node_id"]]
        get_or_create_connection(
            db,
            path_id=path.id,
            from_node_id=from_db_node.id,
            to_node_id=to_db_node.id,
            connection_type=conn.get("connection_type", "default"),
        )


def seed_data(db):
    """Seed all roadmaps from JSON files and create default user profile."""
    print("Loading roadmap data from JSON files...")

    for filename in JSON_FILES:
        filepath = os.path.join(DATA_DIR, filename)
        if not os.path.exists(filepath):
            print(f"  WARNING: {filepath} not found, skipping.")
            continue
        seed_roadmap_from_json(db, filepath)

    # Create default user profile
    print("Creating default user profile...")
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
    print("Done.")


def main():
    from server.config import get_settings

    settings = get_settings()
    database_url = settings.DATABASE_URL
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False} if "sqlite" in database_url else {},
    )

    # Ensure all tables exist
    Base.metadata.create_all(bind=engine)

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print("Seeding database with roadmap data...")
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
