import asyncio
from app.core.database import async_session
from app.models.pipeline import PipelineRun
from sqlmodel import select, desc

async def main():
    async with async_session() as session:
        result = await session.execute(select(PipelineRun).order_by(desc(PipelineRun.created_at)).limit(3))
        runs = result.scalars().all()
        for run in runs:
            print(f"Run {run.id}: status={run.status}, errors={run.error_log}")
            state = run.state_json or {}
            print(f"  State Error Log: {state.get('error_log')}")
            print(f"  State: {state.keys()}")

if __name__ == "__main__":
    asyncio.run(main())
