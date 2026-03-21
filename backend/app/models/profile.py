from sqlmodel import SQLModel, Field, Column, JSON
from typing import Optional, List
import uuid

class CandidateProfile(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id")
    
    # Basic CV Info
    headline: Optional[str] = Field(default=None)
    summary: Optional[str] = Field(default=None)
    
    # Store list of skills like ["Python", "Docker"]
    skills: List[str] = Field(default=[], sa_column=Column(JSON))
    
    # Store lists of objects as JSON
    experience: List[dict] = Field(default=[], sa_column=Column(JSON))
    education: List[dict] = Field(default=[], sa_column=Column(JSON))
    certifications: List[dict] = Field(default=[], sa_column=Column(JSON))
    
    experience_years: int = Field(default=0)
    career_goals: Optional[str] = Field(default=None)
    linkedin_url: Optional[str] = Field(default=None)