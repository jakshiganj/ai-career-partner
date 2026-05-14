import os
import urllib.parse
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.models.user import User
from app.models.preference import UserPreference
from app.core.security import create_access_token
from app.core.http_client import get_http_session
from app.core.logging import get_logger
from app.core.config import settings

router = APIRouter()
logger = get_logger(__name__)

# OAuth Config derived from settings
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

@router.get("/google/login")
async def google_login():
    """Redirects the user to the Google OAuth consent screen."""
    client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    if not client_id:
        logger.error("GOOGLE_OAUTH_CLIENT_ID not configured")
        raise HTTPException(status_code=500, detail="Google OAuth Client ID not configured")

    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
        "scope": "openid email profile",
        "access_type": "offline",
        "state": settings.GOOGLE_STATE,
        "prompt": "consent",
    }
    url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    logger.info(f"Initiating Google OAuth login flow with redirect: {settings.GOOGLE_OAUTH_REDIRECT_URI}")
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    session: AsyncSession = Depends(get_session),
):
    """Handles the Google OAuth callback, fetches user info, and upserts user."""
    if state != settings.GOOGLE_STATE:
        logger.warning(f"Invalid Google OAuth state received: {state}")
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    client_id = settings.GOOGLE_OAUTH_CLIENT_ID
    client_secret = settings.GOOGLE_OAUTH_CLIENT_SECRET

    if not client_id or not client_secret:
        logger.error("Google OAuth credentials not configured")
        raise HTTPException(status_code=500, detail="Google OAuth credentials not configured")

    http_session = await get_http_session()
    
    # 1. Exchange authorization code for access token
    logger.info("Exchanging Google auth code for token")
    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
        "client_id": client_id,
        "client_secret": client_secret,
    }
    async with http_session.post(GOOGLE_TOKEN_URL, data=token_data) as resp:
        if resp.status != 200:
            text = await resp.text()
            logger.error(f"Google Token exchange error: {text}")
            raise HTTPException(status_code=400, detail="Failed to retrieve access token from Google")
        token_response = await resp.json()
        access_token = token_response.get("access_token")

    # 2. Fetch user info from Google
    headers = {"Authorization": f"Bearer {access_token}"}
    async with http_session.get(GOOGLE_USERINFO_URL, headers=headers) as resp:
        if resp.status != 200:
            logger.error(f"Google userinfo fetch failed with status {resp.status}")
            raise HTTPException(status_code=400, detail="Failed to fetch user info from Google")
        user_info = await resp.json()

        email = user_info.get("email")
        name = user_info.get("name", "Google User")

        if not email:
            logger.error("Google userinfo response missing email")
            raise HTTPException(status_code=400, detail="Email not provided by Google")

    # 3. Upsert user into database
    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        logger.info(f"Creating new user from Google: {email}")
        user = User(
            email=email,
            full_name=name,
            password_hash="oauth_placeholder",
            auth_provider="google",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        # Auto-create default preferences for new users
        default_pref = UserPreference(user_id=user.id)
        session.add(default_pref)
        await session.commit()
    else:
        logger.info(f"Existing Google user logged in: {email}")

    # 4. Create JWT session token
    jwt_token = create_access_token(data={"sub": user.email})

    # 5. Redirect back to frontend with the token
    redirect_url = f"{settings.FRONTEND_URL}/dashboard?token={jwt_token}&user_id={user.id}"
    return RedirectResponse(redirect_url)
