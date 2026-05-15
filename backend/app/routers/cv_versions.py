from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.core.database import get_session
from app.core.security import get_current_user
from app.core.logging import get_logger
from app.models.user import User
from app.models.cv_history import CVVersion
from app.schemas.response import MessageResponse
import uuid
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()
logger = get_logger(__name__)

class CVVersionRead(BaseModel):
    id: uuid.UUID
    version_number: int
    cv_text: str
    ats_score: Optional[float] = None
    match_score: Optional[float] = None
    job_target: Optional[str] = None
    created_at: Optional[datetime] = None

class CVVersionRestoreResponse(BaseModel):
    status: str
    message: str
    restored_version_id: uuid.UUID
    cv_text: str
    version_number: int

@router.get("/{user_id}", response_model=List[CVVersionRead])
async def get_cv_versions(
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Lists all stored CV versions for a user."""
    logger.info(f"Fetching CV versions for user: {user_id}")
    if user_id != current_user.id:
        logger.warning(f"Unauthorized access attempt for user versions: {user_id} by {current_user.id}")
        raise HTTPException(status_code=403, detail="Not authorized to access these CV versions")
        
    result = await session.execute(
        select(CVVersion).where(CVVersion.user_id == user_id).order_by(CVVersion.version_number.desc())
    )
    versions = result.scalars().all()
    return versions

@router.post("/restore/{version_id}", response_model=CVVersionRestoreResponse)
async def restore_cv_version(
    version_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Retrieves a specific CV version for restoration."""
    logger.info(f"Restoring CV version: {version_id}")
    version = await session.get(CVVersion, version_id)
    
    if not version:
        logger.warning(f"CV version {version_id} not found")
        raise HTTPException(status_code=404, detail="CV Version not found")
        
    if version.user_id != current_user.id:
        logger.warning(f"Unauthorized restoration attempt for version {version_id}")
        raise HTTPException(status_code=403, detail="Not authorized to access this CV version")

    return {
        "status": "success",
        "message": "CV Version ready to be restored",
        "restored_version_id": version.id,
        "cv_text": version.cv_text,
        "version_number": version.version_number
    }
