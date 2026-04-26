import os
import asyncio
from google import genai
from google.genai.types import (Content, HttpOptions, LiveConnectConfig,
                                Modality, Part)

async def test_live():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not found")
        return

    client = genai.Client(api_key=api_key, http_options=HttpOptions(api_version="v1beta1"))
    model_id = "gemini-2.0-flash-live-preview-04-09"

    print(f"Connecting to {model_id}...")
    try:
        async with client.aio.live.connect(
            model=model_id,
            config=LiveConnectConfig(response_modalities=[Modality.TEXT]),
        ) as session:
            text_input = "Hello? Gemini, are you there?"
            print("> ", text_input, "\n")
            
            # Using the method from the user's snippet
            await session.send(input=text_input, end_of_turn=True)

            print("Awaiting response...")
            async for message in session.receive():
                # print(f"DEBUG: Received message: {message}")
                if message.server_content and message.server_content.model_turn:
                    for part in message.server_content.model_turn.parts:
                        if part.text:
                            print(f"Gemini: {part.text}")
                
                # The user's snippet used message.text, let's check if that works too
                if hasattr(message, 'text') and message.text:
                    print(f"Gemini (attr): {message.text}")
                    
            print("\nSession ended.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_live())
