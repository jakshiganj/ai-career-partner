from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid
from datetime import datetime

class PipelineStartOptions(BaseModel):
    run_interview_prep: bool = True
    tone: str = "formal"


class PipelineStartRequest(BaseModel):
    cv_text: str
    job_description: str
    options: Optional[PipelineStartOptions] = None


class PipelineInputRequest(BaseModel):
    job_description: Optional[str] = None
    cv_raw: Optional[str] = None
    skills: Optional[List[str]] = None


# ─── Response Models ────────────────────────────────────────────────────────

class PipelineRunSummary(BaseModel):
    id: uuid.UUID
    label: str
    created_at: Optional[datetime] = None
    ats_score: Optional[float] = None
    status: str
    current_stage: int


class PipelineListResponse(BaseModel):
    runs: List[PipelineRunSummary]
    total: int
    skip: int
    limit: int


class PipelineStatusResponse(BaseModel):
    status: str
    current_stage: int
    completed_stages: List[int]
    error_log: List[str]


class PipelineResultState(BaseModel):
    model_config = {"extra": "ignore"}
    
    pipeline_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    current_stage: Optional[int] = None
    cv_raw: Optional[str] = None
    job_description: Optional[str] = None
    preferred_tone: Optional[str] = None
    candidate_profile: Optional[Dict[str, Any]] = None
    ats_score: Optional[float] = None
    ats_breakdown: Optional[Dict[str, Any]] = None
    skill_gaps: Optional[List[str]] = None
    skill_match_score: Optional[float] = None
    implicit_skills: Optional[List[str]] = None
    market_analysis: Optional[Dict[str, Any]] = None
    salary_benchmarks: Optional[Dict[str, Any]] = None
    critique: Optional[Dict[str, Any]] = None
    cv_critique: Optional[str] = None  # Legacy support
    optimised_cv: Optional[Any] = None # Can be string or Dict
    cover_letter: Optional[str] = None
    job_tier: Optional[str] = None
    missing_skills: Optional[List[str]] = None
    skill_roadmap: Optional[List[Any]] = None
    interview_question_bank: Optional[List[Any]] = None
    messages: Optional[List[str]] = None
    missing_fields: Optional[List[str]] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_log: Optional[List[str]] = None
