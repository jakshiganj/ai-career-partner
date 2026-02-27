from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import os
import urllib.parse
import aiohttp
from app.core.database import get_session
from app.models.user import User
from app.core.security import create_access_token

router = APIRouter()

@router.get("/linkedin/login")
async def linkedin_login():
    """Redirects the user to the LinkedIn OAuth consent screen (OpenID Connect)."""
    LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID")
    REDIRECT_URI = "http://localhost:8000/auth/linkedin/callback"
    if not LINKEDIN_CLIENT_ID:
        raise HTTPException(status_code=500, detail="LinkedIn Client ID not configured")
        
    auth_url = "https://www.linkedin.com/oauth/v2/authorization"
    params = {
        "response_type": "code",
        "client_id": LINKEDIN_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "state": "career_partner_import", # Add CSRF protection in prod
        "scope": "openid profile email"
    }
    url = f"{auth_url}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)

@router.get("/linkedin/callback")
async def linkedin_callback(code: str, state: str, session: AsyncSession = Depends(get_session)):
    """Handles the OAuth callback, fetches user info via OpenID, and upserts user."""
    REDIRECT_URI = "http://localhost:8000/auth/linkedin/callback"
    LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID")
    LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET")

    if state != "career_partner_import":
        raise HTTPException(status_code=400, detail="Invalid state parameter")
        
    token_url = "https://www.linkedin.com/oauth/v2/accessToken"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "client_id": LINKEDIN_CLIENT_ID,
        "client_secret": LINKEDIN_CLIENT_SECRET
    }
    
    async with aiohttp.ClientSession() as http_session:
        # 1. Exchange auth code for access token
        async with http_session.post(token_url, data=data) as resp:
            if resp.status != 200:
                text = await resp.text()
                print("Token error:", text)
                raise HTTPException(status_code=400, detail="Failed to retrieve access token")
            token_data = await resp.json()
            access_token = token_data.get("access_token")
            
        # 2. Fetch User Info using OpenID Connect endpoint
        userinfo_url = "https://api.linkedin.com/v2/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        async with http_session.get(userinfo_url, headers=headers) as resp:
            if resp.status != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch user info")
            user_info = await resp.json()
            
            email = user_info.get("email")
            name = user_info.get("name", "LinkedIn User")
            
            if not email:
                raise HTTPException(status_code=400, detail="Email not provided by LinkedIn")
                
        # 3. Upsert into database
        stmt = select(User).where(User.email == email)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        is_new = False
        if not user:
            is_new = True
            user = User(
                email=email,
                full_name=name,
                password_hash="oauth_placeholder"
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            
        # 4. Create JWT Session Token
        jwt_token = create_access_token(data={"sub": user.email})
        
        # 5. Redirect back to frontend with the token
        redirect_url = f"http://localhost:5173/dashboard?token={jwt_token}&user_id={user.id}"
        return RedirectResponse(redirect_url)
