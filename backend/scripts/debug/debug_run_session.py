import asyncio
from app.agents.interview_prep.live_session import LiveInterviewSession

class DummyWS:
    async def send_bytes(self, data: bytes):
        print(f"WS received {len(data)} bytes of audio.")
    async def send_text(self, text: str):
        print(f"WS received text: {text}")
    async def close(self):
        print("WS closed.")

async def main():
    session = LiveInterviewSession(
        job_description="Software Engineer",
        cv_text="Software Engineer",
        frontend_ws=DummyWS()
    )
    import traceback
    try:
        await session._run_session()
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
