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
    if not state.get("job_description") or len(state.get("job_description", "").strip()) < 5:
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
    graphrag_task = _run_graphrag(state.get("candidate_profile", {}), job_description)
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
        updates["skill_match_score"] = graphrag_result.get("skill_match_score")
        updates["skill_gaps"] = graphrag_result.get("skill_gaps", [])
        updates["implicit_skills"] = graphrag_result.get("implicit_skills", [])
        updates["messages"].append(f"Stage 2: Skill Match Score = {graphrag_result.get('skill_match_score')}")
    
    # Market result
    if isinstance(market_result, Exception):
        updates["error_log"].append(f"Stage 2 MarketConnectorAgent failed: {market_result}")
        updates["messages"].append("Stage 2: Market trends failed — continuing")
    else:
        # market_result contains: {'salary_benchmarks': {...}, 'market_analysis': {...}}
        # We assign full object to satisfy frontend nesting: state.market_analysis.market_analysis
        updates["market_analysis"] = market_result
        updates["salary_benchmarks"] = market_result.get("salary_benchmarks", {})
        updates["messages"].append("Stage 2: Market data retrieved")
    
    return updates


async def _run_ats(cv_raw: str, job_description: str) -> dict:
    agent = ATSScorerAgent()
    return await agent.run(cv_raw, job_description)

async def _run_graphrag(candidate_profile: dict, job_description: str) -> dict:
    return await graph_rag_agent(candidate_profile, job_description)

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
        critique = await analyze_cv_with_gemini(cv_raw)
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
        if tier not in ["Safety", "Realistic", "Reach"]:
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

from langgraph.graph import END

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
