import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, desc
from app.models.pipeline import PipelineRun

async def main():
    engine = create_async_engine('postgresql+asyncpg://admin:password123@localhost:5432/career_db', echo=False)
    async with AsyncSession(engine) as session:
        result = await session.execute(select(PipelineRun).where(PipelineRun.status == 'failed').order_by(desc(PipelineRun.created_at)).limit(1))
        r = result.scalar_one_or_none()
        if r:
            with open("crash_log.txt", "w") as f:
                f.write(str(r.error_log) + "\n---\n" + str(r.state_json.get('error_log')))

asyncio.run(main())
