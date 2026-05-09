from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, desc
import asyncio, json
from app.core.database import get_session as get_db_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.interview_roadmap import InterviewSession
from app.agents.interview_prep.agent import create_interview_session, get_session, process_interview_message
from app.services.interview_service import score_and_save_interview, format_interview_report

router = APIRouter()

@router.post("/start")
async def start_interview_session(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    from app.models.profile import CandidateProfile
    result = await session.execute(select(CandidateProfile).where(CandidateProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    cv_summary = "No profile available"
    if profile:
        cv_summary = profile.summary or str(profile.skills)
        target_role = profile.headline or "Software Engineer"
    else:
        target_role = "Software Engineer"
    session_id = create_interview_session(job_description=target_role, cv_text=cv_summary, mode="text")
    active_session = get_session(session_id)
    if active_session:
        active_session['user_id'] = current_user.id
        from app.models.pipeline import PipelineRun
        run_res = await session.execute(select(PipelineRun).where(PipelineRun.user_id == current_user.id).order_by(desc(PipelineRun.created_at)).limit(1))
        latest_run = run_res.scalar_one_or_none()
        if latest_run:
            active_session['pipeline_id'] = latest_run.id
    return {"session_id": session_id}

@router.websocket("/ws/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str, db: AsyncSession = Depends(get_db_session)):
    session = get_session(session_id)
    if not session:
        await websocket.accept()
        await websocket.close(code=4004, reason="Session not found")
        return
    await websocket.accept()
    from app.agents.interview_prep.live_session import LiveInterviewSession
    live_sess = LiveInterviewSession(
        job_description=session.get('job_description', 'Software Engineer'),
        cv_text=session.get('cv_text', 'Candidate Profile'),
        frontend_ws=websocket
    )
    await live_sess.start()
    last_activity_time = asyncio.get_event_loop().time()
    async def timeout_checker():
        nonlocal last_activity_time
        while True:
            await asyncio.sleep(5)
            if not live_sess.is_connected: break
            if asyncio.get_event_loop().time() - last_activity_time > 60:
                print(f"Session {session_id} timeout due to 60s inactivity.")
                try: await websocket.close(code=1000, reason="Timeout")
                except Exception: pass
                break
    timeout_task = asyncio.create_task(timeout_checker())
    try:
        while True:
            message = await websocket.receive()
            last_activity_time = asyncio.get_event_loop().time()
            if "bytes" in message:
                await live_sess.send_audio(message["bytes"])
            elif "text" in message:
                try:
                    data = json.loads(message["text"])
                    msg_type = data.get("type")
                    if msg_type == "ping":
                        await websocket.send_text(json.dumps({"type": "pong"}))
                    elif msg_type == "candidate_transcript":
                        await live_sess.send_text(data.get("text"))
                except json.JSONDecodeError: pass
            elif message.get("type") == "websocket.disconnect":
                break
    except WebSocketDisconnect:
        print(f"Client #{session_id} disconnected.")
    except Exception as e:
        print(f"WebSocket Router Error: {e}")
    finally:
        timeout_task.cancel()
        live_sess.stop()
        print(f"Session {session_id} cleanup. Triggering scoring...")
        user_id = session.get('user_id')
        if user_id:
            await score_and_save_interview(
                db=db, user_id=user_id, pipeline_id=session.get('pipeline_id'),
                transcript=live_sess.transcript, target_role=session.get('job_description', 'Software Engineer')
            )

@router.get("/latest")
async def get_latest_interview(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(InterviewSession).where(InterviewSession.user_id == current_user.id).order_by(desc(InterviewSession.completed_at)).limit(1))
    session = result.scalar_one_or_none()
    if not session: return {"report": None}
    return {"report": format_interview_report(session)}

@router.get("/trend")
async def get_interview_trend(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db_session)):
    result = await db.execute(select(InterviewSession).where(InterviewSession.user_id == current_user.id).order_by(InterviewSession.completed_at))
    sessions = result.scalars().all()
    return {"data": [{"date": s.completed_at.strftime("%b %d"), "score": s.overall_score} for s in sessions if s.completed_at]}
