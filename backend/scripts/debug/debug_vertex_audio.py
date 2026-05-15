import os
import asyncio
from google import genai
from google.genai.types import (Content, HttpOptions, LiveConnectConfig, Modality, Part)

async def test_vertex_live():
    # Force environment variables if not set
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"
    os.environ["GOOGLE_CLOUD_PROJECT"] = "gen-lang-client-0868677972"
    os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"

    client = genai.Client(http_options=HttpOptions(api_version="v1beta1"))
    model_id = "gemini-2.0-flash-live-preview-04-09"

    config = LiveConnectConfig(
        response_modalities=[Modality.AUDIO],
    )

    try:
        async with client.aio.live.connect(model=model_id, config=config) as session:
            print("Connected!")
            
            async def receive_task():
                while True:
                    async for message in session.receive():
                        if message.server_content and message.server_content.model_turn:
                            for part in message.server_content.model_turn.parts:
                                if part.text:
                                    print(f"Gemini Text: {part.text}")
                        if message.server_content and message.server_content.turn_complete:
                            print("Turn complete.")
                    print("Receiver loop finished yielding, continuing while True.")

            async def send_task():
                print("Sending Hi...")
                await session.send(input="Hi, can you hear me?", end_of_turn=True)
                # simulate sending audio
                print("Sending audio blocks...")
                for i in range(10):
                    await asyncio.sleep(1)
                    await session.send(input={"mime_type": "audio/pcm;rate=16000", "data": b'\x00'*4096})
                print("Sender loop finished.")

            await asyncio.gather(receive_task(), send_task())

    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_vertex_live())
