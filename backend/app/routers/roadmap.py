from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc
from typing import List, Dict, Any
import uuid

from app.core.database import get_session
from app.core.security import get_current_user
from app.core.logging import get_logger
from app.models.user import User
from app.models.interview_roadmap import SkillRoadmap
from app.schemas.response import SkillRoadmapResponse, RoadmapChatResponse, RoadmapPhase

router = APIRouter()
logger = get_logger(__name__)

@router.get("/current", response_model=SkillRoadmapResponse)
async def get_current_roadmap(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Fetches the latest active roadmap for the user."""
    logger.info(f"Fetching current roadmap for user: {current_user.email}")
    query = select(SkillRoadmap).where(SkillRoadmap.user_id == current_user.id).order_by(desc(SkillRoadmap.created_at)).limit(1)
    res = await session.execute(query)
    roadmap = res.scalar_one_or_none()
    
    if not roadmap:
        logger.warning(f"No roadmap found for user: {current_user.email}")
        raise HTTPException(status_code=404, detail="No roadmap found for user")
        
    return roadmap

@router.get("/pipeline/{pipeline_id}", response_model=SkillRoadmapResponse)
async def get_roadmap_by_pipeline(
    pipeline_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Fetches the roadmap associated with a specific pipeline run."""
    logger.info(f"Fetching roadmap for pipeline {pipeline_id} (User: {current_user.email})")
    query = select(SkillRoadmap).where(
        SkillRoadmap.user_id == current_user.id,
        SkillRoadmap.pipeline_id == pipeline_id
    ).order_by(desc(SkillRoadmap.created_at)).limit(1)
    res = await session.execute(query)
    roadmap = res.scalar_one_or_none()
    
    if not roadmap:
        logger.warning(f"No roadmap found for pipeline {pipeline_id}")
        raise HTTPException(status_code=404, detail="No roadmap found for this pipeline run")
        
    return roadmap

@router.patch("/{roadmap_id}", response_model=SkillRoadmapResponse)
async def update_roadmap(
    roadmap_id: uuid.UUID,
    payload: List[RoadmapPhase],
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Overwrites the JSONB roadmap state with new toggled progress metrics."""
    logger.info(f"Updating roadmap {roadmap_id}")
    roadmap = await session.get(SkillRoadmap, roadmap_id)
    if not roadmap or roadmap.user_id != current_user.id:
        logger.warning(f"Roadmap {roadmap_id} not found or unauthorized")
        raise HTTPException(status_code=404, detail="Roadmap not found")
        
    # Convert Pydantic models back to dict for JSONB storage
    roadmap.roadmap = [p.model_dump(exclude_none=True) for p in payload]
    session.add(roadmap)
    await session.commit()
    await session.refresh(roadmap)
    
    return roadmap

@router.post("/{roadmap_id}/pivot", response_model=SkillRoadmapResponse)
async def pivot_roadmap(
    roadmap_id: uuid.UUID,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Regenerates the roadmap dynamically using remaining tasks and user constraints."""
    logger.info(f"Pivoting roadmap {roadmap_id}")
    roadmap = await session.get(SkillRoadmap, roadmap_id)
    if not roadmap or roadmap.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Roadmap not found")
        
    constraint = payload.get("constraint", "")
    
    # 1. Extract remaining uncompleted tasks natively from the JSONB
    remaining_topics = []
    for phase in roadmap.roadmap:
        for item in phase.get("action_items", []):
            if isinstance(item, dict) and not item.get("completed"):
                remaining_topics.append(item.get("task", ""))
            elif isinstance(item, str):
                remaining_topics.append(item)
                
    if not remaining_topics:
        raise HTTPException(status_code=400, detail="You have completed all skills in this roadmap! Generate a new one from a CV scan.")
        
    # Cap size to prevent massive prompts
    remaining_topics = remaining_topics[:15]
    
    # 2. Regenerate with AI
    from app.agents.roadmap_agent import RoadmapAgent
    agent = RoadmapAgent()
    new_data = await agent.run(remaining_topics, roadmap.target_role, constraint=constraint)
    
    if new_data and "error" in new_data:
        logger.error(f"RoadmapAgent failed to pivot: {new_data['error']}")
        raise HTTPException(status_code=500, detail="AI Agent failed to pivot roadmap.")
        
    if new_data and "phases" in new_data:
        # Overwrite current state
        roadmap.roadmap = new_data["phases"]
        session.add(roadmap)
        await session.commit()
        await session.refresh(roadmap)
        
    return roadmap

@router.post("/{roadmap_id}/chat", response_model=RoadmapChatResponse)
async def chat_with_roadmap(
    roadmap_id: uuid.UUID,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Processes a user message, updates completed tasks via LLM, and returns a reply."""
    logger.info(f"Chat message received for roadmap {roadmap_id}")
    roadmap = await session.get(SkillRoadmap, roadmap_id)
    if not roadmap or roadmap.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Roadmap not found")
        
    user_message = payload.get("message", "")
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    from app.agents.roadmap_chat_agent import RoadmapChatAgent
    agent = RoadmapChatAgent()
    
    result = await agent.chat(user_message, roadmap.roadmap)
    
    if "error" in result:
        logger.error(f"RoadmapChatAgent failed: {result['error']}")
        raise HTTPException(status_code=500, detail="AI Agent failed to process the chat message.")
        
    reply_text = result.get("reply", "I've updated your roadmap!")
    
    if "updated_roadmap" in result and isinstance(result["updated_roadmap"], list):
        roadmap.roadmap = result["updated_roadmap"]
        session.add(roadmap)
        await session.commit()
        await session.refresh(roadmap)
        
    return {
        "reply": reply_text,
        "roadmap": roadmap
    }
