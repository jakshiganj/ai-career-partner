import json
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.pipeline import PipelineRun, PipelineState
from app.models.cv_history import CVVersion

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
        except Exception as e:
            print("WS broadcast failed:", e)
    
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
                state.interview_question_bank = [
                    "Tell me about a time you used the skills on your resume.",
                    f"How would you approach the challenges mentioned in this {state.job_tier} role?"
                ]
                
                # Stage 7: Persist & Notify
                print(f"[PIPELINE {pipeline_id}] Starting Stage 7: Persist")
                await self._update_state(run, state, "running", 7)

                await self._update_state(run, state, "completed", 7)
                print(f"[PIPELINE {pipeline_id}] ✅ COMPLETED SUCCESSFULLY")
                
            except Exception as e:
                print(f"[PIPELINE {pipeline_id}] ❌ FAILED: {e}")
                import traceback
                traceback.print_exc()
                state.error_log.append(str(e))
                await self._update_state(run, state, "failed")

