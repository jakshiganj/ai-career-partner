from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.cv_history import CVVersion
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{user_id}")
async def get_cv_versions(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access these CV versions")
        
    result = await session.execute(
        select(CVVersion).where(CVVersion.user_id == user_id).order_by(CVVersion.version_number.desc())
    )
    versions = result.scalars().all()
    
    return [
        {
            "id": str(v.id),
            "version_number": v.version_number,
            "cv_text": v.cv_text,
            "ats_score": v.ats_score,
            "match_score": v.match_score,
            "job_target": v.job_target,
            "created_at": v.created_at.isoformat() if v.created_at else None
        }
        for v in versions
    ]

@router.post("/restore/{version_id}")
async def restore_cv_version(
    version_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    version = await session.get(CVVersion, version_id)
    
    if not version:
        raise HTTPException(status_code=404, detail="CV Version not found")
        
    if version.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this CV version")

    # The actual restoration logic would likely trigger a new pipeline run starting from the OPTIMISE stage
    # using the specified version's cv_text. The implementation_plan specified enabling this via an endpoint.
    # For now, we will return the text and status so the frontend can initiate the next step.
    
    return {
        "status": "success",
        "message": "CV Version ready to be restored",
        "restored_version_id": str(version.id),
        "cv_text": version.cv_text,
        "version_number": version.version_number
    }
