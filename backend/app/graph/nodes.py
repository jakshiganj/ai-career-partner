from datetime import datetime
from app.graph.state import AgentState
from app.graph.wave1 import analyse_node
from app.graph.wave2 import optimise_node
from app.agents.roadmap_agent import RoadmapAgent
from app.agents.interview_prep.agent import interview_prep_agent

async def ingest_node(state: AgentState) -> dict:
    print(f"[Stage 1] INGEST — pipeline_id={state.get('pipeline_id')}")
    missing = []
    if not state.get("cv_raw") or len(state.get("cv_raw", "").strip()) < 50:
        missing.append("cv_raw")
    if not state.get("job_description") or len(state.get("job_description", "").strip()) < 5:
        missing.append("job_description")
    if missing:
        return {"status": "waiting_for_input", "missing_fields": missing, "current_stage": 1, "messages": [f"Stage 1: Missing required inputs: {missing}"]}
    return {"status": "running", "current_stage": 1, "messages": ["Stage 1: Inputs validated successfully"]}

async def classify_node(state: AgentState) -> dict:
    return {"current_stage": 4, "messages": ["Stage 4: Job classification complete"]}

async def roadmap_node(state: AgentState) -> dict:
    print(f"[Stage 5] ROADMAP — Generating skill progression")
    missing_skills = state.get("skill_gaps", []) or state.get("missing_skills", [])
    target_role = state.get("job_description", "Software Engineer")
    
    if not missing_skills:
        return {"current_stage": 5, "messages": ["Stage 5: No significant skill gaps found, skipping roadmap"]}
    
    try:
        agent = RoadmapAgent()
        roadmap_data = await agent.run(missing_skills, target_role)
        # The agent returns a dict with "phases". We'll store it in skill_roadmap
        return {
            "current_stage": 5, 
            "skill_roadmap": roadmap_data.get("phases", []),
            "messages": ["Stage 5: Skill roadmap generated successfully"]
        }
    except Exception as e:
        return {"current_stage": 5, "error_log": state.get("error_log", []) + [f"Roadmap failed: {e}"], "messages": ["Stage 5: Failed to generate roadmap"]}

async def interview_prep_node(state: AgentState) -> dict:
    print(f"[Stage 6] INTERVIEW PREP — Generating question bank")
    jd = state.get("job_description", "")
    resume = state.get("cv_raw", "")
    tier = state.get("job_tier", "Realistic")
    
    try:
        prep_data = await interview_prep_agent(jd, resume, tier=tier)
        return {
            "current_stage": 6,
            "interview_question_bank": prep_data.get("initial_questions", []),
            "interview_session_id": prep_data.get("session_id"),
            "messages": ["Stage 6: Interview preparation materials ready"]
        }
    except Exception as e:
        return {"current_stage": 6, "error_log": state.get("error_log", []) + [f"Interview prep failed: {e}"], "messages": ["Stage 6: Failed to generate interview prep"]}

async def persist_node(state: AgentState) -> dict:
    print(f"[Stage 7] PERSIST")
    error_log = list(state.get("error_log", []))
    return {"status": "completed", "current_stage": 7, "completed_at": datetime.utcnow().isoformat(), "error_log": error_log, "messages": ["Stage 7: Pipeline completed successfully"]}

from langgraph.graph import END

def route_after_ingest(state: AgentState) -> str:
    if state.get("status") == "waiting_for_input":
        return END
    return "analyse"

def route_after_classify(state: AgentState) -> str:
    if state.get("skill_gaps") or state.get("missing_skills"):
        return "roadmap"
    return "interview_prep"
