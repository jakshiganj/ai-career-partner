import os
import asyncio
import json
from datetime import datetime
from google import genai
from google.genai import types

class LiveInterviewSession:
    """
    Manages a real-time, bidirectional connection to Gemini Live API.
    Handles ping/pong heartbeats via WebSocket, user interruption, 
    and structured transcripts mapping to InterviewScorerAgent.
    """
    def __init__(self, job_description: str, cv_text: str, frontend_ws):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=self.api_key)
        self.model = "models/gemini-2.5-flash-native-audio-preview-12-2025"
        self.frontend_ws = frontend_ws
        self.transcript = []
        self.session = None
        self._connect_task = None
        self.is_connected = False
        self.is_speaking = False
        self.config = {
            "system_instruction": types.Content(
                parts=[types.Part.from_text(text=f"""
                You are a professional Technical Interviewer. 
                Role: {job_description}
                Candidate CV Summary: {cv_text}
                
                Conduct a spoken interview. Be concise. Ask one question at a time.
                If the user interrupts, stop your current thought and address them.
                
                CRITICAL INSTRUCTION: You are speaking ALOUD directly to the candidate over a voice channel. 
                NEVER output any internal monologue, stage directions, formatting, or markdown like "**Initiating the Interview**".
                JUST SPEAK your response directly as the interviewer character.
                """)]
            ),
            "response_modalities": ["AUDIO"],
            "speech_config": types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck")
                )
            )
        }        
        
    async def start(self):
        """Connects and starts background receive task"""
        self._connect_task = asyncio.create_task(self._run_session())

    async def _run_session(self):
        try:
            # We connect to Gemini Live
            async with self.client.aio.live.connect(model=self.model, config=self.config) as session:
                self.session = session
                self.is_connected = True
                await self.frontend_ws.send_text(json.dumps({"type": "system", "message": "Voice session connected."}))
                
                # Initiate the interview conversation automatically
                await session.send(input="Hi, I am ready to start the interview.", end_of_turn=True)
                
                async for response in session.receive():
                    server_content = response.server_content
                    if server_content is not None:
                        model_turn = server_content.model_turn
                        if model_turn is not None:
                            self.is_speaking = True
                            for part in model_turn.parts:
                                if part.text:
                                    self.transcript.append({
                                        "role": "interviewer",
                                        "content": part.text,
                                        "timestamp": datetime.utcnow().isoformat()
                                    })
                                    # Send transcript to frontend
                                    await self.frontend_ws.send_text(json.dumps({
                                        "type": "agent_transcript",
                                        "text": part.text
                                    }))
                                if part.inline_data:
                                    # Send binary audio part to frontend
                                    await self.frontend_ws.send_bytes(part.inline_data.data)
                        
                        if server_content.turn_complete:
                            self.is_speaking = False
                            await self.frontend_ws.send_text(json.dumps({"type": "agent_turn_complete"}))
        except asyncio.CancelledError:
            print("Live session task cancelled")
        except Exception as e:
            print(f"Gemini Live API error: {e}")
            try:
                await self.frontend_ws.send_text(json.dumps({"type": "system", "message": f"Connection error: {e}"}))
            except Exception:
                pass
        finally:
            self.is_connected = False
            self.session = None

    async def send_audio(self, pcm_data: bytes):
        if not self.is_connected or not self.session:
            return
            
        try:
            # Handle user interruption.
            if self.is_speaking:
                if hasattr(self.session, 'cancel_response'):
                    await self.session.cancel_response()
                self.is_speaking = False

            # Send exactly 16kHz PCM audio
            await self.session.send(input={"mime_type": "audio/pcm;rate=16000", "data": pcm_data})
        except Exception as e:
            print("Error sending audio to Gemini:", e)
            
    async def send_text(self, text: str):
        if not self.is_connected or not self.session:
            return
            
        self.transcript.append({
            "role": "candidate",
            "content": text,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        try:
            if self.is_speaking:
                if hasattr(self.session, 'cancel_response'):
                    await self.session.cancel_response()
                self.is_speaking = False
                
            await self.session.send(input=text, end_of_turn=True)
        except Exception as e:
            print("Error sending text to Gemini:", e)

    def stop(self):
        if self._connect_task:
            self._connect_task.cancel()
        self.is_connected = False
