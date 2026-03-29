import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from app.models.pipeline import PipelineRun

async def main():
    engine = create_async_engine('postgresql+asyncpg://admin:password123@localhost:5432/career_db', echo=False)
    async with AsyncSession(engine) as session:
        result = await session.execute(select(PipelineRun).where(PipelineRun.status == 'failed'))
        runs = result.scalars().all()
        for r in runs:
            if r.state_json and r.state_json.get("status") != "failed":
                new_state = dict(r.state_json)
                new_state["status"] = "failed"
                r.state_json = new_state
                session.add(r)
        
        # also kill any runs older than 1 hour that are "running"
        from datetime import datetime, timedelta
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        result_stuck = await session.execute(select(PipelineRun).where(PipelineRun.status == 'running'))
        for r in result_stuck.scalars().all():
            if r.created_at < one_hour_ago:
                r.status = 'failed'
                new_state = dict(r.state_json or {})
                new_state["status"] = "failed"
                new_state["error_log"] = new_state.get("error_log", []) + ["Pipeline timed out or crashed."]
                r.state_json = new_state
                session.add(r)
                print(f"Fixed stuck run {r.id}")
                
        await session.commit()
        print("Database sync complete.")

if __name__ == "__main__":
    asyncio.run(main())
