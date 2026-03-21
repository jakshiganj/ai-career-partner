import os
import asyncio
from google import genai
from google.genai.types import (Content, HttpOptions, LiveConnectConfig, Modality, Part, AudioTranscriptionConfig)

async def main():
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"
    os.environ["GOOGLE_CLOUD_PROJECT"] = "gen-lang-client-0868677972"
    os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"

    client = genai.Client(http_options=HttpOptions(api_version="v1beta1"))
    
    config = LiveConnectConfig(
        system_instruction=Content(parts=[Part(text="Say exactly: 'Hello World'.")]),
        response_modalities=[Modality.AUDIO],
        input_audio_transcription=AudioTranscriptionConfig(),
        output_audio_transcription=AudioTranscriptionConfig(),
    )

    print("Connecting...")
    async with client.aio.live.connect(model="gemini-2.0-flash-live-preview-04-09", config=config) as session:
        print("Connected!")
        await session.send_client_content(turns=Content(role="user", parts=[Part(text="Say hello")]))
        
        async for message in session.receive():
            print(f"MSG DUMP: {message.model_dump_json(indent=2)}")
            if message.server_content and message.server_content.turn_complete:
                print("TURN COMPLETE")
                break

if __name__ == "__main__":
    asyncio.run(main())
