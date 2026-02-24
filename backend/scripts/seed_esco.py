import asyncio
import os
import sys

# Add backend directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.models.esco import EscoSkill, EscoRelation
from app.agents.gemini_client import gemini_client

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://admin:password123@localhost:5432/career_db")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Dummy ESCO skills for demonstration
DUMMY_SKILLS = [
    {"name": "Software Development", "type": "skill", "desc": "Process of conceiving, specifying, designing, programming, documenting, testing, and bug fixing involved in creating and maintaining applications."},
    {"name": "Frontend Web Development", "type": "skill", "desc": "Development of the graphical user interface of a website, through the use of HTML, CSS, and JavaScript, so that users can view and interact with that website."},
    {"name": "Backend Web Development", "type": "skill", "desc": "Server-side web app logic and integration."},
    {"name": "React", "type": "skill", "desc": "Front-end JavaScript library for building user interfaces based on components."},
    {"name": "Python", "type": "skill", "desc": "High-level, general-purpose programming language."},
    {"name": "FastAPI", "type": "skill", "desc": "Modern, fast (high-performance), web framework for building APIs with Python."},
    {"name": "SQL", "type": "skill", "desc": "Domain-specific language used in programming and designed for managing data held in a relational database management system."},
    {"name": "PostgreSQL", "type": "skill", "desc": "Free and open-source relational database management system emphasizing extensibility and SQL compliance."},
    {"name": "Docker", "type": "skill", "desc": "Platform as a service products that use OS-level virtualization to deliver software in packages called containers."},
]

# (source_name, target_name, relation_type)
DUMMY_RELATIONS = [
    ("Frontend Web Development", "Software Development", "broader"),
    ("Backend Web Development", "Software Development", "broader"),
    ("React", "Frontend Web Development", "narrower"),
    ("Python", "Software Development", "narrower"),
    ("FastAPI", "Backend Web Development", "narrower"),
    ("SQL", "Backend Web Development", "narrower"),
    ("PostgreSQL", "SQL", "narrower"),
    ("Docker", "Software Development", "transversal"),
]

async def seed_esco():
    async with async_session() as session:
        print("Checking if ESCO skills already exist...")
        result = await session.execute(select(EscoSkill).limit(1))
        if result.scalars().first():
            print("Skills already seeded! Skipping.")
            return

        print("Seeding dummy ESCO skills and generating embeddings...")
        skill_name_to_id = {}
        
        # Insert skills
        for s in DUMMY_SKILLS:
            print(f"Generating embedding for: {s['name']}")
            embedding = gemini_client.embed_content('text-embedding-004', s['desc'])
            skill = EscoSkill(
                name=s['name'],
                description=s['desc'],
                skill_type=s['type'],
                embedding=embedding
            )
            session.add(skill)
            # We need the ID for relationships, flush so IDs are generated
            await session.flush()
            skill_name_to_id[s['name']] = skill.id
            
        # Insert relations
        print("Seeding relations...")
        for source_name, target_name, rel_type in DUMMY_RELATIONS:
            source_id = skill_name_to_id.get(source_name)
            target_id = skill_name_to_id.get(target_name)
            if source_id and target_id:
                relation = EscoRelation(
                    source_skill_id=source_id,
                    target_skill_id=target_id,
                    relation_type=rel_type
                )
                session.add(relation)

        await session.commit()
        print("Successfully seeded ESCO skills and relations!")

if __name__ == "__main__":
    asyncio.run(seed_esco())
