import os
import asyncio
from google import genai
from google.genai.types import (Content, HttpOptions, LiveConnectConfig,
                                Modality, Part)

async def test_vertex_live():
    # Force environment variables if not set
    # These match the user's .env
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"
    os.environ["GOOGLE_CLOUD_PROJECT"] = "gen-lang-client-0868677972"
    os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"
    # GOOGLE_API_KEY is also in env

    client = genai.Client(http_options=HttpOptions(api_version="v1beta1"))
    model_id = "gemini-2.0-flash-live-preview-04-09"

    print(f"Connecting to {model_id} on Vertex AI...")
    
    instruction_text = "You are a helpful assistant."
    
    config = LiveConnectConfig(
        system_instruction=Content(
            parts=[Part(text=instruction_text)]
        ),
        response_modalities=[Modality.AUDIO],
        speech_config={
            "voice_config": {
                "prebuilt_voice_config": {"voice_name": "Puck"}
            }
        }
    )

    try:
        async with client.aio.live.connect(
            model=model_id,
            config=config,
        ) as session:
            print("Connected!")
            text_input = "Hi, can you hear me?"
            print("> ", text_input)
            
            await session.send_client_content(
                turns=Content(role="user", parts=[Part(text=text_input)])
            )

            print("Awaiting response (30s timeout)...")
            try:
                # We expect audio/text response
                async for message in session.receive():
                    print(f"Received message type: {type(message)}")
                    if message.server_content and message.server_content.model_turn:
                        for part in message.server_content.model_turn.parts:
                            if part.text:
                                print(f"Gemini Text: {part.text}")
                            if part.inline_data:
                                print(f"Gemini Audio Data received ({len(part.inline_data.data)} bytes)")
                    
                    if message.server_content and message.server_content.turn_complete:
                        print("Turn complete.")
                        # break
            except asyncio.TimeoutError:
                print("Timeout waiting for response.")
                
            print("\nSession closing...")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_vertex_live())
