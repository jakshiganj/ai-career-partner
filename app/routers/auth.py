from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.models.user import User, UserCreate, UserRead
from app.core.security import get_password_hash

router = APIRouter()

@router.post("/signup", response_model=UserRead, status_code=201)
async def signup(user_create: UserCreate, session: AsyncSession = Depends(get_session)):
    # 1. Check if email already exists
    statement = select(User).where(User.email == user_create.email)
    result = await session.execute(statement)
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Hash the password and create User instance
    hashed_password = get_password_hash(user_create.password)
    # Exclude 'password' from the source data, add 'password_hash'
    user_data = user_create.dict(exclude={"password"})
    user = User(**user_data, password_hash=hashed_password)
    
    # 3. Save to Database
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    return user