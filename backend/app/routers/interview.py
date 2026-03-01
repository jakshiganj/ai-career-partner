from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, desc
import asyncio
from app.core.database import get_session as get_db_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.interview_roadmap import InterviewSession
from app.agents.interview_prep.agent import create_interview_session, get_session, process_interview_message
from app.agents.interview_scorer_agent import InterviewScorerAgent
import json
import uuid

router = APIRouter()

@router.post("/api/interview/start")
async def start_interview_session(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session)
):
    # For now, just pass a default role and cv summary or fetch from user profile
    # Let's try fetching the latest resume or use a default one
    from app.models.profile import CandidateProfile
    result = await session.execute(select(CandidateProfile).where(CandidateProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    
    cv_summary = "No profile available"
    if profile:
        cv_summary = profile.summary or str(profile.skills)
        target_role = profile.headline or "Software Engineer"
    else:
        target_role = "Software Engineer"
        
    session_id = create_interview_session(
        job_description=target_role,
        cv_text=cv_summary,
        mode="text"
    )
    
    # Update our in-memory session object to store user_id
    active_session = get_session(session_id)
    if active_session:
        active_session['user_id'] = current_user.id
        
    return {"session_id": session_id}

@router.websocket("/ws/interview/{session_id}")
async def interview_websocket(websocket: WebSocket, session_id: str, db: AsyncSession = Depends(get_db_session)):
    session = get_session(session_id)
    if not session:
        await websocket.accept()
        await websocket.close(code=4004, reason="Session not found")
        return

    await websocket.accept()
    
    # Initialize LiveSession
    from app.agents.interview_prep.live_session import LiveInterviewSession
    live_sess = LiveInterviewSession(
        job_description=session.get('job_description', 'Software Engineer'),
        cv_text=session.get('cv_text', 'Candidate Profile'),
        frontend_ws=websocket
    )
    await live_sess.start()
    
    # 60s Session Timeout Tracker
    last_activity_time = asyncio.get_event_loop().time()
    
    async def timeout_checker():
        nonlocal last_activity_time
        while True:
            await asyncio.sleep(5)
            if not live_sess.is_connected:
                break
            if asyncio.get_event_loop().time() - last_activity_time > 60:
                print(f"Session {session_id} timeout due to 60s inactivity.")
                try:
                    await websocket.close(code=1000, reason="Timeout")
                except Exception:
                    pass
                break
                
    timeout_task = asyncio.create_task(timeout_checker())

    try:
        while True:
            message = await websocket.receive()
            last_activity_time = asyncio.get_event_loop().time()
            
            # Incoming Binary Audio
            if "bytes" in message:
                await live_sess.send_audio(message["bytes"])
                
            # Incoming Text (Control / Heartbeat)
            elif "text" in message:
                try:
                    data = json.loads(message["text"])
                    if data.get("type") == "ping":
                        await websocket.send_text(json.dumps({"type": "pong"}))
                    elif data.get("type") == "candidate_transcript":
                        await live_sess.send_text(data.get("text"))
                except json.JSONDecodeError:
                    pass
            
            elif message.get("type") == "websocket.disconnect":
                break
                
    except WebSocketDisconnect:
        print(f"Client #{session_id} disconnected.")
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        timeout_task.cancel()
        live_sess.stop()
        
        # Session ended. Trigger Scorer with Structured Transcript.
        print(f"Session {session_id} cleanup. Triggering scoring...")
        
        user_id = session.get('user_id')
        if not user_id:
            return
            
        history = live_sess.transcript
        target_role = session.get('job_description', 'Software Engineer')
        
        # Need at least two turns to be worth scoring
        if len(history) >= 2:
            scorer = InterviewScorerAgent()
            score_data = await scorer.run(history, target_role)
            
            if 'error' not in score_data:
                scores = score_data.get('scores', {})
                overall = score_data.get('overall_score', 0)
                
                db_session = InterviewSession(
                    user_id=user_id,
                    answers={"history": history, "feedback": score_data.get("constructive_feedback")},
                    scores=scores,
                    overall_score=overall,
                    completed_at=__import__("datetime").datetime.utcnow()
                )
                db.add(db_session)
                await db.commit()
                print("Successfully configured and saved native audio interview score.")
            else:
                print("Error scoring interview:", score_data.get('error'))

@router.get("/api/interview/latest")
async def get_latest_interview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    result = await db.execute(select(InterviewSession).where(InterviewSession.user_id == current_user.id).order_by(desc(InterviewSession.completed_at)).limit(1))
    session = result.scalar_one_or_none()
    
    if not session:
        return {"report": None}
        
    return {"report": {
        "overall_score": session.overall_score,
        "communication": session.scores.get("communication", 0),
        "technical_depth": session.scores.get("technical_depth", 0),
        "star_method": session.scores.get("problem_solving", 0), # mapping problem solving to star method for the UI
        "feedback": session.answers.get("feedback", "No feedback available"),
        "transcript": "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in session.answers.get('history', [])])
    }}

@router.get("/api/interview/trend")
async def get_interview_trend(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    result = await db.execute(select(InterviewSession).where(InterviewSession.user_id == current_user.id).order_by(InterviewSession.completed_at))
    sessions = result.scalars().all()
    
    data = []
    for sess in sessions:
        if sess.completed_at:
            data.append({
                "date": sess.completed_at.strftime("%b %d"),
                "score": sess.overall_score
            })
            
    return {"data": data}
