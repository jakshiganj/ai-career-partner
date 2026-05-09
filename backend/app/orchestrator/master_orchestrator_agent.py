import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

from app.graph.graph import build_graph
from app.graph.state import AgentState
from app.models.pipeline import PipelineRun, PipelineState
from app.services.pipeline_persistence import sync_state, persist_to_tables

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
        
        # 1. Initial fetch - use a short-lived session
        async with async_session() as session:
            run = await session.get(PipelineRun, run_id)
            if not run:
                print(f"[ERROR] Pipeline run {run_id} not found.")
                return

        try:
            async with AsyncPostgresSaver.from_conn_string(self.db_url) as checkpointer:
                await checkpointer.setup()
                graph = build_graph(checkpointer=checkpointer)
                config = {"configurable": {"thread_id": str(run_id)}}
                
                # Stream events so we can broadcast WebSocket updates per node
                async for event in graph.astream_events(initial_state, config=config, version="v2"):
                    if event["event"] == "on_chain_end":
                        node_output = event.get("data", {}).get("output", {})
                        if isinstance(node_output, dict) and node_output:
                            await sync_state(run_id, node_output)
                
                # 2. Final persistence
                final_state = await graph.aget_state(config)
                final = final_state.values
                
                async with async_session() as session:
                    run = await session.get(PipelineRun, run_id)
                    # Persist to dedicated tables
                    await persist_to_tables(run, final, session)
                    
                    # Mark completed
                    run.status = final.get("status", "completed")
                    run.current_stage = final.get("current_stage", 7)
                    run.completed_at = datetime.utcnow()
                    run.state_json = dict(final)
                    session.add(run)
                    
                    try:
                        await session.commit()
                    except Exception as commit_err:
                        await session.rollback()
                        print(f"[FINAL COMMIT ERROR] {commit_err}")
                        raise commit_err
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            async with async_session() as session:
                run = await session.get(PipelineRun, run_id)
                if run:
                    run.status = "failed"
                    new_state = dict(run.state_json or {})
                    new_state["error_log"] = new_state.get("error_log", []) + [str(e)]
                    new_state["status"] = "failed"
                    run.state_json = new_state
                    session.add(run)
                    await session.commit()
