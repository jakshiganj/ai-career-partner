"""
Pipeline Router — Triggers the MasterOrchestratorAgent pipeline.

Endpoints:
  POST /api/pipeline/start        → Start a new pipeline run
  GET  /api/pipeline/{id}/status  → Fetch current PipelineState status
  GET  /api/pipeline/{id}/result  → Fetch full PipelineState object
  POST /api/pipeline/{id}/resume  → Resume a stopped pipeline
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.pipeline import PipelineRun, PipelineState
from app.orchestrator.master_orchestrator_agent import MasterOrchestratorAgent

router = APIRouter()

class PipelineStartOptions(BaseModel):
    run_interview_prep: bool = True
    tone: str = "formal"

class PipelineStartRequest(BaseModel):
    cv_text: str
    job_description: str
    options: Optional[PipelineStartOptions] = None

@router.post("/start", status_code=202)
async def start_pipeline(
    request: PipelineStartRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Trigger a new Master Orchestrator pipeline run for the authenticated user.
    """
    orchestrator = MasterOrchestratorAgent(session)
    state = await orchestrator.start_pipeline(
        user_id=current_user.id,
        cv_raw=request.cv_text,
        job_description=request.job_description
    )

    return {
        "pipeline_id": state.pipeline_id,
        "status": state.status,
    }

@router.get("/{pipeline_id}/status")
async def get_pipeline_status(
    pipeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Fetch the current status of a pipeline run."""
    run = await session.get(PipelineRun, pipeline_id)
    if not run or run.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Pipeline run not found")

    state = PipelineState(**run.state_json)
    
    return {
        "status": state.status,
        "current_stage": state.current_stage,
        "completed_stages": list(range(1, state.current_stage)) if state.current_stage > 1 else [],
        "error_log": state.error_log
    }

@router.get("/{pipeline_id}/result")
async def get_pipeline_result(
    pipeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Fetch the full pipeline state result."""
    run = await session.get(PipelineRun, pipeline_id)
    if not run or run.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Pipeline run not found")

    return run.state_json

@router.post("/{pipeline_id}/resume")
async def resume_pipeline(
    pipeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Resume a halted pipeline."""
    run = await session.get(PipelineRun, pipeline_id)
    if not run or run.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Pipeline run not found")
        
    if run.status == "completed":
        raise HTTPException(status_code=400, detail="Pipeline already completed")
        
    orchestrator = MasterOrchestratorAgent(session)
    import asyncio
    asyncio.create_task(orchestrator.run_pipeline_stages(run.id))
    
    return {
        "pipeline_id": str(run.id),
        "resumed_from_stage": run.current_stage,
        "status": "running"
    }

# Very simple connection manager for the demo
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        await websocket.send_json({"type": "CONNECTED", "status": "Idle"})

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            try:
                self.active_connections[user_id].remove(websocket)
            except ValueError:
                pass

manager = ConnectionManager()

@router.websocket("/ws/{user_id}")
async def pipeline_websocket(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for real-time pipeline status updates.
    The MasterOrchestratorAgent will eventually broadcast to this manager.
    """
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
