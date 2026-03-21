from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB
from typing import Optional, List, Dict, Literal, Any
from datetime import datetime
import uuid
from pydantic import BaseModel

class PipelineState(BaseModel):
    pipeline_id: str
    user_id: str
    status: Literal["running", "completed", "failed", "partial", "waiting_for_input"]
    current_stage: int
    cv_raw: str
    job_description: str
    candidate_profile: Optional[Dict[str, Any]] = None
    ats_score: Optional[int] = None
    ats_breakdown: Optional[Dict[str, Any]] = None
    skill_gaps: Optional[List[str]] = None
    skill_match_score: Optional[float] = None
    market_trends: Optional[Dict[str, Any]] = None
    salary_benchmarks: Optional[Dict[str, Any]] = None
    cv_critique: Optional[str] = None
    optimised_cv: Optional[str] = None
    cover_letter: Optional[str] = None
    job_tier: Optional[Literal["Realistic", "Stretch", "Reach"]] = None
    missing_skills: Optional[List[str]] = None
    skill_roadmap: Optional[List[Dict[str, Any]]] = None
    interview_question_bank: Optional[List[str]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_log: List[str] = []
    missing_fields: Optional[List[str]] = []

class PipelineRun(SQLModel, table=True):
    __tablename__ = "pipeline_runs"

    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE")
    status: str = Field(default="running")
    current_stage: int = Field(default=0)
    state_json: dict = Field(default={}, sa_column=Column(JSONB, nullable=False))
    error_log: List[str] = Field(default=[], sa_column=Column(JSONB))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
