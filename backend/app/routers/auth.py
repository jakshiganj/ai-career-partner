from fastapi import APIRouter, Depends, HTTPException, status
import os
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.database import get_session
from app.models.user import User, UserCreate, UserRead
from app.models.preference import UserPreference
from app.core.security import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta, datetime
import secrets

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
    user_data = user_create.model_dump(exclude={"password"})
    user = User(**user_data, password_hash=hashed_password)
    
    # 3. Save to Database
    session.add(user)
    await session.commit()
    await session.refresh(user)

    # 4. Auto-create default preferences
    default_pref = UserPreference(user_id=user.id)
    session.add(default_pref)
    await session.commit()
    
    return user

@router.post("/login")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: AsyncSession = Depends(get_session)):
    statement = select(User).where(User.email == form_data.username)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

from app.core.security import get_current_user

@router.get("/me", response_model=UserRead)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


# ─── Forgot / Reset Password ────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

RESET_TOKEN_EXPIRE_MINUTES = 15

@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, session: AsyncSession = Depends(get_session)):
    """Generate a password-reset token and email it to the user."""
    from app.services.email_service import send_password_reset_email

    statement = select(User).where(User.email == body.email)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    # Always return the same response to avoid email enumeration
    generic_msg = {"message": "If an account exists with that email, we've sent a password reset link."}

    if not user:
        return generic_msg

    # OAuth-only users cannot reset password
    if user.password_hash == "oauth_placeholder":
        return generic_msg

    # Generate secure token
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)

    session.add(user)
    await session.commit()

    # Send reset email
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_link = f"{frontend_url}/reset-password?token={token}"
    await send_password_reset_email(to_email=user.email, reset_link=reset_link)

    return generic_msg


@router.get("/verify-reset-token")
async def verify_reset_token(token: str, session: AsyncSession = Depends(get_session)):
    """Check if a password reset token is still valid."""
    statement = select(User).where(User.reset_token == token)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    if not user or not user.reset_token_expires:
        return {"valid": False}

    if datetime.utcnow() > user.reset_token_expires:
        return {"valid": False}

    return {"valid": True}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, session: AsyncSession = Depends(get_session)):
    """Reset the user's password using a valid reset token."""
    statement = select(User).where(User.reset_token == body.token)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    if not user or not user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if datetime.utcnow() > user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Reset token has expired")

    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Update password and clear the reset token
    user.password_hash = get_password_hash(body.new_password)
    user.reset_token = None
    user.reset_token_expires = None

    session.add(user)
    await session.commit()

    return {"message": "Password reset successfully. You can now log in with your new password."}