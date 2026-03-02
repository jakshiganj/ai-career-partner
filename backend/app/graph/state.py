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
