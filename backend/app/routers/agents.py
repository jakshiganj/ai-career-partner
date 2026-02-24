from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List

from app.agents.market_trends.agent import market_trends_agent
from app.agents.graph_rag.agent import graph_rag_agent
from app.core.agent_iam import verify_agent_token

router = APIRouter()

class SkillsRequest(BaseModel):
    skills: List[str]

@router.post("/trends")
async def get_market_trends(
    request: SkillsRequest,
    agent: dict = Depends(verify_agent_token),
):
    """Protected: requires X-Agent-Token header (M2M JWT)."""
    try:
        return market_trends_agent(request.skills)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/graph")
async def get_related_skills(
    request: SkillsRequest,
    agent: dict = Depends(verify_agent_token),
):
    """Protected: requires X-Agent-Token header (M2M JWT)."""
    try:
        return graph_rag_agent(request.skills)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
