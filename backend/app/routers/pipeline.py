"""
Pipeline Router — Triggers the MasterOrchestratorAgent pipeline.

Endpoints:
  GET  /api/pipeline/runs        → List previous runs for sidebar
  POST /api/pipeline/start        → Start a new pipeline run
  GET  /api/pipeline/{id}/status  → Fetch current PipelineState status
  GET  /api/pipeline/{id}/result  → Fetch full PipelineState object
  POST /api/pipeline/{id}/resume  → Resume a stopped pipeline
"""
import os
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc
from pydantic import BaseModel

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.pipeline import PipelineRun, PipelineState
from app.orchestrator.master_orchestrator_agent import MasterOrchestratorAgent

router = APIRouter()


def _run_label_from_state(state_json: dict) -> str:
    """Extract a short label for the run from state (e.g. job title or job description snippet)."""
    jd = (state_json or {}).get("job_description") or ""
    if not jd:
        return "Untitled run"
    # Use first line or first 50 chars
    first_line = jd.strip().split("\n")[0].strip()
    if len(first_line) > 50:
        return first_line[:47] + "..."
    return first_line or "Untitled run"


@router.get("/runs")
async def list_pipeline_runs(
    limit: int = 8,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List previous pipeline runs for the current user (for dashboard sidebar)."""
    q = (
        select(PipelineRun)
        .where(PipelineRun.user_id == current_user.id)
        .order_by(desc(PipelineRun.created_at))
        .limit(limit)
    )
    res = await session.execute(q)
    runs = res.scalars().all()
    out = []
    for r in runs:
        state = r.state_json or {}
        out.append({
            "id": str(r.id),
            "label": _run_label_from_state(state),
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "ats_score": state.get("ats_score"),
            "status": r.status,
            "current_stage": r.current_stage,
        })
    return {"runs": out}

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
    db_url = os.environ.get("LANGGRAPH_CHECKPOINT_URL", "postgresql://admin:password123@localhost:5432/career_db")
    orchestrator = MasterOrchestratorAgent(session, db_url)
    pipeline_id = await orchestrator.start_pipeline(
        user_id=str(current_user.id),
        cv_raw=request.cv_text,
        job_description=request.job_description
    )

    return {
        "pipeline_id": pipeline_id,
        "status": "running",
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

    state = run.state_json or {}
    
    current_stage = state.get("current_stage", 1)
    return {
        "status": state.get("status", "running"),
        "current_stage": current_stage,
        "completed_stages": list(range(1, current_stage)) if current_stage > 1 else [],
        "error_log": state.get("error_log", [])
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
    pipeline_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Resume a halted pipeline."""
    db_url = os.environ.get("LANGGRAPH_CHECKPOINT_URL", "postgresql://admin:password123@localhost:5432/career_db")
    orchestrator = MasterOrchestratorAgent(session, db_url)
    await orchestrator.resume_pipeline(pipeline_id)
    return {"pipeline_id": pipeline_id, "status": "resumed"}

class PipelineInputRequest(BaseModel):
    job_description: Optional[str] = None
    cv_raw: Optional[str] = None
    skills: Optional[List[str]] = None

@router.patch("/{pipeline_id}/input")
async def provide_pipeline_input(
    pipeline_id: uuid.UUID,
    request: PipelineInputRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Provide missing data to a waiting pipeline and resume it."""
    run = await session.get(PipelineRun, pipeline_id)
    if not run or run.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Pipeline run not found")
        
    state = run.state_json or {}
    status = state.get("status", "running")
    
    if status != "waiting_for_input":
        raise HTTPException(status_code=400, detail=f"Pipeline is not waiting for input (status: {status})")
        
    # Update provided data
    if request.job_description:
        state["job_description"] = request.job_description
    if request.cv_raw:
        state["cv_raw"] = request.cv_raw
    if request.skills:
        cv_raw_val = state.get("cv_raw", "")
        state["cv_raw"] = cv_raw_val + f"\n\nSkills: {', '.join(request.skills)}"
        
    state["status"] = "running"
    state["missing_fields"] = []
    
    run.state_json = state
    run.status = "running"
    session.add(run)
    await session.commit()
    
    # Resume orchestrator
    db_url = os.environ.get("LANGGRAPH_CHECKPOINT_URL", "postgresql://admin:password123@localhost:5432/career_db")
    orchestrator = MasterOrchestratorAgent(session, db_url)
    await orchestrator.resume_pipeline(str(run.id))
    
    return {"status": "resumed"}

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
