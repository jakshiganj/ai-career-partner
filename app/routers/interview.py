from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.agents.interview_prep.agent import get_session
import json

router = APIRouter()

@router.websocket("/ws/interview/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str):
    session = get_session(session_id)
    if not session:
        await websocket.close(code=4004, reason="Session not found")
        return

    await websocket.accept()
    
    # Send initial greeting
    await websocket.send_text(json.dumps({
        "type": "system", 
        "message": "Connected to AI Interview Coach. Session ID: " + session_id
    }))

    try:
        while True:
            data = await websocket.receive_text()
            # Here we would stream this audio/text to Gemini Native Audio API
            # For this prototype, we just echo it back as a 'coach' response
            
            # Mock processing delay
            # ...
            
            response = {
                "type": "agent_response",
                "text": f"I heard you say: '{data}'. That's interesting. Can you elaborate?"
            }
            
            await websocket.send_text(json.dumps(response))
            
    except WebSocketDisconnect:
        print(f"Client #{session_id} disconnected")
