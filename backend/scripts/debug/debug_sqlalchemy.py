import asyncio
from sqlalchemy import text
from app.core.database import get_session
import sys

# Ensure current directory is in python path
sys.path.append(".")

from app.models.user import User
from sqlmodel import select

async def test_sqlalchemy_connection():
    print("Testing SQLAlchemy Async Session...")
    try:
        # Manually invoke the generator
        async_gen = get_session()
        session = await anext(async_gen)
        
        print("Session created. checking for user...")
        # Simulate the signup query
        statement = select(User).where(User.email == "jak@gmail.com")
        result = await session.execute(statement)
        user = result.scalar_one_or_none()
        print(f"User found: {user}")
        
        await session.close()
        print("SUCCESS: Connection and User query successful!")
    except Exception as e:
        print(f"FAILURE: SQLAlchemy Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_sqlalchemy_connection())
