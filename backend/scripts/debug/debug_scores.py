import asyncio
from sqlmodel import select
from app.core.database import async_session
from app.models.interview_roadmap import InterviewSession

async def main():
    async with async_session() as s:
        res = await s.execute(select(InterviewSession))
        sessions = res.scalars().all()
        with open("out.txt", "w") as f:
            f.write(f"Total sessions: {len(sessions)}\n")
            for sess in sessions:
                f.write(f"{sess.completed_at} {sess.scores} {sess.overall_score}\n")

if __name__ == "__main__":
    asyncio.run(main())
