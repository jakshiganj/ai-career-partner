from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB
from typing import Optional, List
from datetime import datetime
import uuid

class JobMatch(SQLModel, table=True):
    __tablename__ = "job_matches"

    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE")
    pipeline_id: Optional[uuid.UUID] = Field(foreign_key="pipeline_runs.id")
    job_title: Optional[str] = None
    company: Optional[str] = None
    match_score: Optional[float] = None
    tier: Optional[str] = None # 'Realistic', 'Stretch', 'Reach'
    missing_skills: List[str] = Field(default=[], sa_column=Column(JSONB))
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    job_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SalaryBenchmark(SQLModel, table=True):
    __tablename__ = "salary_benchmarks"

    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    role_title: str = Field(nullable=False)
    experience_level: Optional[str] = None
    location: Optional[str] = None
    salary_min: Optional[int] = None
    salary_median: Optional[int] = None
    salary_max: Optional[int] = None
    currency: str = Field(default="LKR")
    source_url: Optional[str] = None
    scraped_at: datetime = Field(default_factory=datetime.utcnow)
