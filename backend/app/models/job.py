from sqlmodel import SQLModel, Field, Column
from typing import Optional
from datetime import datetime
from pgvector.sqlalchemy import Vector

class Job(SQLModel, table=True):
    __tablename__ = "jobs"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description_text: str
    
    # Store the vector embedding of the job description
    embedding: Optional[list[float]] = Field(default=None, sa_column=Column(Vector(384)))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)