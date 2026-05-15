import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.main import app
from app.core.database import get_session

@pytest.fixture
def mock_google_settings():
    # Patch the settings object used in the router
    with patch("app.routers.google_auth.settings") as mock_s:
        mock_s.GOOGLE_OAUTH_CLIENT_ID = "test-client-id"
        mock_s.GOOGLE_OAUTH_CLIENT_SECRET = "test-client-secret"
        mock_s.GOOGLE_OAUTH_REDIRECT_URI = "http://localhost:8000/api/auth/google/callback"
        mock_s.FRONTEND_URL = "http://localhost:3000"
        mock_s.GOOGLE_STATE = "career_partner_google"
        yield mock_s

def test_google_login_redirect(client, mock_google_settings):
    """Test that /google/login redirects to Google Auth URL"""
    response = client.get("/api/auth/google/login", follow_redirects=False)
    assert response.status_code == 307
    location = response.headers.get("location", "")
    assert "accounts.google.com" in location
    assert "client_id=test-client-id" in location

def test_google_callback_success(client, mock_google_settings):
    """Test successful Google OAuth callback and user upsert"""
    # 1. Mock the DB Session
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None # New user
    
    session_instance = AsyncMock()
    session_instance.execute.return_value = mock_result
    
    async def override_get_session():
        yield session_instance
    app.dependency_overrides[get_session] = override_get_session

    # 2. Mock the HTTP Session (aiohttp-like)
    # Use MagicMock for post/get because they return context managers, not coroutines
    mock_http_session = MagicMock()
    
    # Mock token response
    mock_token_resp = MagicMock()
    mock_token_resp.status = 200
    mock_token_resp.json = AsyncMock(return_value={"access_token": "fake-google-token"})
    
    # Mock context manager for post
    mock_post_cm = MagicMock()
    mock_post_cm.__aenter__.return_value = mock_token_resp
    mock_http_session.post.return_value = mock_post_cm
    
    # Mock userinfo response
    mock_userinfo_resp = MagicMock()
    mock_userinfo_resp.status = 200
    mock_userinfo_resp.json = AsyncMock(return_value={
        "email": "google@example.com",
        "name": "Google User"
    })
    
    # Mock context manager for get
    mock_get_cm = MagicMock()
    mock_get_cm.__aenter__.return_value = mock_userinfo_resp
    mock_http_session.get.return_value = mock_get_cm

    with patch("app.routers.google_auth.get_http_session", AsyncMock(return_value=mock_http_session)):
        response = client.get(
            "/api/auth/google/callback",
            params={"code": "fake-code", "state": "career_partner_google"},
            follow_redirects=False
        )

    # 3. Assertions
    assert response.status_code == 307
    location = response.headers.get("location", "")
    assert "http://localhost:3000/dashboard" in location
    
    app.dependency_overrides.pop(get_session, None)

def test_google_callback_invalid_state(client, mock_google_settings):
    """Test callback with invalid state parameter"""
    response = client.get(
        "/api/auth/google/callback",
        params={"code": "fake-code", "state": "wrong_state"}
    )
    assert response.status_code == 400
    assert "Invalid state" in response.json()["detail"]
