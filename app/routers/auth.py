from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.models.user import User
from app.core.security import get_password_hash

router = APIRouter()

@router.post("/signup", status_code=201)
async def signup(user_data: User, session: AsyncSession = Depends(get_session)):
    # 1. Check if email already exists
    statement = select(User).where(User.email == user_data.email)
    result = await session.execute(statement)
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Hash the password
    user_data.password_hash = get_password_hash(user_data.password_hash)
    
    # 3. Save to Database
    session.add(user_data)
    await session.commit()
    await session.refresh(user_data)
    
    return {"message": "User created successfully", "user_id": user_data.id}