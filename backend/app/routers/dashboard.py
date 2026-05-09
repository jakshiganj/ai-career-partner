from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc
from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.pipeline import PipelineRun
from app.models.cv_history import CVVersion
from app.models.interview_roadmap import InterviewSession, SkillRoadmap
from app.models.job_market import JobMatch, SalaryBenchmark
from app.services.dashboard_service import (
    build_job_cards_from_market, 
    build_job_cards_from_db, 
    assemble_dashboard_data
)

router = APIRouter()

@router.post("/test-digest")
async def trigger_test_digest(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Manually triggers the DigestAgent to send a weekly summary email to the current user.
    """
    from app.agents.digest_agent import DigestAgent
    agent = DigestAgent()
    result = await agent.run(current_user.id, session)
    return result


@router.get("/")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Aggregates data for the Candidate Dashboard (Feature 9).
    Reads from both state_json (live) and dedicated tables (persisted).
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

    all_interviews_query = select(InterviewSession).where(InterviewSession.user_id == user_id).order_by(InterviewSession.completed_at)
    all_int_res = await session.execute(all_interviews_query)
    all_interviews = all_int_res.scalars().all()

    # 4. Persisted job matches (from dedicated table)
    job_matches_query = select(JobMatch).where(JobMatch.user_id == user_id).order_by(desc(JobMatch.created_at)).limit(20)
    jm_res = await session.execute(job_matches_query)
    db_job_matches = jm_res.scalars().all()

    # 5. Persisted skill roadmap — prefer one linked to THIS pipeline run
    db_roadmap = None
    if latest_run:
        roadmap_query = select(SkillRoadmap).where(
            SkillRoadmap.user_id == user_id,
            SkillRoadmap.pipeline_id == latest_run.id
        ).limit(1)
        rm_res = await session.execute(roadmap_query)
        db_roadmap = rm_res.scalar_one_or_none()
    
    # Fall back to the most recent roadmap if current run has none
    if not db_roadmap:
        fallback_query = select(SkillRoadmap).where(SkillRoadmap.user_id == user_id).order_by(desc(SkillRoadmap.created_at)).limit(1)
        fb_res = await session.execute(fallback_query)
        db_roadmap = fb_res.scalar_one_or_none()

    # 6. Salary benchmarks (from dedicated table)
    salary_query = select(SalaryBenchmark).order_by(desc(SalaryBenchmark.scraped_at)).limit(5)
    sal_res = await session.execute(salary_query)
    db_salaries = sal_res.scalars().all()

    state_json = latest_run.state_json if latest_run else {}

    # Build job cards: prefer live market_analysis data, supplement with DB matches
    job_cards = build_job_cards_from_market(state_json)
    if not job_cards and db_job_matches:
        job_cards = build_job_cards_from_db(db_job_matches)

    # Roadmap: prefer current run's state_json (freshest), then DB row
    roadmap_data = state_json.get("skill_roadmap", []) or (db_roadmap.roadmap if db_roadmap and db_roadmap.roadmap else [])

    return assemble_dashboard_data(
        latest_run=latest_run,
        latest_cv=latest_cv,
        latest_interview=latest_interview,
        all_interviews=all_interviews,
        db_job_matches=db_job_matches,
        db_roadmap=db_roadmap,
        db_salaries=db_salaries,
        state_json=state_json,
        job_cards=job_cards,
        roadmap_data=roadmap_data,
    )
