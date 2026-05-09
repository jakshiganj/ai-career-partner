
import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import select, desc
from app.models.pipeline import PipelineRun
from app.models.interview_roadmap import SkillRoadmap

DATABASE_URL = "postgresql+asyncpg://admin:password123@localhost:5432/career_db"

async def check_run(pipeline_id=None):
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        if pipeline_id:
            import uuid
            stmt = select(PipelineRun).where(PipelineRun.id == uuid.UUID(pipeline_id))
        else:
            stmt = select(PipelineRun).order_by(desc(PipelineRun.created_at)).limit(1)
            
        res = await session.execute(stmt)
        run = res.scalar_one_or_none()
        
        if not run:
            print("No pipeline runs found.")
            return

        print(f"--- Pipeline Run {run.id} ---")
        print(f"Status: {run.status}")
        
        state = run.state_json or {}
        print(f"Current Stage: {state.get('current_stage')}")
        print(f"Error Log: {state.get('error_log')}")
        
        has_roadmap = "skill_roadmap" in state
        print(f"Skill Roadmap in state_json: {has_roadmap}")
        if has_roadmap:
            print(f"Roadmap items count: {len(state['skill_roadmap'])}")
            
        # Check if SkillRoadmap exists
        stmt2 = select(SkillRoadmap).where(SkillRoadmap.pipeline_id == run.id)
        res2 = await session.execute(stmt2)
        roadmap = res2.scalar_one_or_none()
        print(f"SkillRoadmap row exists in table: {roadmap is not None}")

if __name__ == "__main__":
    import sys
    pid = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(check_run(pid))
