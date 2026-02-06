import os
import asyncio
import json
from google import genai
from google.genai import types

class LiveInterviewSession:
    """
    Manages a real-time, bidirectional connection to Gemini 2.5 Flash Native Audio.
    This handles the complexity of:
    - Establishing the BidiStream
    - Sending Audio/Text inputs
    - Receiving Audio/Text outputs
    - Handling Interruption signals
    """
    def __init__(self, job_description: str, cv_text: str):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=self.api_key)
        self.model = "gemini-2.0-flash-exp" # Using Flash 2.0/2.5 enabled model
        self.config = types.GenerateContentConfig(
            system_instruction=f"""
            You are a professional Technical Interviewer. 
            Role: {job_description}
            Candidate CV Summary: {cv_text}
            
            Conduct a spoken interview. Be concise. Allow the user to interrupt.
            """,
            response_modalities=["AUDIO", "TEXT"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck"))
            )
        )
        self.chat = None
        
    async def connect(self):
        """
        Establishes the async session (Bidi).
        For the 'google-genai' SDK, this is typically managed via the connect loop.
        """
        # Note: The actual Python SDK implementation for BidiStreaming is complex.
        # This is a high-level abstraction of how we WOULD implement it.
        # In a real asyncio flow, we would yield the client.aio.live.connect() context.
        pass

    async def send_audio_chunk(self, chunk: bytes):
        """
        Sends a PCM audio chunk to the model.
        """
        if self.chat:
             await self.chat.send_input({"mime_type": "audio/pcm;rate=16000", "data": chunk})

    async def send_text(self, text: str):
        """
        Sends text input (e.g. for initial context or interruptions).
        """
        if self.chat:
            await self.chat.send_input(text)
            
# Placeholder for the Router Integration
# Real implementation requires 'websockets' bridging to 'google-genai' async stream.
