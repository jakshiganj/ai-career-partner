from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid

class InterviewSession(SQLModel, table=True):
    __tablename__ = "interview_sessions"

    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE")
    pipeline_id: Optional[uuid.UUID] = Field(foreign_key="pipeline_runs.id")
    question_bank: List[str] = Field(default=[], sa_column=Column(JSONB))
    answers: Dict[str, Any] = Field(default={}, sa_column=Column(JSONB))
    scores: Dict[str, Any] = Field(default={}, sa_column=Column(JSONB))
    overall_score: Optional[float] = None
    completed_at: Optional[datetime] = None

class SkillRoadmap(SQLModel, table=True):
    __tablename__ = "skill_roadmaps"

    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE")
    pipeline_id: Optional[uuid.UUID] = Field(foreign_key="pipeline_runs.id")
    roadmap: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSONB, nullable=False))
    target_role: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
