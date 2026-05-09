"""
Wave 1 — Stage 2: Parallel analysis tasks that depend only on initial inputs.

Contains:
  - analyse_node: ATS scoring, GraphRAG, Market Trends, CV Critique, Cover Letter, Job Classifier
  - Helper functions: _run_ats, _run_graphrag, _run_market
"""
import asyncio
from app.graph.state import AgentState
from app.agents.cv_critique.agent import analyze_cv_with_gemini
from app.agents.ats_scorer_agent import ATSScorerAgent
from app.agents.cover_letter_agent import CoverLetterAgent
from app.agents.job_classifier_agent import JobClassifierAgent
from app.agents.market_trends.market_connector_agent import MarketConnectorAgent
from app.agents.graph_rag.agent import graph_rag_agent


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
