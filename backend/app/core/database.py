from sqlmodel import SQLModel, create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# 1. Get DB URL from centralized settings
DATABASE_URL = settings.DATABASE_URL.strip()

# 2. Create the Async Engine (Allows non-blocking DB calls)
engine = create_async_engine(DATABASE_URL, echo=True, future=True)

# 3. Create a Session Factory (Used to get DB sessions in endpoints)
async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# 4. Dependency function (We will use this in FastAPI routes later)
async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session