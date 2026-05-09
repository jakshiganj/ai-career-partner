from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.core.security import get_current_user
from app.core.logging import get_logger
from app.models.user import User
from app.models.preference import UserPreference
from pydantic import BaseModel
from typing import Optional, Any

router = APIRouter()
logger = get_logger(__name__)

class PreferenceUpdate(BaseModel):
    email_digest_enabled: Optional[bool] = None
    preferred_tone: Optional[str] = None
    target_role: Optional[str] = None
    expected_salary: Optional[int] = None

class PreferenceRead(BaseModel):
    user_id: Optional[Any] = None
    email_digest_enabled: bool
    preferred_tone: str
    target_role: str
    expected_salary: int

    class Config:
        from_attributes = True

@router.get("/", response_model=PreferenceRead)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Retrieves user preferences, falling back to defaults if not found."""
    logger.info(f"Fetching preferences for user: {current_user.email}")
    pref = await session.get(UserPreference, current_user.id)
    if not pref:
        logger.info(f"No preferences found for user {current_user.id}, returning defaults")
        return {
            "email_digest_enabled": False,
            "preferred_tone": "professional",
            "target_role": "Software Engineer",
            "expected_salary": 0
        }
    return pref

@router.put("/", response_model=PreferenceRead)
async def update_preferences(
    data: PreferenceUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)  
):
    """Updates or creates user preferences."""
    logger.info(f"Updating preferences for user: {current_user.email}")
    pref = await session.get(UserPreference, current_user.id)
    update_data = data.model_dump(exclude_unset=True)
    
    if not pref:
        logger.info(f"Creating new preferences for user {current_user.id}")
        pref = UserPreference(user_id=current_user.id, **update_data)
        session.add(pref)
    else:
        for k, v in update_data.items():
            setattr(pref, k, v)
        session.add(pref)
        
    await session.commit()
    await session.refresh(pref)
    return pref
