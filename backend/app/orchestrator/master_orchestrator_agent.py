import json
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.pipeline import PipelineRun, PipelineState
from app.models.cv_history import CVVersion
from app.models.job_market import JobMatch, SalaryBenchmark
from app.models.interview_roadmap import SkillRoadmap

from app.agents.linkedin_import_agent import LinkedInImportAgent
from app.agents.cv_critique.agent import analyze_cv_with_gemini
from app.agents.ats_scorer_agent import ATSScorerAgent
from app.agents.cover_letter_agent import CoverLetterAgent
from app.agents.job_classifier_agent import JobClassifierAgent
from app.agents.market_trends.market_connector_agent import MarketConnectorAgent
from app.agents.roadmap_agent import RoadmapAgent

class MasterOrchestratorAgent:
    """
    CoordinatorAgent built on Google ADK that manages the full pipeline.
    It maintains a shared PipelineState object persisted in PostgreSQL.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def _update_state(self, run: PipelineRun, state: PipelineState, status: str, stage: int = None):
        """Helper to sync Pydantic state back to PostgreSQL row"""
        run.status = status
        if stage is not None:
            run.current_stage = stage
            state.current_stage = stage
        
        state.status = status
        if status in ["completed", "failed"]:
            state.completed_at = datetime.utcnow()
            run.completed_at = datetime.utcnow()
            
        run.state_json = state.model_dump(mode="json")
        
        self.session.add(run)
        await self.session.commit()

        # Broadcast to WebSockets
        try:
            from app.routers.pipeline import manager
            user_id = str(run.user_id)
            if user_id in manager.active_connections:
                payload = {
                    "type": "STATE_UPDATE",
                    "status": "Working" if status == "running" else "Success" if status == "completed" else "Failed",
                    "current_agent": f"Stage {stage}" if stage else "Pipeline",
                    "message": f"Pipeline is {status}"
                }
                aws = [ws.send_json(payload) for ws in manager.active_connections[user_id]]
                if aws:
                    await asyncio.gather(*aws, return_exceptions=True)
                
                # Also send specific payload for waiting_for_input
                if status == "waiting_for_input":
                    aws_wait = [ws.send_json({
                        "type": "WAITING_FOR_INPUT",
                        "status": "waiting_for_input",
                        "missing_fields": state.missing_fields
                    }) for ws in manager.active_connections[user_id]]
                    if aws_wait:
                        await asyncio.gather(*aws_wait, return_exceptions=True)
        except Exception as e:
            print("WS broadcast failed:", e)

    async def _persist_to_tables(self, run: PipelineRun, state: PipelineState):
        """
        Stage 7: Persist pipeline results to dedicated database tables.
        This ensures data is queryable independently of state_json.
        """
        user_id = run.user_id
        pipeline_id = run.id
        
        try:
            # 1. Persist salary benchmarks
            if state.salary_benchmarks and state.salary_benchmarks.get("salary_min"):
                sb = SalaryBenchmark(
                    role_title=state.job_description[:100] if state.job_description else "Unknown",
                    experience_level="mid",
                    location="remote",
                    salary_min=state.salary_benchmarks.get("salary_min"),
                    salary_median=state.salary_benchmarks.get("salary_median"),
                    salary_max=state.salary_benchmarks.get("salary_max"),
                    currency=state.salary_benchmarks.get("currency", "USD"),
                    source_url="MarketConnectorAgent",
                )
                self.session.add(sb)
                print(f"[PERSIST] Saved salary benchmark: {sb.salary_min}-{sb.salary_max} {sb.currency}")

            # 2. Persist primary job match from classifier
            jm = JobMatch(
                user_id=user_id,
                pipeline_id=pipeline_id,
                job_title=state.job_description[:100] if state.job_description else "Target Role",
                company=None,
                match_score=state.ats_score / 100.0 if state.ats_score else None,
                tier=state.job_tier,
                missing_skills=state.missing_skills or [],
                salary_min=state.salary_benchmarks.get("salary_min") if state.salary_benchmarks else None,
                salary_max=state.salary_benchmarks.get("salary_max") if state.salary_benchmarks else None,
            )
            self.session.add(jm)
            print(f"[PERSIST] Saved job match: tier={state.job_tier}, score={jm.match_score}")

            # 3. Persist scraped market jobs as additional matches
            market_data = state.model_dump(mode="json").get("market_analysis", {})
            if isinstance(market_data, dict):
                analysis = market_data.get("market_analysis", {})
                seen_titles = set()
                for skill, info in analysis.items():
                    if not isinstance(info, dict):
                        continue
                    for snippet in info.get("snippets", []):
                        parts = snippet.split(" at ", 1)
                        title = parts[0].strip() if parts else snippet.strip()
                        company = parts[1].strip() if len(parts) == 2 else None
                        if title.lower() in seen_titles:
                            continue
                        seen_titles.add(title.lower())
                        scraped_match = JobMatch(
                            user_id=user_id,
                            pipeline_id=pipeline_id,
                            job_title=title,
                            company=company,
                            match_score=None,
                            tier=None,
                            missing_skills=[],
                        )
                        self.session.add(scraped_match)
                if seen_titles:
                    print(f"[PERSIST] Saved {len(seen_titles)} scraped job matches")

            # 4. Persist skill roadmap
            if state.skill_roadmap:
                sr = SkillRoadmap(
                    user_id=user_id,
                    pipeline_id=pipeline_id,
                    roadmap=state.skill_roadmap,
                    target_role=state.job_description[:100] if state.job_description else None,
                )
                self.session.add(sr)
                print(f"[PERSIST] Saved skill roadmap with {len(state.skill_roadmap)} phases")

            await self.session.commit()
            print(f"[PERSIST] ✅ All tables persisted successfully")
            
        except Exception as e:
            print(f"[PERSIST] ⚠️ Table persistence failed (non-fatal): {e}")
            # Don't re-raise — persistence failure shouldn't kill the pipeline
    
    async def start_pipeline(self, user_id: str, cv_raw: str, job_description: str) -> PipelineState:
        """Entrypoint for stage 1-7 execution"""
        state = PipelineState(
            pipeline_id="", # Assigned after DB insert
            user_id=str(user_id),
            status="running",
            current_stage=1,
            cv_raw=cv_raw,
            job_description=job_description,
            created_at=datetime.utcnow(),
            error_log=[]
        )
        
        run = PipelineRun(
            user_id=user_id,
            status="running",
            current_stage=1,
            state_json=state.model_dump(mode="json")
        )
        self.session.add(run)
        await self.session.commit()
        await self.session.refresh(run)
        
        state.pipeline_id = str(run.id)
        run.state_json = state.model_dump(mode="json")
        await self.session.commit()

        # Fire and forget the background pipeline processing
        def _on_done(task):
            if task.exception():
                import traceback
                print(f"[PIPELINE ERROR] Background pipeline crashed: {task.exception()}")
                traceback.print_exception(type(task.exception()), task.exception(), task.exception().__traceback__)

        bg = asyncio.create_task(self.run_pipeline_stages(run.id))
        bg.add_done_callback(_on_done)
        
        return state

    async def run_pipeline_stages(self, pipeline_id):
        """Background execution of stages 1 to 7"""
        from app.core.database import async_session
        async with async_session() as session:
            self.session = session
            run = await session.get(PipelineRun, pipeline_id)
            if not run:
                return
                
            state = PipelineState(**run.state_json)
            
            try:
                # Stage 1: Ingest (LinkedIn / Parsing)
                print(f"[PIPELINE {pipeline_id}] Starting Stage 1: Ingest")
                await self._update_state(run, state, "running", 1)
                
                # Check 1: Missing CV data
                if not state.cv_raw or len(state.cv_raw.strip()) < 50:
                    print(f"[PIPELINE {pipeline_id}] Pausing: Missing CV data")
                    state.missing_fields = ["cv_raw"]
                    await self._update_state(run, state, "waiting_for_input", 1)
                    return
                
                # Stage 2: Analyse (Parallel)
                print(f"[PIPELINE {pipeline_id}] Starting Stage 2: Analyse")
                await self._update_state(run, state, "running", 2)
                
                ats_agent = ATSScorerAgent()
                market_agent = MarketConnectorAgent()
                
                print(f"[PIPELINE {pipeline_id}] Running ATS + Market agents...")
                ats_result, market_result = await asyncio.gather(
                    ats_agent.run(state.cv_raw, state.job_description),
                    market_agent.run(state.job_description)
                )
                print(f"[PIPELINE {pipeline_id}] ATS Score: {ats_result.get('ats_score', 'N/A')}")
                
                state.ats_score = ats_result.get("ats_score", 0)
                state.ats_breakdown = ats_result
                if "missing_keywords" in ats_result:
                    state.missing_skills = ats_result["missing_keywords"]
                    
                state.salary_benchmarks = market_result
                
                # Check 2: Missing Job Description data before Stage 3
                if not state.job_description or len(state.job_description.strip()) < 20:
                    print(f"[PIPELINE {pipeline_id}] Pausing: Missing Job Description")
                    state.missing_fields = ["job_description"]
                    await self._update_state(run, state, "waiting_for_input", 2)
                    return
                    
                # Stage 3: Optimise (Sequential)
                print(f"[PIPELINE {pipeline_id}] Starting Stage 3: Optimise")
                await self._update_state(run, state, "running", 3)
                critique = await analyze_cv_with_gemini(state.cv_raw, self.session)
                state.cv_critique = str(critique)
                
                cl_agent = CoverLetterAgent()
                state.cover_letter = await cl_agent.run(state.cv_raw, state.job_description)
                
                # Stage 4: Classify
                print(f"[PIPELINE {pipeline_id}] Starting Stage 4: Classify")
                await self._update_state(run, state, "running", 4)
                job_agent = JobClassifierAgent()
                job_classification = await job_agent.run(state.cv_raw, state.job_description)
                tier = job_classification.get("tier", "Realistic")
                if tier in ["Realistic", "Stretch", "Reach"]:
                     state.job_tier = tier
                
                # Stage 5: Roadmap
                print(f"[PIPELINE {pipeline_id}] Starting Stage 5: Roadmap")
                await self._update_state(run, state, "running", 5)
                if state.missing_skills:
                    roadmap_agent = RoadmapAgent()
                    roadmap_result = await roadmap_agent.run(state.missing_skills, state.job_description)
                    state.skill_roadmap = roadmap_result.get("phases", [])
                
                # Stage 6: Interview Prep
                print(f"[PIPELINE {pipeline_id}] Starting Stage 6: Interview Prep")
                await self._update_state(run, state, "running", 6)
                from app.agents.interview_prep.agent import generate_interview_questions
                state.interview_question_bank = await generate_interview_questions(
                    state.job_description, state.cv_raw, state.job_tier
                )
                
                # Stage 7: Persist & Notify
                print(f"[PIPELINE {pipeline_id}] Starting Stage 7: Persist")
                await self._update_state(run, state, "running", 7)
                
                # Persist to dedicated tables (job_matches, salary_benchmarks, skill_roadmaps)
                await self._persist_to_tables(run, state)

                await self._update_state(run, state, "completed", 7)
                print(f"[PIPELINE {pipeline_id}] ✅ COMPLETED SUCCESSFULLY")
                
            except Exception as e:
                print(f"[PIPELINE {pipeline_id}] ❌ FAILED: {e}")
                import traceback
                traceback.print_exc()
                state.error_log.append(str(e))
                await self._update_state(run, state, "failed")
