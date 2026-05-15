import asyncio
import asyncpg

async def main():
    print("Connecting to default postgres database...")
    try:
        conn = await asyncpg.connect(
            user='postgres',
            password='Ed,z9/y`~G>[HMBs',
            database='postgres',
            host='136.110.41.124',
            port=5432
        )
        print("Connected! Creating career_db...")
        await conn.execute('CREATE DATABASE career_db')
        print("Database career_db created successfully!")
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
