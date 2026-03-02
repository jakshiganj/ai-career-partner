# Migrate Pipeline to LangGraph

## What You Are Doing
Migrating the existing `MasterOrchestratorAgent` pipeline from manual sequential execution in `backend/app/agents/master_orchestrator.py` to a proper LangGraph `StateGraph`. The existing logic, agents, and database persistence code must be preserved — you are only changing how the pipeline is orchestrated, not rewriting the agents themselves.

---

## Current State of the Codebase

The current pipeline lives in:
```
backend/app/agents/master_orchestrator.py   — manual stage execution (REPLACE THIS)
backend/app/graph/state.py                  — AgentState (EXTEND THIS)
backend/app/graph/graph.py                  — partial LangGraph graph (REPLACE THIS)
```

Existing agents that must be reused as-is:
```
backend/app/agents/cv_critique/agent.py         → analyze_cv_with_gemini()
backend/app/agents/cv_creator/agent.py          → cv_creator_agent()
backend/app/agents/ats_scorer_agent.py          → ATSScorerAgent
backend/app/agents/cover_letter_agent.py        → CoverLetterAgent
backend/app/agents/job_classifier_agent.py      → JobClassifierAgent
backend/app/agents/market_trends/market_connector_agent.py → MarketConnectorAgent
backend/app/agents/roadmap_agent.py             → RoadmapAgent
backend/app/agents/interview_prep/agent.py      → generate_interview_questions()
backend/app/agents/graph_rag/agent.py           → graph_rag_agent()
```

Database persistence helpers to reuse from master_orchestrator.py:
```
_persist_to_tables()   — saves job_matches, salary_benchmarks, skill_roadmaps to PostgreSQL
_update_state()        — syncs PipelineState to pipeline_runs table + broadcasts WebSocket
```

---

## Install Dependencies First

```bash
pip install langgraph langgraph-checkpoint-postgres psycopg[binary] psycopg-pool
```

---

## Step 1: Update AgentState

Replace the contents of `backend/app/graph/state.py` with a LangGraph-compatible TypedDict. This must include every field currently in `PipelineState` from `app/models/pipeline.py`:

```python
# backend/app/graph/state.py
from typing import TypedDict, Optional, Any
from datetime import datetime

class AgentState(TypedDict, total=False):
    # Identity
    pipeline_id: str
    user_id: str
    
    # Inputs
    cv_raw: str
    job_description: str
    preferred_tone: str           # "formal" | "conversational" | "creative"
    
    # Stage 2 outputs
    ats_score: Optional[int]
    ats_breakdown: Optional[dict]
    skill_match_score: Optional[float]
    skill_gaps: Optional[list[str]]
    implicit_skills: Optional[list[str]]
    missing_skills: Optional[list[str]]
    market_analysis: Optional[dict]
    salary_benchmarks: Optional[dict]
    
    # Stage 3 outputs
    critique: Optional[dict]
    optimised_cv: Optional[str]
    cover_letter: Optional[str]
    
    # Stage 4 outputs
    job_tier: Optional[str]       # "Realistic" | "Stretch" | "Reach"
    
    # Stage 5 outputs
    skill_roadmap: Optional[list]
    
    # Stage 6 outputs
    interview_question_bank: Optional[list]
    
    # Pipeline metadata
    status: str
    current_stage: int
    error_log: list[str]
    messages: list[str]
    missing_fields: Optional[list[str]]
    created_at: Optional[str]
    completed_at: Optional[str]
    
    # DB references (passed through, not modified by nodes)
    _run_id: Optional[Any]        # PipelineRun SQLAlchemy object id
    _session: Optional[Any]       # AsyncSession — passed via config not state
```

---

## Step 2: Create Node Functions

Create a new file `backend/app/graph/nodes.py`. Each node is an async function that takes `AgentState` and returns a partial state dict. 

**Critical rules for all nodes:**
- Every node must have its own try/except — a node failure must NOT raise, it must log to `error_log` and return partial state
- Nodes must never return the full state — only return the keys they modify
- All agent calls must be awaited (make sure underlying agents are async — if not, wrap with `asyncio.to_thread()`)

```python
# backend/app/graph/nodes.py
import asyncio
from datetime import datetime
from app.graph.state import AgentState
from app.agents.cv_critique.agent import analyze_cv_with_gemini
from app.agents.cv_creator.agent import cv_creator_agent
from app.agents.ats_scorer_agent import ATSScorerAgent
from app.agents.cover_letter_agent import CoverLetterAgent
from app.agents.job_classifier_agent import JobClassifierAgent
from app.agents.market_trends.market_connector_agent import MarketConnectorAgent
from app.agents.roadmap_agent import RoadmapAgent
from app.agents.interview_prep.agent import generate_interview_questions
from app.agents.graph_rag.agent import graph_rag_agent


# ── STAGE 1: INGEST ──────────────────────────────────────────────────────────

async def ingest_node(state: AgentState) -> dict:
    """
    Stage 1: Validate inputs are present.
    CV parsing has already happened before the pipeline starts (via upload endpoint).
    This node just validates the state is ready to proceed.
    """
    print(f"[Stage 1] INGEST — pipeline_id={state.get('pipeline_id')}")
    
    missing = []
    if not state.get("cv_raw") or len(state.get("cv_raw", "").strip()) < 50:
        missing.append("cv_raw")
    if not state.get("job_description") or len(state.get("job_description", "").strip()) < 20:
        missing.append("job_description")
    
    if missing:
        return {
            "status": "waiting_for_input",
            "missing_fields": missing,
            "current_stage": 1,
            "messages": [f"Stage 1: Missing required inputs: {missing}"]
        }
    
    return {
        "status": "running",
        "current_stage": 1,
        "messages": ["Stage 1: Inputs validated successfully"]
    }


# ── STAGE 2: ANALYSE (PARALLEL) ──────────────────────────────────────────────

async def analyse_node(state: AgentState) -> dict:
    """
    Stage 2: Run ATS scoring, GraphRAG skill analysis, and market trends concurrently.
    Each sub-task has independent error handling — one failure does not stop the others.
    """
    print(f"[Stage 2] ANALYSE — running ATS + GraphRAG + Market in parallel")
    
    cv_raw = state.get("cv_raw", "")
    job_description = state.get("job_description", "")
    error_log = list(state.get("error_log", []))
    
    # Run all three concurrently
    ats_task = _run_ats(cv_raw, job_description)
    graphrag_task = _run_graphrag(cv_raw, job_description)
    market_task = _run_market(job_description)
    
    ats_result, graphrag_result, market_result = await asyncio.gather(
        ats_task, graphrag_task, market_task, return_exceptions=True
    )
    
    updates = {
        "current_stage": 2,
        "error_log": error_log,
        "messages": []
    }
    
    # ATS result
    if isinstance(ats_result, Exception):
        updates["error_log"].append(f"Stage 2 ATSScorerAgent failed: {ats_result}")
        updates["messages"].append("Stage 2: ATS scoring failed — continuing")
    else:
        updates["ats_score"] = ats_result.get("ats_score", 0)
        updates["ats_breakdown"] = ats_result
        updates["missing_skills"] = ats_result.get("missing_keywords", [])
        updates["messages"].append(f"Stage 2: ATS Score = {ats_result.get('ats_score')}")
    
    # GraphRAG result
    if isinstance(graphrag_result, Exception):
        updates["error_log"].append(f"Stage 2 GraphRAGAgent failed: {graphrag_result}")
        updates["messages"].append("Stage 2: GraphRAG failed — continuing")
    else:
        updates["skill_match_score"] = graphrag_result.get("final_score")
        updates["skill_gaps"] = graphrag_result.get("skill_gaps", [])
        updates["implicit_skills"] = graphrag_result.get("implicit_skills", [])
        updates["messages"].append(f"Stage 2: Skill Match Score = {graphrag_result.get('final_score')}")
    
    # Market result
    if isinstance(market_result, Exception):
        updates["error_log"].append(f"Stage 2 MarketConnectorAgent failed: {market_result}")
        updates["messages"].append("Stage 2: Market trends failed — continuing")
    else:
        updates["market_analysis"] = market_result
        updates["salary_benchmarks"] = market_result.get("salary_benchmarks")
        updates["messages"].append("Stage 2: Market data retrieved")
    
    return updates


async def _run_ats(cv_raw: str, job_description: str) -> dict:
    agent = ATSScorerAgent()
    return await agent.run(cv_raw, job_description)

async def _run_graphrag(cv_raw: str, job_description: str) -> dict:
    # graph_rag_agent may be sync — wrap if needed
    return await asyncio.to_thread(graph_rag_agent, cv_raw, job_description)

async def _run_market(job_description: str) -> dict:
    agent = MarketConnectorAgent()
    return await agent.run(job_description)


# ── STAGE 3: OPTIMISE (SEQUENTIAL WITHIN NODE) ───────────────────────────────

async def optimise_node(state: AgentState) -> dict:
    """
    Stage 3: CV Critique → CV Creator → Cover Letter (sequential, each depends on previous).
    All three steps run inside this single node in strict order.
    """
    print(f"[Stage 3] OPTIMISE — CV critique → create → cover letter")
    
    cv_raw = state.get("cv_raw", "")
    job_description = state.get("job_description", "")
    skill_gaps = state.get("skill_gaps", [])
    preferred_tone = state.get("preferred_tone", "formal")
    error_log = list(state.get("error_log", []))
    updates = {"current_stage": 3, "error_log": error_log, "messages": []}
    
    # Step 1: CV Critique
    critique = None
    try:
        critique = await asyncio.to_thread(analyze_cv_with_gemini, cv_raw)
        updates["critique"] = critique
        updates["messages"].append(f"Stage 3: CV critique complete — score={critique.get('score')}")
    except Exception as e:
        updates["error_log"].append(f"Stage 3 CVCriticAgent failed: {e}")
        updates["messages"].append("Stage 3: CV critique failed — continuing")
    
    # Step 2: CV Creator (uses critique from step 1)
    try:
        optimised_cv = await asyncio.to_thread(
            cv_creator_agent,
            cv_text=cv_raw,
            critique=critique or {},
            skill_gaps=skill_gaps
        )
        updates["optimised_cv"] = optimised_cv
        updates["messages"].append("Stage 3: Optimised CV generated")
    except Exception as e:
        updates["error_log"].append(f"Stage 3 CVCreatorAgent failed: {e}")
        updates["messages"].append("Stage 3: CV creation failed — continuing")
    
    # Step 3: Cover Letter
    try:
        cl_agent = CoverLetterAgent()
        cover_letter = await cl_agent.run(cv_raw, job_description, tone=preferred_tone)
        updates["cover_letter"] = cover_letter
        updates["messages"].append("Stage 3: Cover letter generated")
    except Exception as e:
        updates["error_log"].append(f"Stage 3 CoverLetterAgent failed: {e}")
        updates["messages"].append("Stage 3: Cover letter failed — continuing")
    
    return updates


# ── STAGE 4: CLASSIFY ─────────────────────────────────────────────────────────

async def classify_node(state: AgentState) -> dict:
    """Stage 4: Classify job match tier based on skill match score from GraphRAG."""
    print(f"[Stage 4] CLASSIFY")
    
    error_log = list(state.get("error_log", []))
    
    try:
        agent = JobClassifierAgent()
        result = await agent.run(state.get("cv_raw", ""), state.get("job_description", ""))
        tier = result.get("tier", "Stretch")
        
        # Validate tier value
        if tier not in ["Realistic", "Stretch", "Reach"]:
            tier = "Stretch"
        
        return {
            "job_tier": tier,
            "current_stage": 4,
            "error_log": error_log,
            "messages": [f"Stage 4: Job tier = {tier}"]
        }
    except Exception as e:
        error_log.append(f"Stage 4 JobClassifierAgent failed: {e}")
        return {
            "job_tier": "Stretch",  # safe default
            "current_stage": 4,
            "error_log": error_log,
            "messages": ["Stage 4: Classification failed — defaulting to Stretch"]
        }


# ── STAGE 5: ROADMAP ─────────────────────────────────────────────────────────

async def roadmap_node(state: AgentState) -> dict:
    """Stage 5: Generate skill learning roadmap from GraphRAG skill gaps."""
    print(f"[Stage 5] ROADMAP")
    
    error_log = list(state.get("error_log", []))
    
    # Prefer GraphRAG skill_gaps, fall back to ATS missing_skills
    gaps = state.get("skill_gaps") or state.get("missing_skills") or []
    
    try:
        agent = RoadmapAgent()
        result = await agent.run(gaps, state.get("job_description", ""))
        return {
            "skill_roadmap": result.get("phases", []),
            "current_stage": 5,
            "error_log": error_log,
            "messages": [f"Stage 5: Roadmap generated with {len(result.get('phases', []))} phases"]
        }
    except Exception as e:
        error_log.append(f"Stage 5 RoadmapAgent failed: {e}")
        return {
            "skill_roadmap": [],
            "current_stage": 5,
            "error_log": error_log,
            "messages": ["Stage 5: Roadmap generation failed — continuing"]
        }


# ── STAGE 6: INTERVIEW PREP ───────────────────────────────────────────────────

async def interview_prep_node(state: AgentState) -> dict:
    """Stage 6: Generate personalised interview question bank."""
    print(f"[Stage 6] INTERVIEW PREP")
    
    error_log = list(state.get("error_log", []))
    
    try:
        questions = await generate_interview_questions(
            state.get("job_description", ""),
            state.get("cv_raw", ""),
            state.get("job_tier", "Stretch")
        )
        return {
            "interview_question_bank": questions,
            "current_stage": 6,
            "error_log": error_log,
            "messages": [f"Stage 6: {len(questions)} interview questions generated"]
        }
    except Exception as e:
        error_log.append(f"Stage 6 InterviewPrepAgent failed: {e}")
        return {
            "interview_question_bank": [],
            "current_stage": 6,
            "error_log": error_log,
            "messages": ["Stage 6: Interview prep failed — continuing"]
        }


# ── STAGE 7: PERSIST ─────────────────────────────────────────────────────────

async def persist_node(state: AgentState) -> dict:
    """
    Stage 7: Persist all pipeline results to dedicated PostgreSQL tables.
    Uses _persist_to_tables logic from the original MasterOrchestratorAgent.
    Session is passed via config, not state.
    """
    print(f"[Stage 7] PERSIST")
    
    error_log = list(state.get("error_log", []))
    
    # Persistence is handled by the orchestrator after graph completion
    # This node just marks the pipeline as complete
    return {
        "status": "completed",
        "current_stage": 7,
        "completed_at": datetime.utcnow().isoformat(),
        "error_log": error_log,
        "messages": ["Stage 7: Pipeline completed successfully"]
    }


# ── ROUTING FUNCTIONS ─────────────────────────────────────────────────────────

def route_after_ingest(state: AgentState) -> str:
    """If inputs are missing, stop. Otherwise continue to Stage 2."""
    if state.get("status") == "waiting_for_input":
        return END
    return "analyse"

def route_after_classify(state: AgentState) -> str:
    """Skip roadmap if no skill gaps exist."""
    if state.get("skill_gaps") or state.get("missing_skills"):
        return "roadmap"
    return "interview_prep"
```

---

## Step 3: Build the Graph

Replace the contents of `backend/app/graph/graph.py`:

```python
# backend/app/graph/graph.py
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from app.graph.state import AgentState
from app.graph.nodes import (
    ingest_node,
    analyse_node,
    optimise_node,
    classify_node,
    roadmap_node,
    interview_prep_node,
    persist_node,
    route_after_ingest,
    route_after_classify,
)

def build_graph(checkpointer=None):
    workflow = StateGraph(AgentState)

    # Register all nodes
    workflow.add_node("ingest",         ingest_node)
    workflow.add_node("analyse",        analyse_node)
    workflow.add_node("optimise",       optimise_node)
    workflow.add_node("classify",       classify_node)
    workflow.add_node("roadmap",        roadmap_node)
    workflow.add_node("interview_prep", interview_prep_node)
    workflow.add_node("persist",        persist_node)

    # Entry point
    workflow.set_entry_point("ingest")

    # Edges with conditional routing
    workflow.add_conditional_edges(
        "ingest",
        route_after_ingest,
        {"analyse": "analyse", END: END}
    )
    workflow.add_edge("analyse",        "optimise")
    workflow.add_edge("optimise",       "classify")
    workflow.add_conditional_edges(
        "classify",
        route_after_classify,
        {"roadmap": "roadmap", "interview_prep": "interview_prep"}
    )
    workflow.add_edge("roadmap",        "interview_prep")
    workflow.add_edge("interview_prep", "persist")
    workflow.add_edge("persist",        END)

    return workflow.compile(checkpointer=checkpointer)
```

---

## Step 4: Update MasterOrchestratorAgent

Replace `backend/app/agents/master_orchestrator.py` with a slimmed down version that uses the graph:

```python
# backend/app/agents/master_orchestrator.py
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

    async def _get_graph(self):
        checkpointer = await AsyncPostgresSaver.from_conn_string(self.db_url)
        await checkpointer.setup()  # creates checkpoint tables if not exist
        return build_graph(checkpointer=checkpointer)

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
        graph = await self._get_graph()
        config = {"configurable": {"thread_id": pipeline_id}}
        
        # LangGraph resumes automatically from checkpoint
        task = asyncio.create_task(
            graph.ainvoke(None, config=config)  # None = resume from checkpoint
        )
        task.add_done_callback(lambda t: (
            print(f"[RESUME ERROR] {t.exception()}") if t.exception() else None
        ))
        
        return pipeline_id

    async def _run_graph(self, run_id, initial_state: AgentState):
        """Background execution — runs the LangGraph pipeline and persists results."""
        from app.core.database import async_session
        
        async with async_session() as session:
            self.session = session
            run = await session.get(PipelineRun, run_id)
            
            try:
                graph = await self._get_graph()
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
                run.state_json["error_log"] = run.state_json.get("error_log", []) + [str(e)]
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
            if state.get("salary_benchmarks", {}).get("salary_min"):
                sb = SalaryBenchmark(
                    role_title=state.get("job_description", "Unknown")[:100],
                    salary_min=state["salary_benchmarks"].get("salary_min"),
                    salary_median=state["salary_benchmarks"].get("salary_median"),
                    salary_max=state["salary_benchmarks"].get("salary_max"),
                    currency=state["salary_benchmarks"].get("currency", "USD"),
                )
                session.add(sb)

            # Save job match — use GraphRAG score not ATS score
            jm = JobMatch(
                user_id=user_id,
                pipeline_id=pipeline_id,
                job_title=state.get("job_description", "Target Role")[:100],
                match_score=state.get("skill_match_score"),  # GraphRAG
                tier=state.get("job_tier"),
                missing_skills=state.get("skill_gaps", []) or state.get("missing_skills", []),
                salary_min=state.get("salary_benchmarks", {}).get("salary_min"),
                salary_max=state.get("salary_benchmarks", {}).get("salary_max"),
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
            print(f"[PERSIST] ✅ All tables saved for pipeline {pipeline_id}")
            
        except Exception as e:
            print(f"[PERSIST] ⚠️ Non-fatal persistence error: {e}")
```

---

## Step 5: Add DB URL to Environment

```bash
# .env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/careerai
LANGGRAPH_CHECKPOINT_URL=postgresql://user:password@localhost:5432/careerai
```

Note: LangGraph checkpointer uses `psycopg` (sync URL format `postgresql://`) while SQLAlchemy uses `asyncpg` (async URL format `postgresql+asyncpg://`). Both point to the same database.

---

## Step 6: Update Pipeline Router

In `backend/app/routers/pipeline.py`, update the start endpoint to use the new orchestrator:

```python
@router.post("/pipeline/start")
async def start_pipeline(
    request: PipelineStartRequest,
    session: AsyncSession = Depends(get_session)
):
    orchestrator = MasterOrchestratorAgent(
        session=session,
        db_url=settings.LANGGRAPH_CHECKPOINT_URL
    )
    pipeline_id = await orchestrator.start_pipeline(
        user_id=request.user_id,
        cv_raw=request.cv_raw,
        job_description=request.job_description
    )
    return {"pipeline_id": pipeline_id, "status": "running"}

@router.post("/pipeline/{pipeline_id}/resume")
async def resume_pipeline(
    pipeline_id: str,
    session: AsyncSession = Depends(get_session)
):
    orchestrator = MasterOrchestratorAgent(
        session=session,
        db_url=settings.LANGGRAPH_CHECKPOINT_URL
    )
    await orchestrator.resume_pipeline(pipeline_id)
    return {"pipeline_id": pipeline_id, "status": "resumed"}
```

---

## Files to Delete After Migration

Once everything is working, delete:
```
backend/app/graph/graph.py         — replaced by new version above
```

These files are replaced in-place (do not delete):
```
backend/app/agents/master_orchestrator.py   — replaced with new version
backend/app/graph/state.py                  — replaced with new version
```

---

## Verification Steps

After making all changes, verify the migration worked:

1. **Server starts without import errors:**
```bash
uvicorn app.main:app --reload
```

2. **Graph builds without errors:**
```python
from app.graph.graph import build_graph
graph = build_graph()
print(graph.get_graph().draw_mermaid())  # should print a Mermaid diagram
```

3. **Run a test pipeline:**
```python
import asyncio
from app.graph.graph import build_graph
from app.graph.state import AgentState

async def test():
    graph = build_graph()
    state = AgentState(
        pipeline_id="test-001",
        user_id="user-001",
        cv_raw="Software engineer with 3 years Python experience...",
        job_description="Looking for a Python backend engineer...",
        status="running",
        current_stage=1,
        error_log=[],
        messages=[]
    )
    result = await graph.ainvoke(state)
    print("Final stage:", result["current_stage"])
    print("Errors:", result["error_log"])
    print("Messages:", result["messages"])

asyncio.run(test())
```

4. **Verify resumability:**
```python
# Simulate interruption by checking checkpoint exists after partial run
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
# Check that checkpoint tables were created: checkpoints, checkpoint_blobs, checkpoint_writes
```

5. **Verify failure isolation** — temporarily raise an exception inside `analyse_node`'s `_run_ats` function and confirm the pipeline continues to Stage 3 with `ats_score = None` and the error logged.

---

## Common Errors and Fixes

| Error | Fix |
|---|---|
| `ImportError: langgraph-checkpoint-postgres` | Run `pip install langgraph-checkpoint-postgres psycopg[binary] psycopg-pool` |
| `TypeError: 'coroutine' object is not iterable` | Agent function is sync — wrap with `asyncio.to_thread()` |
| `KeyError` in node function | Use `.get()` not direct dict access on AgentState |
| Checkpoint table missing | Call `await checkpointer.setup()` before first run |
| `InvalidStateError: Graph is not compiled` | Always call `build_graph()` which returns `workflow.compile()` |