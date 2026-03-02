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
                parts=[types.Part.from_text(text=f"""You are a professional Technical Interviewer conducting a voice interview. 
Role: {job_description}
Candidate CV Summary: {cv_text}

CRITICAL INSTRUCTIONS:
1. Speak ALOUD directly to the candidate over a voice channel.
2. NEVER output any internal monologue, stage directions, or markdown bold text like "**Initiating the Interview**". 
3. JUST SPEAK the exact words you want the candidate to hear. Start immediately with a greeting and the first technical question based on their CV.
4. Ask ONLY ONE question at a time. Keep your answers brief and conversational.""")]
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
        self._heartbeat_task = asyncio.create_task(self._heartbeat())

    async def _heartbeat(self):
        """Send silent audio chunks to prevent Gemini from terminating the connection due to inactivity."""
        silent_chunk = b'\x00' * 3200  # Small silent chunk
        while True:
            await asyncio.sleep(4)
            if not self.is_connected or not self.session:
                break
            try:
                await self.session.send(input={"mime_type": "audio/pcm;rate=16000", "data": silent_chunk})
            except Exception:
                pass

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
                        if server_content.turn_complete:
                            self.is_speaking = False
                            await self.frontend_ws.send_text(json.dumps({"type": "agent_turn_complete"}))
                        
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
                
                with open("agent_debug.log", "a") as f:
                    f.write("DEBUG: receive loop finished normally\n")
        except asyncio.CancelledError:
            with open("agent_debug.log", "a") as f:
                f.write("DEBUG: Live session task cancelled\n")
        except Exception as e:
            try:
                await self.frontend_ws.send_text(json.dumps({"type": "system", "message": f"Connection error: {e}"}))
            except Exception:
                pass
        finally:
            self.is_connected = False
            self.session = None
            try:
                await self.frontend_ws.send_text(json.dumps({"type": "system", "message": "Audio Session completed or disconnected."}))
                await self.frontend_ws.close()
            except Exception:
                pass

    async def send_audio(self, pcm_data: bytes):
        with open("agent_debug.log", "a") as f:
            f.write(f"DEBUG: send_audio called with {len(pcm_data)} bytes\n")
            
        if not self.is_connected or not self.session:
            with open("agent_debug.log", "a") as f:
                f.write("DEBUG: send_audio aborted - not connected or no session\n")
            return
            
        try:
            # Handle user interruption.
            if self.is_speaking:
                with open("agent_debug.log", "a") as f:
                    f.write("DEBUG: Cancelling current speaking turn for audio interruption...\n")
                if hasattr(self.session, 'cancel_response'):
                    try:
                        await self.session.cancel_response()
                    except Exception as e:
                        pass
                self.is_speaking = False

            # Send exactly 16kHz PCM audio
            await self.session.send(input={"mime_type": "audio/pcm;rate=16000", "data": pcm_data})
        except Exception as e:
            with open("agent_debug.log", "a") as f:
                f.write(f"Error sending audio to Gemini: {e}\n")
            
    async def send_text(self, text: str):
        with open("agent_debug.log", "a") as f:
            f.write(f"DEBUG: send_text called with: {text}\n")
            
        if not self.is_connected or not self.session:
            with open("agent_debug.log", "a") as f:
                f.write("DEBUG: send_text aborted - not connected or no session\n")
            return
            
        self.transcript.append({
            "role": "candidate",
            "content": text,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        try:
            if self.is_speaking:
                with open("agent_debug.log", "a") as f:
                    f.write("DEBUG: Cancelling current speaking turn...\n")
                if hasattr(self.session, 'cancel_response'):
                    try:
                        await self.session.cancel_response()
                    except Exception as e:
                        with open("agent_debug.log", "a") as f:
                            f.write(f"DEBUG: err on cancel_response {e}\n")
                self.is_speaking = False
                
            with open("agent_debug.log", "a") as f:
                f.write("DEBUG: Awaiting self.session.send for text...\n")
                
            # Try passing the exact structure expected by google-genai
            from google.genai import types
            
            await self.session.send(input=text, end_of_turn=True)
            with open("agent_debug.log", "a") as f:
                f.write("DEBUG: self.session.send completed successfully.\n")
        except Exception as e:
            with open("agent_debug.log", "a") as f:
                f.write(f"Error sending text to Gemini: {e}\n")

    def stop(self):
        if self._connect_task:
            self._connect_task.cancel()
        if hasattr(self, '_heartbeat_task') and self._heartbeat_task:
            self._heartbeat_task.cancel()
        self.is_connected = False
