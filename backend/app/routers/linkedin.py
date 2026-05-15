import os
import urllib.parse
import aiohttp
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.models.user import User
from app.core.security import create_access_token
from app.core.logging import get_logger
from app.core.config import settings

router = APIRouter()
logger = get_logger(__name__)

# OAuth Config derived from settings
LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"

@router.get("/linkedin/login")
async def linkedin_login():
    """Redirects the user to the LinkedIn OAuth consent screen (OpenID Connect)."""
    client_id = settings.LINKEDIN_CLIENT_ID
    
    if not client_id:
        logger.error("LINKEDIN_CLIENT_ID not configured")
        raise HTTPException(status_code=500, detail="LinkedIn Client ID not configured")
        
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
        "state": settings.LINKEDIN_STATE,
        "scope": "openid profile email"
    }
    url = f"{LINKEDIN_AUTH_URL}?{urllib.parse.urlencode(params)}"
    logger.info(f"Initiating LinkedIn OAuth login flow with redirect: {settings.LINKEDIN_REDIRECT_URI}")
    return RedirectResponse(url)

@router.get("/linkedin/callback")
async def linkedin_callback(code: str, state: str, session: AsyncSession = Depends(get_session)):
    """Handles the OAuth callback, fetches user info via OpenID, and upserts user."""
    if state != settings.LINKEDIN_STATE:
        logger.warning(f"Invalid state parameter received: {state}")
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    client_id = settings.LINKEDIN_CLIENT_ID
    client_secret = settings.LINKEDIN_CLIENT_SECRET
        
    token_url = "https://www.linkedin.com/oauth/v2/accessToken"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
        "client_id": client_id,
        "client_secret": client_secret
    }
    
    async with aiohttp.ClientSession() as http_session:
        # 1. Exchange auth code for access token
        async with http_session.post(token_url, data=data) as resp:
            if resp.status != 200:
                text = await resp.text()
                logger.error(f"LinkedIn Token exchange error: {text}")
                raise HTTPException(status_code=400, detail="Failed to retrieve access token from LinkedIn")
            token_data = await resp.json()
            access_token = token_data.get("access_token")
            
        # 2. Fetch User Info using OpenID Connect endpoint
        headers = {"Authorization": f"Bearer {access_token}"}
        async with http_session.get(LINKEDIN_USERINFO_URL, headers=headers) as resp:
            if resp.status != 200:
                logger.error(f"LinkedIn userinfo fetch failed with status {resp.status}")
                raise HTTPException(status_code=400, detail="Failed to fetch user info from LinkedIn")
            user_info = await resp.json()
            
            email = user_info.get("email")
            name = user_info.get("name", "LinkedIn User")
            
            if not email:
                logger.error("LinkedIn userinfo response missing email")
                raise HTTPException(status_code=400, detail="Email not provided by LinkedIn")
                
        # 3. Upsert into database
        stmt = select(User).where(User.email == email)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            logger.info(f"Creating new user from LinkedIn: {email}")
            user = User(
                email=email,
                full_name=name,
                password_hash="oauth_placeholder",
                auth_provider="linkedin"
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        else:
            logger.info(f"Existing LinkedIn user logged in: {email}")
            
        # 4. Create JWT Session Token
        jwt_token = create_access_token(data={"sub": user.email})
        
        # 5. Redirect back to frontend with the token
        redirect_url = f"{settings.FRONTEND_URL}/dashboard?token={jwt_token}&user_id={user.id}"
        return RedirectResponse(redirect_url)
