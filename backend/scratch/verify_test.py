import asyncio
import os
from sqlmodel import select
from app.core.database import async_session
from app.models.user import User
from app.models.pipeline import PipelineRun

async def check():
    async with async_session() as session:
        # Check user
        user_stmt = select(User).where(User.email == 'test_bot_1@example.com')
        user = (await session.execute(user_stmt)).scalar_one_or_none()
        print(f"User: {user}")
        
        if user:
            # Check pipeline runs
            run_stmt = select(PipelineRun).where(PipelineRun.user_id == user.id)
            runs = (await session.execute(run_stmt)).scalars().all()
            print(f"Pipeline Runs: {len(runs)}")
            for r in runs:
                print(f"  ID: {r.id}, Status: {r.status}")

if __name__ == "__main__":
    asyncio.run(check())
