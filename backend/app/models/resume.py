from sqlmodel import SQLModel, Field, Column
from typing import Optional
from datetime import datetime
from pgvector.sqlalchemy import Vector  # Import for Semantic Matching later

class Resume(SQLModel, table=True):
    __tablename__ = "resumes"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    
    # We store the raw text here so the AI can read it later
    content_text: str 
    
    # This stores the "meaning" of the CV as numbers (for Job Matching)
    # We use 384 dimensions because that's what the 'all-MiniLM-L6-v2' model uses
    embedding: Optional[list[float]] = Field(default=None, sa_column=Column(Vector(384)))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)