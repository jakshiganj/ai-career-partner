from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid

class UserPreference(SQLModel, table=True):
    __tablename__ = "user_preferences"

    # user_id is the primary key and foreign key to users table
    user_id: uuid.UUID = Field(primary_key=True, foreign_key="users.id", ondelete="CASCADE")
    email_digest_enabled: bool = Field(default=True)
    preferred_tone: str = Field(default="formal")
    target_role: Optional[str] = None
    expected_salary: Optional[int] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
