import os
import asyncio
from google import genai
from google.genai.types import (Content, HttpOptions, LiveConnectConfig, Modality, Part)

async def main():
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"
    os.environ["GOOGLE_CLOUD_PROJECT"] = "gen-lang-client-0868677972"
    os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"

    client = genai.Client(http_options=HttpOptions(api_version="v1beta1"))
    model_id = "gemini-2.0-flash-live-preview-04-09"

    config = LiveConnectConfig(response_modalities=[Modality.TEXT])

    try:
        async with client.aio.live.connect(model=model_id, config=config) as session:
            print("Connected!")
            
            await session.send(input="Hi, ask me a short math question.", end_of_turn=True)
            
            async for message in session.receive():
                if message.server_content and message.server_content.model_turn:
                    for part in message.server_content.model_turn.parts:
                        if part.text:
                            print(f"Gemini: {part.text}")
                if message.server_content and message.server_content.turn_complete:
                    print("Turn complete.")
                    break # Usually example code breaks here and does another send
            
            print("Finished first receive loop. Sending second question...")
            await session.send(input="What is the answer to that question?", end_of_turn=True)

            async for message in session.receive():
                if message.server_content and message.server_content.model_turn:
                    for part in message.server_content.model_turn.parts:
                        if part.text:
                            print(f"Gemini: {part.text}")
                if message.server_content and message.server_content.turn_complete:
                    print("Turn complete.")
                    break
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
