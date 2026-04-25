import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from app.graph.graph import build_graph
from app.graph.state import AgentState
from app.models.pipeline import PipelineRun, PipelineState
from app.models.cv_history import CVVersion
from app.models.job_market import JobMatch, SalaryBenchmark
from app.models.interview_roadmap import SkillRoadmap

class MasterOrchestratorAgent:

    def __init__(self, session: AsyncSession, db_url: str):
        self.session = session
        self.db_url = db_url

    # Removed _get_graph() helper since we need the context manager inline

    async def start_pipeline(self, user_id: str, cv_raw: str, job_description: str) -> str:
        """Create a pipeline run record and start background execution. Returns pipeline_id."""
        
        initial_state = AgentState(
            user_id=str(user_id),
            cv_raw=cv_raw,
            job_description=job_description,
            preferred_tone="formal",
            status="running",
            current_stage=1,
            error_log=[],
            messages=[]
        )
        
        # Create DB record first
        run = PipelineRun(
            user_id=user_id,
            status="running",
            current_stage=1,
            state_json=dict(initial_state)
        )
        self.session.add(run)
        await self.session.commit()
        await self.session.refresh(run)
        
        pipeline_id = str(run.id)
        initial_state["pipeline_id"] = pipeline_id

        # Fire and forget
        task = asyncio.create_task(
            self._run_graph(run.id, initial_state)
        )
        task.add_done_callback(lambda t: (
            print(f"[PIPELINE ERROR] {t.exception()}") if t.exception() else None
        ))
        
        return pipeline_id

    async def resume_pipeline(self, pipeline_id: str) -> str:
        """Resume an interrupted pipeline from its last completed node."""
        task = asyncio.create_task(self._resume_graph_task(pipeline_id))
        task.add_done_callback(lambda t: (
            print(f"[RESUME ERROR] {t.exception()}") if t.exception() else None
        ))
        return pipeline_id

    async def _resume_graph_task(self, pipeline_id: str):
        async with AsyncPostgresSaver.from_conn_string(self.db_url) as checkpointer:
            graph = build_graph(checkpointer=checkpointer)
            config = {"configurable": {"thread_id": pipeline_id}}
            await graph.ainvoke(None, config=config)

    async def _run_graph(self, run_id, initial_state: AgentState):
        """Background execution — runs the LangGraph pipeline and persists results."""
        from app.core.database import async_session
        
        async with async_session() as session:
            self.session = session
            run = await session.get(PipelineRun, run_id)
            
            try:
                async with AsyncPostgresSaver.from_conn_string(self.db_url) as checkpointer:
                    await checkpointer.setup()
                    graph = build_graph(checkpointer=checkpointer)
                    config = {"configurable": {"thread_id": str(run_id)}}
                    
                    # Stream events so we can broadcast WebSocket updates per node
                    async for event in graph.astream_events(initial_state, config=config, version="v2"):
                        if event["event"] == "on_chain_end":
                            node_name = event.get("name", "")
                            node_output = event.get("data", {}).get("output", {})
                            
                            if isinstance(node_output, dict):
                                # Sync to DB and broadcast WebSocket after each node
                                await self._sync_state(run, node_output)
                    
                    # Get final state
                    final_state = await graph.aget_state(config)
                    final = final_state.values
                    
                    # Persist to dedicated tables
                    await self._persist_to_tables(run, final, session)
                    
                    # Mark completed
                    run.status = final.get("status", "completed")
                    run.current_stage = final.get("current_stage", 7)
                    run.completed_at = datetime.utcnow()
                    run.state_json = dict(final)
                    session.add(run)
                    await session.commit()
                
            except Exception as e:
                import traceback
                traceback.print_exc()
                run.status = "failed"
                
                # Properly update state_json for SQLAlchemy JSONB mutation detection
                new_state = dict(run.state_json or {})
                new_state["error_log"] = new_state.get("error_log", []) + [str(e)]
                new_state["status"] = "failed"
                run.state_json = new_state
                
                session.add(run)
                await session.commit()

    async def _sync_state(self, run: PipelineRun, node_output: dict):
        """Update pipeline_runs row and broadcast WebSocket after each node completes."""
        if "current_stage" in node_output:
            run.current_stage = node_output["current_stage"]
        if "status" in node_output:
            run.status = node_output["status"]
        
        # Merge node output into existing state_json
        run.state_json = {**run.state_json, **node_output}
        self.session.add(run)
        await self.session.commit()
        
        # Broadcast WebSocket
        try:
            from app.routers.pipeline import manager
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
        except Exception as e:
            print(f"WS broadcast failed: {e}")

    async def _persist_to_tables(self, run, state: dict, session: AsyncSession):
        """Persist pipeline results to dedicated PostgreSQL tables."""
        user_id = run.user_id
        pipeline_id = run.id
        
        try:
            # Save CV version
            if state.get("optimised_cv"):
                cv_version = CVVersion(
                    user_id=user_id,
                    pipeline_id=pipeline_id,
                    cv_text=state.get("cv_raw", ""),
                    ats_score=state.get("ats_score"),
                    match_score=state.get("skill_match_score"),  # GraphRAG score
                    job_target=state.get("job_description", "")[:100]
                )
                session.add(cv_version)

            # Save salary benchmark
            sb_data = state.get("salary_benchmarks") or {}
            if sb_data.get("salary_min"):
                sb = SalaryBenchmark(
                    role_title=state.get("job_description", "Unknown")[:100],
                    salary_min=sb_data.get("salary_min"),
                    salary_median=sb_data.get("salary_median"),
                    salary_max=sb_data.get("salary_max"),
                    currency=sb_data.get("currency", "LKR"),
                )
                session.add(sb)

            # Save job matches from market analysis snippets
            # Backend state matches Frontend expectation: state.market_analysis.market_analysis
            market_results_root = state.get("market_analysis") or {}
            market_data = market_results_root.get("market_analysis") or {}
            for category, info in market_data.items():
                if not isinstance(info, dict): continue
                snippets = info.get("snippets", [])
                for snippet in snippets:
                    # snippet format: "Title at Company"
                    parts = snippet.split(" at ")
                    title = parts[0].strip() if len(parts) > 0 else snippet
                    company = parts[1].strip() if len(parts) > 1 else "Unknown"
                    
                    jm = JobMatch(
                        user_id=user_id,
                        pipeline_id=pipeline_id,
                        job_title=title[:100],
                        company=company[:100],
                        match_score=state.get("skill_match_score"),  # GraphRAG score
                        tier=state.get("job_tier"),
                        missing_skills=state.get("skill_gaps", []) or state.get("missing_skills", []),
                        salary_min=sb_data.get("salary_min"),
                        salary_max=sb_data.get("salary_max"),
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

            await session.commit()
            print(f"[PERSIST] [SUCCESS] All tables saved for pipeline {pipeline_id}")
            
        except Exception as e:
            print(f"[PERSIST] [WARNING] Non-fatal persistence error: {e}")
