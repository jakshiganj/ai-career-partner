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
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc, func

from app.core.database import get_session
from app.core.security import get_current_user
from app.core.ws_manager import manager
from app.models.user import User
from app.models.pipeline import PipelineRun, PipelineState
from app.orchestrator.master_orchestrator_agent import MasterOrchestratorAgent
from app.schemas.pipeline import PipelineStartRequest, PipelineInputRequest
from app.services.pipeline_service import format_run_for_api

router = APIRouter()


@router.get("/runs")
async def list_pipeline_runs(
    skip: int = 0,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List previous pipeline runs for the current user with pagination."""
    # Get total count
    count_q = select(func.count()).select_from(PipelineRun).where(PipelineRun.user_id == current_user.id)
    count_res = await session.execute(count_q)
    total = count_res.scalar()

    # Get paginated runs
    q = (
        select(PipelineRun)
        .where(PipelineRun.user_id == current_user.id)
        .order_by(desc(PipelineRun.created_at))
        .offset(skip)
        .limit(limit)
    )
    res = await session.execute(q)
    runs = res.scalars().all()
    
    return {
        "runs": [format_run_for_api(r) for r in runs],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.delete("/{pipeline_id}")
async def delete_pipeline_run(
    pipeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete a specific pipeline run."""
    run = await session.get(PipelineRun, pipeline_id)
    if not run or run.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Pipeline run not found")
    
    await session.delete(run)
    await session.commit()
    return {"status": "deleted"}


@router.post("/start", status_code=202)
async def start_pipeline(
    request: PipelineStartRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Trigger a new Master Orchestrator pipeline run for the authenticated user.
    """
    if current_user.tier != "pro":
        # Check current run count
        count_q = select(func.count()).select_from(PipelineRun).where(PipelineRun.user_id == current_user.id)
        res = await session.execute(count_q)
        run_count = res.scalar()
        if run_count >= 5:
            raise HTTPException(
                status_code=403, 
                detail={
                    "code": "UPGRADE_REQUIRED", 
                    "message": "You have reached your 5 free pipeline runs limit. Please upgrade to Pro."
                }
            )

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
        "status": run.status,
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
