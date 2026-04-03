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


# ── STAGE 2: ANALYSE (WAVE 1 PARALLEL) ───────────────────────────────────────

async def analyse_node(state: AgentState) -> dict:
    """
    Stage 2 (Wave 1): Run ATS scoring, GraphRAG skill analysis, Market Trends, 
    CV Critique, Cover Letter, and Job Classifier concurrently!
    (Everything here only depends on initial Inputs)
    """
    print(f"[Stage 2] ANALYSE — Wave 1 Parallel Execution")
    
    cv_raw = state.get("cv_raw", "")
    job_description = state.get("job_description", "")
    preferred_tone = state.get("preferred_tone", "formal")
    error_log = list(state.get("error_log", []))
    
    # Define tasks for Wave 1
    ats_task = _run_ats(cv_raw, job_description)
    graphrag_task = _run_graphrag(state.get("candidate_profile", {}), job_description, cv_raw)
    market_task = _run_market(job_description)
    critique_task = analyze_cv_with_gemini(cv_raw)
    
    async def run_cover_letter():
        return await CoverLetterAgent().run(cv_raw, job_description, tone=preferred_tone)
    cl_task = run_cover_letter()
    
    async def run_classifier():
        return await JobClassifierAgent().run(cv_raw, job_description)
    classify_task = run_classifier()
    
    # Execute all 6 tasks concurrently
    results = await asyncio.gather(
        ats_task, graphrag_task, market_task, critique_task, cl_task, classify_task,
        return_exceptions=True
    )
    (ats_res, graphrag_res, market_res, critique_res, cl_res, classify_res) = results
    
    updates = {
        "current_stage": 2,
        "error_log": error_log,
        "messages": ["Stage 2: Wave 1 completed"]
    }
    
    # 1. ATS
    if isinstance(ats_res, Exception):
        updates["error_log"].append(f"ATS failed: {ats_res}")
    else:
        updates["ats_score"] = ats_res.get("ats_score", 0)
        updates["ats_breakdown"] = ats_res
        updates["missing_skills"] = ats_res.get("missing_keywords", [])
        
    # 2. GraphRAG
    if isinstance(graphrag_res, Exception):
        updates["error_log"].append(f"GraphRAG failed: {graphrag_res}")
    else:
        updates["skill_match_score"] = graphrag_res.get("skill_match_score")
        updates["skill_gaps"] = graphrag_res.get("skill_gaps", [])
        updates["implicit_skills"] = graphrag_res.get("implicit_skills", [])
        
    # 3. Market
    if isinstance(market_res, Exception):
        updates["error_log"].append(f"Market failed: {market_res}")
    else:
        updates["market_analysis"] = market_res
        updates["salary_benchmarks"] = market_res.get("salary_benchmarks", {})
        
    # 4. CV Critique
    if isinstance(critique_res, Exception):
        updates["error_log"].append(f"Critique failed: {critique_res}")
    else:
        updates["critique"] = critique_res
        
    # 5. Cover Letter
    if isinstance(cl_res, Exception):
        updates["error_log"].append(f"Cover Letter failed: {cl_res}")
    else:
        updates["cover_letter"] = cl_res
        
    # 6. Job Classifier
    if isinstance(classify_res, Exception):
        updates["error_log"].append(f"Classifier failed: {classify_res}")
        updates["job_tier"] = "Stretch"
    else:
        tier = classify_res.get("tier", "Stretch")
        updates["job_tier"] = tier if tier in ["Safety", "Realistic", "Reach"] else "Stretch"
        
    return updates

async def _run_ats(cv_raw: str, job_description: str) -> dict:
    return await ATSScorerAgent().run(cv_raw, job_description)

async def _run_graphrag(candidate_profile: dict, job_description: str, cv_raw: str = None) -> dict:
    return await graph_rag_agent(candidate_profile, job_description, cv_raw)

async def _run_market(job_description: str) -> dict:
    return await MarketConnectorAgent().run(job_description)


# ── STAGE 3: OPTIMISE (WAVE 2 PARALLEL) ──────────────────────────────────────

async def optimise_node(state: AgentState) -> dict:
    """
    Stage 3 (Wave 2): Run CV Creator, Skill Roadmap, and Interview Prep concurrently!
    (Everything here depends on Wave 1 outcomes)
    """
    print(f"[Stage 3] OPTIMISE — Wave 2 Parallel Execution")
    
    cv_raw = state.get("cv_raw", "")
    job_description = state.get("job_description", "")
    skill_gaps = state.get("skill_gaps", [])
    critique = state.get("critique", {})
    job_tier = state.get("job_tier", "Stretch")
    error_log = list(state.get("error_log", []))
    
    # Fallback to prevent failing output if critique errored
    if not critique:
        critique = {"summary": "CV requires general restructuring."}
        
    # Define tasks for Wave 2
    async def run_cv_creator():
        return await asyncio.to_thread(
            cv_creator_agent, cv_text=cv_raw, critique=critique, skill_gaps=skill_gaps
        )
        
    async def run_roadmap():
        gaps = skill_gaps if skill_gaps else state.get("missing_skills", [])
        return await RoadmapAgent().run(gaps, job_description)
        
    async def run_interview():
        return await generate_interview_questions(job_description, cv_raw, job_tier)
        
    results = await asyncio.gather(
        run_cv_creator(), run_roadmap(), run_interview(), return_exceptions=True
    )
    (cv_res, roadmap_res, int_res) = results
    
    updates = {
        "current_stage": 3,
        "error_log": error_log,
        "messages": ["Stage 3: Wave 2 completed"]
    }
    
    # CV Creator
    if isinstance(cv_res, Exception):
        updates["error_log"].append(f"CV Creator failed: {cv_res}")
    else:
        updates["optimised_cv"] = cv_res
        
    # Roadmap
    if isinstance(roadmap_res, Exception):
        updates["error_log"].append(f"Roadmap failed: {roadmap_res}")
        updates["skill_roadmap"] = []
    else:
        updates["skill_roadmap"] = roadmap_res.get("phases", [])
        
    # Interview Prep
    if isinstance(int_res, Exception):
        updates["error_log"].append(f"Interview Prep failed: {int_res}")
        updates["interview_question_bank"] = []
    else:
        updates["interview_question_bank"] = int_res
        
    return updates


# ── STAGE 4, 5, 6: FAST FORWARD PASS-THROUGHS ────────────────────────────────

async def classify_node(state: AgentState) -> dict:
    """Stage 4: Pass-through (logic resolved in Wave 1)."""
    return {"current_stage": 4, "messages": ["Stage 4: Job classification complete"]}

async def roadmap_node(state: AgentState) -> dict:
    """Stage 5: Pass-through (logic resolved in Wave 2)."""
    return {"current_stage": 5, "messages": ["Stage 5: Skill roadmap generated"]}

async def interview_prep_node(state: AgentState) -> dict:
    """Stage 6: Pass-through (logic resolved in Wave 2)."""
    return {"current_stage": 6, "messages": ["Stage 6: Interview prep ready"]}


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
