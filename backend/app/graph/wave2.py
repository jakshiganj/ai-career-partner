"""
Wave 2 — Stage 3: Parallel optimization tasks that depend on Wave 1 outcomes.

Contains:
  - optimise_node: CV Creator, Skill Roadmap, Interview Prep
"""
import asyncio
from app.graph.state import AgentState
from app.agents.cv_creator.agent import cv_creator_agent
from app.agents.roadmap_agent import RoadmapAgent
from app.agents.interview_prep.agent import generate_interview_questions


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
