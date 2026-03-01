from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.preference import UserPreference
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter()

class PreferenceUpdate(BaseModel):
    email_digest_enabled: Optional[bool] = None
    preferred_tone: Optional[str] = None
    target_role: Optional[str] = None
    expected_salary: Optional[int] = None

@router.get("/")
async def get_preferences(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    pref = await session.get(UserPreference, current_user.id)
    if not pref:
        # Return defaults if not set yet
        return {
            "email_digest_enabled": False,
            "preferred_tone": "professional",
            "target_role": "Software Engineer",
            "expected_salary": 0
        }
    return pref

@router.put("/")
async def update_preferences(
    data: PreferenceUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)  
):
    pref = await session.get(UserPreference, current_user.id)
    # Only update fields that were actually sent
    update_data = data.model_dump(exclude_unset=True)
    if not pref:
        pref = UserPreference(user_id=current_user.id, **update_data)
        session.add(pref)
    else:
        for k, v in update_data.items():
            setattr(pref, k, v)
        session.add(pref)
        
    await session.commit()
    await session.refresh(pref)
    return pref
