import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.database import DATABASE_URL
from sqlmodel import SQLModel

async def drop_all():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        print("Dropping all tables...")
        # Since we are in Postgres, we can drop the public schema and recreate it
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        await conn.execute(text("CREATE SCHEMA public;"))
        print("Done!")

if __name__ == "__main__":
    asyncio.run(drop_all())
