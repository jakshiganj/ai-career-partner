from sqlmodel import SQLModel, Field, Column, JSON
from typing import Optional, List

class CandidateProfile(SQLModel, table=True):
    __tablename__ = "profiles"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    
    # Store list of skills like ["Python", "Docker"]
    skills: List[str] = Field(default=[], sa_column=Column(JSON))
    
    experience_years: int = Field(default=0)
    career_goals: Optional[str] = Field(default=None)
    linkedin_url: Optional[str] = Field(default=None)