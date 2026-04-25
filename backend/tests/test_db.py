import asyncio
import asyncpg
import os

async def test_connection():
    url = "postgresql://admin:password123@localhost:5432/career_db"
    print(f"Testing connection to: {url}")
    try:
        conn = await asyncpg.connect(url)
        print("SUCCESS: Connected to database!")
        await conn.close()
    except Exception as e:
        print(f"FAILURE: Could not connect. Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
