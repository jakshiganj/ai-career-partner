"""
Pipeline request/response schemas — separated from router for clarity.
"""
from typing import Optional, List
from pydantic import BaseModel


class PipelineStartOptions(BaseModel):
    run_interview_prep: bool = True
    tone: str = "formal"


class PipelineStartRequest(BaseModel):
    cv_text: str
    job_description: str
    options: Optional[PipelineStartOptions] = None


class PipelineInputRequest(BaseModel):
    job_description: Optional[str] = None
    cv_raw: Optional[str] = None
    skills: Optional[List[str]] = None
