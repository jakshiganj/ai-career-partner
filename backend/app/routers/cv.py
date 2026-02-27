from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.models.resume import Resume
from app.utils.parsing import extract_text_from_pdf
from app.agents.cv_critique.agent import analyze_cv_with_gemini 
from app.core.security import get_current_user
from app.models.user import User
from app.models.cv_history import CVVersion
from app.models.profile import CandidateProfile
from app.agents.cv_parser_agent import CVParserAgent
from sqlmodel import select

router = APIRouter()

from pydantic import BaseModel

class CVUploadRequest(BaseModel):
    text: str

@router.post("/upload", status_code=201)
async def upload_cv(
    req: CVUploadRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    text = req.text
    
    # 3. Use the pre-redacted text from the frontend
    # Text is already supplied in `req.text`
    
    # 4. Save to Database
    # Fetch existing to calculate version
    result = await session.execute(
        select(CVVersion).where(CVVersion.user_id == current_user.id)
    )
    existing_versions = result.scalars().all()
    next_version = len(existing_versions) + 1
    
    new_cv = Resume(user_id=current_user.id, content_text=text)
    session.add(new_cv)
    await session.commit()
    await session.refresh(new_cv)
    
    new_version = CVVersion(
        user_id=current_user.id,
        version_number=next_version,
        cv_text=text
    )
    session.add(new_version)
    await session.commit()
    
    # 5. Extract Structured Data via Agent
    parser = CVParserAgent()
    parsed_data = await parser.run(text)
    
    # 6. Upsert into CandidateProfile
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
    
    return {
        "message": "CV uploaded and parsed successfully", 
        "cv_id": new_cv.id,
        "version": next_version,
        "profile": parsed_data
    }

import uuid

@router.post("/analyze/{cv_id}")
async def analyze_cv(cv_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    # 1. Find the CV in the database
    cv = await session.get(Resume, cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
        
    # 2. Send the text to the AI Agent
    critique_result = await analyze_cv_with_gemini(cv.content_text, session)
    
    # 3. (Optional) Save the result to the DB? 
    # For now, just return it to the user
    return {
        "cv_id": cv_id,
        "ai_feedback": critique_result
    }