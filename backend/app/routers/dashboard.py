from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc
from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.pipeline import PipelineRun
from app.models.cv_history import CVVersion
from app.models.interview_roadmap import InterviewSession

router = APIRouter()

@router.get("/")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Aggregates data for the Candidate Dashboard (Feature 9).
    """
    user_id = current_user.id
    
    # 1. Pipeline Status
    latest_run_query = select(PipelineRun).where(PipelineRun.user_id == user_id).order_by(desc(PipelineRun.created_at)).limit(1)
    run_res = await session.execute(latest_run_query)
    latest_run = run_res.scalar_one_or_none()
    
    # 2. CV Health
    latest_cv_query = select(CVVersion).where(CVVersion.user_id == user_id).order_by(desc(CVVersion.version_number)).limit(1)
    cv_res = await session.execute(latest_cv_query)
    latest_cv = cv_res.scalar_one_or_none()
    
    # 3. Interview Readiness
    latest_interview_query = select(InterviewSession).where(InterviewSession.user_id == user_id).order_by(desc(InterviewSession.completed_at)).limit(1)
    int_res = await session.execute(latest_interview_query)
    latest_interview = int_res.scalar_one_or_none()

    state_json = latest_run.state_json if latest_run else {}

    # Default placeholders
    dashboard_data = {
        "pipeline_status": {
            "is_running": latest_run is not None and latest_run.status == "running",
            "current_stage": latest_run.current_stage if latest_run else 0,
            "pipeline_id": str(latest_run.id) if latest_run else None
        },
        "cv_health": {
            "version": latest_cv.version_number if latest_cv else (1 if latest_run else 0),
            "ats_score": state_json.get("ats_score", latest_cv.ats_score if latest_cv else None),
            "feedback": state_json.get("ats_breakdown"),
            "critique": state_json.get("cv_critique"),
            "cover_letter": state_json.get("cover_letter"),
            "last_updated": latest_run.created_at.isoformat() if latest_run else (latest_cv.created_at.isoformat() if latest_cv else None)
        },
        "job_matches": state_json.get("job_matches", [{
            "id": "mock-1",
            "title": "Target Role (Based on JD)",
            "company": "Market Benchmark",
            "match_score": (state_json.get("ats_score", 0) or 0) / 100.0,
            "tier": state_json.get("job_tier", "Realistic"),
            "missing_skills": state_json.get("missing_skills", []),
            "salary_min": state_json.get("salary_benchmarks", {}).get("salary_min"),
            "salary_median": state_json.get("salary_benchmarks", {}).get("salary_median"),
            "salary_max": state_json.get("salary_benchmarks", {}).get("salary_max"),
        }] if state_json.get("salary_benchmarks") else []),
        "skill_progress": {
            "roadmap_exists": "skill_roadmap" in state_json and bool(state_json["skill_roadmap"]),
            # Just a placeholder, would calculate based on DB Roadmap step checked boolean
            "completed": 0, 
            "total": len(state_json.get("skill_roadmap", []))
        },
        "skill_roadmap": state_json.get("skill_roadmap", []),
        "interview_readiness": {
            "last_score": latest_interview.overall_score if latest_interview else None,
            "trend": "up", # Logic to compare last two sessions
            "question_bank": state_json.get("interview_question_bank", [])
        },
        "next_actions": [
            "Review your latest ATS Score breakdown",
            "Complete Phase 1 of your Skill Roadmap",
            "Schedule a mock interview for Software Engineer"
        ]
    }
    
    return dashboard_data
