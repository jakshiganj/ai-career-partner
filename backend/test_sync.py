import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from app.orchestrator.master_orchestrator_agent import MasterOrchestratorAgent
import sys

import sys
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def main():
    engine = create_async_engine('postgresql+asyncpg://admin:password123@localhost:5432/career_db', echo=False)
    async with AsyncSession(engine) as session:
        db_url = os.environ.get("LANGGRAPH_CHECKPOINT_URL", "postgresql://admin:password123@localhost:5432/career_db")
        orchestrator = MasterOrchestratorAgent(session, db_url)
        orchestrator.db_url = db_url
        
        from app.models.user import User
        from sqlmodel import select
        user_res = await session.execute(select(User).limit(1))
        user = user_res.scalar_one_or_none()
        
        # Override the start_pipeline to NOT use background task so we can AWAIT it!
        from app.graph.state import AgentState
        from app.models.pipeline import PipelineRun
        
        initial_state = AgentState(
            user_id=str(user.id),
            cv_raw="Software engineer with Python",
            job_description="Looking for Python",
            preferred_tone="formal",
            status="running",
            current_stage=1,
            error_log=[],
            messages=[]
        )
        
        run = PipelineRun(user_id=user.id, status="running", current_stage=1, state_json=dict(initial_state))
        session.add(run)
        await session.commit()
        await session.refresh(run)

        print("Running graph sequentially...")
        initial_state["pipeline_id"] = str(run.id)
        
        try:
            await orchestrator._run_graph(run.id, initial_state)
        except Exception as e:
            print(f"FAILED DIRECTLY: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
