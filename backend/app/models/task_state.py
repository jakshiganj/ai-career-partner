from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import enum


class TaskStatus(str, enum.Enum):
    idle = "Idle"
    working = "Working"
    paused = "Paused"
    success = "Success"
    failed = "Failed"


class TaskState(SQLModel, table=True):
    __tablename__ = "task_states"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    status: TaskStatus = Field(default=TaskStatus.idle)
    current_agent: Optional[str] = Field(default=None)
    context_json: Optional[str] = Field(default=None)  # JSON blob for persistence
    missing_fields: Optional[str] = Field(default=None)  # Comma-separated list
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DecisionAudit(SQLModel, table=True):
    __tablename__ = "decision_audits"

    id: Optional[int] = Field(default=None, primary_key=True)
    task_state_id: int = Field(foreign_key="task_states.id", index=True)
    agent_name: str
    decision: str        # e.g. "ROUTE_TO_MARKET_ANALYST", "INPUT_REQUIRED"
    reasoning: Optional[str] = Field(default=None)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
