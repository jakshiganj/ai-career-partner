"""
Pipeline Router — Triggers the SupervisorAgent pipeline and streams
real-time status updates to the connected frontend via WebSocket.

Endpoints:
  POST /pipeline/run              → Start a new pipeline run
  GET  /pipeline/{task_id}        → Fetch current TaskState
  WS   /pipeline/ws/{user_id}     → Subscribe to real-time state updates
"""
import json
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.task_state import TaskState, TaskStatus
from app.orchestrator.app import SupervisorAgent

router = APIRouter()


# ─── WebSocket Connection Manager ────────────────────────────────────────────

class ConnectionManager:
    """Manages active WebSocket connections keyed by user_id."""

    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def broadcast(self, user_id: int, message: str):
        """Send a message to all WebSocket connections for this user."""
        connections = self.active_connections.get(user_id, [])
        for connection in connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass  # Silently drop dead connections


manager = ConnectionManager()


# ─── WebSocket Endpoint ───────────────────────────────────────────────────────

@router.websocket("/ws/{user_id}")
async def pipeline_websocket(websocket: WebSocket, user_id: int):
    """
    Frontend subscribes here to receive real-time TaskState updates.
    Events emitted:
      { type: "STATE_UPDATE", status, current_agent, task_state_id }
      { type: "PAUSED",       status, current_agent, missing_fields }
    """
    await manager.connect(user_id, websocket)
    try:
        # Send a confirmation ping
        await websocket.send_text(json.dumps({
            "type": "CONNECTED",
            "message": f"Subscribed to pipeline events for user {user_id}"
        }))
        # Keep alive until client disconnects
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)


# ─── Pipeline Trigger ─────────────────────────────────────────────────────────

class PipelineRequest:
    from pydantic import BaseModel
    from typing import List as L

class PipelineRunRequest:
    pass

from pydantic import BaseModel
from typing import List

class PipelineRunRequest(BaseModel):
    goal: str
    cv_text: str
    skills: List[str]


@router.post("/run", status_code=202)
async def run_pipeline(
    request: PipelineRunRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Trigger a new Supervisor pipeline run for the authenticated user.
    Returns the task_state_id immediately; status streams via WebSocket.
    """
    # Create a new TaskState record
    task_state = TaskState(user_id=current_user.id)
    session.add(task_state)
    await session.commit()
    await session.refresh(task_state)

    # Run the pipeline (in a background-style async call)
    import asyncio
    supervisor = SupervisorAgent(task_state, session, ws_manager=manager)
    asyncio.create_task(
        supervisor.run(request.goal, request.cv_text, request.skills)
    )

    return {
        "message": "Pipeline started",
        "task_state_id": task_state.id,
        "subscribe_at": f"/pipeline/ws/{current_user.id}",
    }


@router.get("/{task_id}")
async def get_task_state(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Fetch the current status of a pipeline run."""
    task_state = await session.get(TaskState, task_id)
    if not task_state or task_state.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")

    return {
        "id": task_state.id,
        "status": task_state.status.value,
        "current_agent": task_state.current_agent,
        "missing_fields": task_state.missing_fields,
        "updated_at": task_state.updated_at.isoformat(),
    }
