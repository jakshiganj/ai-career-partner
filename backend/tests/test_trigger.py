import asyncio
import os
from app.core.database import async_session
from app.orchestrator.master_orchestrator_agent import MasterOrchestratorAgent
import traceback
import sys

async def main():
    async with async_session() as session:
        db_url = os.environ.get("LANGGRAPH_CHECKPOINT_URL", "postgresql://admin:password123@localhost:5432/career_db")
        orchestrator = MasterOrchestratorAgent(session, db_url)
        
        # Hardcode a UUID that exists, or generate one just for the test
        # We'll just test the DB insert part, so a fake uuid string is fine if SQLModel coerces it, 
        # but User foreign key might fail if user doesn't exist.
        # Let's get the first user
        from app.models.user import User
        from sqlmodel import select
        user_res = await session.execute(select(User).limit(1))
        user = user_res.scalar_one_or_none()
        
        if not user:
            print("No users found in database.")
            return

        print(f"Starting pipeline for user {user.id}...")
        try:
            pipeline_id = await orchestrator.start_pipeline(
                user_id=str(user.id),
                cv_raw="Software engineer with 5 years of Python",
                job_description="Looking for Senior Python Developer"
            )
            print(f"SUCCESS: Pipeline ID {pipeline_id} returned.")
            
            # Now let's wait 5 seconds to see if the background task completes or crashes
            await asyncio.sleep(5)
            
            # Check pipeline run status
            from app.models.pipeline import PipelineRun
            run = await session.get(PipelineRun, pipeline_id)
            print(f"Post-run status: {run.status}")
            print(f"Error log: {run.error_log}")
            state = run.state_json or {}
            print(f"State error log: {state.get('error_log')}")
            
        except Exception as e:
            print("CRASHED!")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
