import os
import asyncio
import json
from datetime import datetime
from google import genai
from google.genai.types import (Content, HttpOptions, LiveConnectConfig,
                                Modality, Part, AudioTranscriptionConfig)
from app.core.logging import get_logger

logger = get_logger(__name__)

class LiveInterviewSession:
    """
    Finalized implementation aligned with the Official Vertex AI Multimodal Live API SDK patterns.
    Following: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api/get-started-sdk
    """
    def __init__(self, job_description: str, cv_text: str, frontend_ws):
        # Model: Prefer native-audio optimized variant for live streaming in May 2026
        self.model = os.getenv("GEMINI_LIVE_MODEL", "gemini-live-2.5-flash-native-audio")
        
        # Vertex AI is MANDATORY for projects starting with gen-lang-client-
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        is_ai_studio = project_id and project_id.startswith("gen-lang-client")
        
        http_options = HttpOptions(api_version="v1beta1")
        
        # Vertex AI is MANDATORY for Live API (API Keys not supported)
        location = "us-central1"
        
        # Diagnostic logging for environment
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        logger.debug(f"Project ID: {project_id}")
        logger.debug(f"Location: {location}")
        logger.debug(f"Credentials Path: {creds_path}")
        logger.debug(f"Model: {self.model}")
        
        if not project_id:
            logger.warning("GOOGLE_CLOUD_PROJECT is not set. This may cause handshake failures.")

        self.client = genai.Client(
            vertexai=True,
            project=project_id,
            location=location,
            http_options=http_options
        )
        
        self.frontend_ws = frontend_ws
        self.transcript = []
        self.session = None
        self._connect_task = None
        self.is_connected = False

        # Persona instructions
        instruction_text = (
            f"You are a professional Technical Interviewer for the role: {job_description}. "
            f"Candidate CV Summary: {cv_text}. "
            "Conduct a spoken interview. Be concise. One question at a time. "
            "Speak your response directly. No internal monologue."
        )

        # Config standard for 2.5 Flash GA with transcription enabled
        # Debug Tip: Disable transcriptions if connection fails immediately
        self.config = LiveConnectConfig(
            system_instruction=Content(parts=[Part(text=instruction_text)]),
            response_modalities=[Modality.AUDIO],
            input_audio_transcription=AudioTranscriptionConfig(),
            output_audio_transcription=AudioTranscriptionConfig(),
        )
        
    async def start(self):
        self._connect_task = asyncio.create_task(self._run_session())

    async def _run_session(self):
        try:
            logger.debug(f"Connecting to {self.model} (Official SDK Pattern)...")
            
            current_model_text = ""
            current_user_text = ""
            
            try:
                async with self.client.aio.live.connect(model=self.model, config=self.config) as session:
                    self.session = session
                    self.is_connected = True
                    
                    # Initiation pattern matching standard SDK
                    logger.info(f"Initializing session with {self.model}...")
                    await session.send(input="Hi, I am ready to start the interview.", end_of_turn=True)

                    while self.is_connected:
                        try:
                            async for message in session.receive():
                                # Handle server_content (audio, turn_complete, interrupted)
                                if message.server_content:
                                    model_turn = message.server_content.model_turn
                                    if model_turn:
                                        for part in model_turn.parts:
                                            if part.inline_data:
                                                # Stream 24kHz PCM directly to frontend
                                                await self.frontend_ws.send_bytes(part.inline_data.data)
                                                
                                    # 2. Handle Text Transcriptions explicitly from transcript fields, not model_turn.parts
                                    out_tx = getattr(message.server_content, "output_transcription", None)
                                    if out_tx and getattr(out_tx, "text", None):
                                        current_model_text += out_tx.text
                                        
                                    in_tx = getattr(message.server_content, "input_transcription", None)
                                    if in_tx and getattr(in_tx, "text", None):
                                        current_user_text += in_tx.text
                                        
                                    # Flush User Text on model_turn OR turn_complete
                                    if current_user_text.strip() and (model_turn or message.server_content.turn_complete):
                                        self.transcript.append({
                                            "role": "candidate",
                                            "content": current_user_text.strip(),
                                            "timestamp": datetime.utcnow().isoformat()
                                        })
                                        # Echo back candidate transcript if needed. (Optional as frontend tracks its own text, but audio doesn't)
                                        current_user_text = ""

                                    # 3. Turn Complete
                                    if message.server_content.turn_complete:
                                        logger.debug("Gemini signaled TURN_COMPLETE.")
                                        if current_model_text.strip():
                                            self.transcript.append({
                                                "role": "interviewer",
                                                "content": current_model_text.strip(),
                                                "timestamp": datetime.utcnow().isoformat()
                                            })
                                            await self.frontend_ws.send_text(json.dumps({
                                                "type": "agent_transcript",
                                                "text": current_model_text.strip()
                                            }))
                                            current_model_text = ""
                                            
                                        await self.frontend_ws.send_text(json.dumps({"type": "agent_turn_complete"}))
                                        
                                    # 4. Interrupted
                                    if message.server_content.interrupted:
                                        logger.debug("Gemini signaled INTERRUPTED.")
                                        if current_model_text.strip():
                                            self.transcript.append({
                                                "role": "interviewer",
                                                "content": current_model_text.strip() + " [Interrupted]",
                                                "timestamp": datetime.utcnow().isoformat()
                                            })
                                            await self.frontend_ws.send_text(json.dumps({
                                                "type": "agent_transcript",
                                                "text": current_model_text.strip() + "..."
                                            }))
                                            current_model_text = ""
                        except asyncio.CancelledError:
                            break
                        except Exception as e:
                            logger.error(f"Error inside receive loop: {e}")
                            # Don't break immediately; try to receive again unless disconnected.
                            await asyncio.sleep(1)

                    logger.debug("session.receive() loop terminated normally.")
            except Exception as e:
                # Aggressive catch for handshake failures (close codes 1000, 1006, 403, etc.)
                logger.error(f"FATAL: Connection failed during setup: {type(e).__name__}: {e}")
                if hasattr(e, 'code'):
                    logger.debug(f"WebSocket Close Code: {e.code}")
                raise e

        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error(f"Session Error: {e}")
        finally:
            self.is_connected = False
            self.session = None
            logger.debug("Session closed.")
            try:
                await self.frontend_ws.send_text(json.dumps({"type": "system", "message": "Live session concluded."}))
                await self.frontend_ws.close()
            except Exception:
                pass

    async def send_audio(self, pcm_data: bytes):
        """Sends candidate audio: 16kHz PCM 16-bit Mono"""
        if self.is_connected and self.session:
            try:
                # Official SDK pattern for streaming audio to trigger VAD
                await self.session.send_realtime_input(audio={"mime_type": "audio/pcm;rate=16000", "data": pcm_data})
            except Exception as e:
                import traceback
                traceback.print_exc()
                logger.error(f"Audio Send Error: {e}")
            
    async def send_text(self, text: str):
        """Sends candidate text turn"""
        if self.is_connected and self.session:
            self.transcript.append({
                "role": "candidate",
                "content": text,
                "timestamp": datetime.utcnow().isoformat()
            })
            try:
                # Official SDK pattern: session.send() with end_of_turn=True
                await self.session.send(input=text, end_of_turn=True)
                logger.info(f"USER: {text[:30]}...")
            except Exception as e:
                import traceback
                traceback.print_exc()
                logger.error(f"Text Send Error: {e}")

    def stop(self):
        if self._connect_task:
            self._connect_task.cancel()
        self.is_connected = False
