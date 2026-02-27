from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid

class CVVersion(SQLModel, table=True):
    __tablename__ = "cv_versions"

    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", ondelete="CASCADE")
    version_number: int = Field(nullable=False)
    cv_text: str = Field(nullable=False)
    ats_score: Optional[int] = None
    match_score: Optional[float] = None
    job_target: Optional[str] = None
    pipeline_id: Optional[uuid.UUID] = Field(default=None, foreign_key="pipeline_runs.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
