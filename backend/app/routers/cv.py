import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc

from app.core.database import get_session
from app.core.security import get_current_user
from app.core.logging import get_logger
from app.models.user import User
from app.models.cv_history import CVVersion
from app.models.profile import CandidateProfile
from app.agents.cv_critique.agent import analyze_cv_with_gemini 
from app.agents.cv_parser_agent import CVParserAgent
from app.schemas.response import CVUploadResponse, CVAnalysisResponse
from app.schemas.cv import CVUploadRequest

router = APIRouter()
logger = get_logger(__name__)

@router.post("/upload", status_code=201, response_model=CVUploadResponse)
async def upload_cv(
    req: CVUploadRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Handles CV text upload, versions it, and updates the candidate profile."""
    logger.info(f"Processing CV upload for user: {current_user.email}")
    text = req.text
    
    # 1. Fetch existing versions to calculate version number
    result = await session.execute(
        select(CVVersion).where(CVVersion.user_id == current_user.id)
    )
    existing_versions = result.scalars().all()
    next_version = len(existing_versions) + 1
    
    # 2. Save to History (Primary storage)
    new_version = CVVersion(
        user_id=current_user.id,
        version_number=next_version,
        cv_text=text
    )
    session.add(new_version)
    await session.commit()
    await session.refresh(new_version)
    
    # 4. Extract Structured Data via Agent
    logger.info("Parsing CV structured data via AI Agent")
    parser = CVParserAgent()
    parsed_data = await parser.run(text)
    
    # 5. Upsert into CandidateProfile
    result_profile = await session.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    )
    profile = result_profile.scalar_one_or_none()
    
    if profile:
        profile.headline = parsed_data.get("headline", profile.headline)
        profile.summary = parsed_data.get("summary", profile.summary)
        profile.skills = parsed_data.get("skills", profile.skills)
        profile.experience = parsed_data.get("experience", profile.experience)
        profile.education = parsed_data.get("education", profile.education)
        profile.certifications = parsed_data.get("certifications", profile.certifications)
        session.add(profile)
    else:
        profile = CandidateProfile(
            user_id=current_user.id,
            headline=parsed_data.get("headline"),
            summary=parsed_data.get("summary"),
            skills=parsed_data.get("skills", []),
            experience=parsed_data.get("experience", []),
            education=parsed_data.get("education", []),
            certifications=parsed_data.get("certifications", [])
        )
        session.add(profile)
        
    await session.commit()
    
    # 6. Auto-Sync Roadmap with new CV Data
    from app.models.interview_roadmap import SkillRoadmap
    from app.agents.roadmap_sync_agent import RoadmapSyncAgent
    
    try:
        query = select(SkillRoadmap).where(SkillRoadmap.user_id == current_user.id).order_by(desc(SkillRoadmap.created_at)).limit(1)
        res_rm = await session.execute(query)
        active_roadmap = res_rm.scalar_one_or_none()
        
        if active_roadmap:
            logger.info("Syncing active roadmap with new CV data")
            sync_agent = RoadmapSyncAgent()
            sync_result = await sync_agent.sync(parsed_data, active_roadmap.roadmap)
            if sync_result and "updated_roadmap" in sync_result:
                active_roadmap.roadmap = sync_result["updated_roadmap"]
                session.add(active_roadmap)
                await session.commit()
    except Exception as e:
        logger.error(f"Roadmap sync failed: {e}")
        pass
    
    return {
        "message": "CV uploaded and parsed successfully", 
        "cv_id": new_version.id,
        "text_preview": text[:200] + "..." if len(text) > 200 else text
    }


@router.post("/analyze/{cv_id}", response_model=CVAnalysisResponse)
async def analyze_cv(cv_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    """Analyzes a specific CV version using the Critique Agent."""
    logger.info(f"Analyzing CV: {cv_id}")
    cv = await session.get(CVVersion, cv_id)
    if not cv:
        logger.warning(f"CV Version not found for analysis: {cv_id}")
        raise HTTPException(status_code=404, detail="CV Version not found")
        
    critique_result = await analyze_cv_with_gemini(cv.cv_text, session)
    
    return {
        "cv_id": cv_id,
        "ai_feedback": critique_result
    }