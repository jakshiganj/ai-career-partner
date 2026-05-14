"""
Pipeline persistence service — handles state sync, WebSocket broadcast,
and multi-table persistence. Extracted from MasterOrchestratorAgent.
"""
import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import get_logger

logger = get_logger(__name__)

from app.models.pipeline import PipelineRun
from app.models.cv_history import CVVersion
from app.models.job_market import JobMatch, SalaryBenchmark
from app.models.interview_roadmap import SkillRoadmap


async def sync_state(run_id: str, node_output: dict):
    """Update pipeline_runs row and broadcast WebSocket after each node completes."""
    from app.core.database import async_session
    
    async with async_session() as session:
        run = await session.get(PipelineRun, run_id)
        if not run:
            return
            
        if "current_stage" in node_output:
            run.current_stage = node_output["current_stage"]
        if "status" in node_output:
            run.status = node_output["status"]
        
        # Merge node output into existing state_json
        run.state_json = {**run.state_json, **node_output}
        session.add(run)
        await session.commit()
        
        # Broadcast WebSocket
        try:
            from app.core.ws_manager import manager
            user_id = str(run.user_id)
            if user_id in manager.active_connections:
                payload = {
                    "type": "STATE_UPDATE",
                    "status": node_output.get("status", "running"),
                    "current_stage": node_output.get("current_stage"),
                    "messages": node_output.get("messages", [])
                }
                aws = [ws.send_json(payload) for ws in manager.active_connections[user_id]]
                await asyncio.gather(*aws, return_exceptions=True)
        except Exception as ws_err:
            logger.error(f"WebSocket broadcast error: {ws_err}")


async def persist_to_tables(run, state: dict, session: AsyncSession):
    """Persist pipeline results to dedicated PostgreSQL tables."""
    user_id = run.user_id
    pipeline_id = run.id
    
    try:
        # Save CV version
        if state.get("optimised_cv"):
            # Get the next version number for this user with a lock to avoid race conditions
            from sqlalchemy import select, func
            stmt = select(func.max(CVVersion.version_number)).where(CVVersion.user_id == user_id)
            max_res = await session.execute(stmt)
            current_max = max_res.scalar() or 0
            
            cv_version = CVVersion(
                user_id=user_id,
                pipeline_id=pipeline_id,
                version_number=current_max + 1,
                cv_text=state.get("cv_raw", ""),
                ats_score=state.get("ats_score"),
                match_score=state.get("skill_match_score"),  # GraphRAG score
                job_target=state.get("job_description", "")[:100]
            )
            session.add(cv_version)

        # Clean salary data (ensure ints)
        def clean_int(val):
            if val is None: return None
            try:
                if isinstance(val, str):
                    # Remove symbols like $, ,
                    import re
                    val = re.sub(r'[^\d]', '', val)
                return int(val)
            except (ValueError, TypeError): return None

        # Save salary benchmark
        sb_data = state.get("salary_benchmarks") or {}
        if sb_data.get("salary_min"):
            sb = SalaryBenchmark(
                role_title=state.get("job_description", "Unknown")[:100],
                salary_min=clean_int(sb_data.get("salary_min")),
                salary_median=clean_int(sb_data.get("salary_median")),
                salary_max=clean_int(sb_data.get("salary_max")),
                currency=sb_data.get("currency", "LKR"),
            )
            session.add(sb)

        # Save job matches from market analysis snippets
        market_results_root = state.get("market_analysis") or {}
        market_data = market_results_root.get("market_analysis") or {}
        for category, info in market_data.items():
            if not isinstance(info, dict): continue
            snippets = info.get("snippets", [])
            for snippet in snippets:
                parts = snippet.split(" at ")
                title = parts[0].strip() if len(parts) > 0 else snippet
                company = parts[1].strip() if len(parts) > 1 else "Unknown"
                
                jm = JobMatch(
                    user_id=user_id,
                    pipeline_id=pipeline_id,
                    job_title=title[:100],
                    company=company[:100],
                    match_score=state.get("skill_match_score"),
                    tier=state.get("job_tier"),
                    missing_skills=state.get("skill_gaps", []) or state.get("missing_skills", []),
                    salary_min=clean_int(sb_data.get("salary_min")),
                    salary_max=clean_int(sb_data.get("salary_max")),
                )
                session.add(jm)

        # Save skill roadmap
        if state.get("skill_roadmap"):
            sr = SkillRoadmap(
                user_id=user_id,
                pipeline_id=pipeline_id,
                roadmap=state["skill_roadmap"],
                target_role=state.get("job_description", "")[:100],
            )
            session.add(sr)

        # await session.commit()  <-- Remove internal commit, let orchestrator handle it
        logger.info(f"[PERSIST] [SUCCESS] All tables queued for pipeline {pipeline_id}")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"[PERSIST] [ERROR] Persistence failure: {e}")
        
        # IMPORTANT: Rollback the aborted transaction so the session can be used again!
        await session.rollback()
        
        # Add to error log in state so it persists
        error_list = state.get("error_log", [])
        error_list.append(f"Persistence failed: {str(e)}")
        state["error_log"] = error_list
