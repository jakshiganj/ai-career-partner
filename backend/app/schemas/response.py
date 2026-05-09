from pydantic import BaseModel, Field
from typing import Optional, Any, List, Dict
from datetime import datetime
import uuid

class MessageResponse(BaseModel):
    message: str
    status: str = "success"

class CheckoutSessionResponse(BaseModel):
    url: str

class ErrorResponse(BaseModel):
    detail: str
    type: Optional[str] = None

# ─── CV & Analysis Models ───────────────────────────────────────────────────

class CVUploadResponse(BaseModel):
    message: str
    cv_id: uuid.UUID
    text_preview: str

class CVAnalysisResponse(BaseModel):
    cv_id: uuid.UUID
    ai_feedback: str

# ─── Dashboard Models ───────────────────────────────────────────────────────

class DashboardPipelineStatus(BaseModel):
    is_running: bool
    current_stage: int
    pipeline_id: Optional[uuid.UUID] = None

class DashboardCVHealth(BaseModel):
    version: Optional[int] = None
    ats_score: Optional[float] = None
    feedback: Optional[Dict[str, Any]] = None
    critique: Optional[str] = None
    cover_letter: Optional[str] = None
    last_updated: Optional[datetime] = None

class JobMatchItem(BaseModel):
    id: str
    title: str
    company: str
    match_score: float
    tier: str
    missing_skills: Optional[List[str]] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    url: Optional[str] = None

class SalaryBenchmarkItem(BaseModel):
    role_title: str
    salary_min: Optional[int] = None
    salary_median: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = "GBP"

class DashboardInterviewReadiness(BaseModel):
    last_score: Optional[float] = None
    report: Optional[Dict[str, Any]] = None
    trend: Optional[List[Dict[str, Any]]] = None
    question_bank: Optional[List[str]] = None

class DashboardSummary(BaseModel):
    cv_raw: Optional[str] = None
    goal: Optional[str] = None
    pipeline_status: Optional[DashboardPipelineStatus] = None
    cv_health: Optional[DashboardCVHealth] = None
    job_matches: Optional[List[JobMatchItem]] = None
    hot_skills: Optional[List[str]] = None
    salary_benchmarks: Optional[List[SalaryBenchmarkItem]] = None
    skill_progress: Optional[Dict[str, Any]] = None
    skill_roadmap: Optional[List[Any]] = None
    interview_readiness: Optional[DashboardInterviewReadiness] = None
    next_actions: Optional[List[str]] = None

# ─── Roadmap Models ─────────────────────────────────────────────────────────

class RoadmapActionItem(BaseModel):
    task: str
    completed: bool

class RoadmapPhase(BaseModel):
    model_config = {"extra": "ignore"}
    
    phase_name: Optional[str] = None
    focus: Optional[str] = None
    estimated_weeks: Optional[Any] = None
    duration_weeks: Optional[Any] = None
    weeks: Optional[Any] = None
    skills_covered: Optional[List[str]] = None
    action_items: Optional[List[Any]] = None
    milestones: Optional[List[Any]] = None

class SkillRoadmapResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    pipeline_id: Optional[uuid.UUID] = None
    roadmap: List[Any]  # Relaxed to handle variations in AI output
    target_role: Optional[str] = None
    created_at: Optional[datetime] = None

class RoadmapChatResponse(BaseModel):
    reply: str
    roadmap: SkillRoadmapResponse
