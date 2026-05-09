from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import os
import urllib.parse
from app.core.database import get_session
from app.models.user import User
from app.models.preference import UserPreference
from app.core.security import create_access_token
from app.core.http_client import get_http_session

router = APIRouter()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# Environment-based redirect URIs
REDIRECT_URI = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


@router.get("/google/login")
async def google_login():
    """Redirects the user to the Google OAuth consent screen."""
    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=500, detail="Google OAuth Client ID not configured")

    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "scope": "openid email profile",
        "access_type": "offline",
        "state": "career_partner_google",
        "prompt": "consent",
    }
    url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    session: AsyncSession = Depends(get_session),
):
    """Handles the Google OAuth callback, fetches user info, and upserts user."""
    if state != "career_partner_google":
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Google OAuth credentials not configured")

    http_session = await get_http_session()
    
    # 1. Exchange authorization code for access token
    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "client_id": client_id,
        "client_secret": client_secret,
    }
    async with http_session.post(GOOGLE_TOKEN_URL, data=token_data) as resp:
        if resp.status != 200:
            text = await resp.text()
            print(f"[GOOGLE_AUTH] Token exchange error: {text}")
            raise HTTPException(status_code=400, detail="Failed to retrieve access token from Google")
        token_response = await resp.json()
        access_token = token_response.get("access_token")

    # 2. Fetch user info from Google
    headers = {"Authorization": f"Bearer {access_token}"}
    async with http_session.get(GOOGLE_USERINFO_URL, headers=headers) as resp:
        if resp.status != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch user info from Google")
        user_info = await resp.json()

        email = user_info.get("email")
        name = user_info.get("name", "Google User")

        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")

    # 3. Upsert user into database
    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
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

    # 4. Create JWT session token
    jwt_token = create_access_token(data={"sub": user.email})

    # 5. Redirect back to frontend with the token
    redirect_url = f"{FRONTEND_URL}/dashboard?token={jwt_token}&user_id={user.id}"
    return RedirectResponse(redirect_url)
