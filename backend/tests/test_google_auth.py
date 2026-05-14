import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_session
import os

@pytest.fixture
def mock_google_creds():
    with patch.dict(os.environ, {
        "GOOGLE_OAUTH_CLIENT_ID": "test-client-id",
        "GOOGLE_OAUTH_CLIENT_SECRET": "test-client-secret",
        "GOOGLE_OAUTH_REDIRECT_URI": "http://localhost:8000/api/auth/google/callback",
        "FRONTEND_URL": "http://localhost:3000"
    }):
        yield

def test_google_login_redirect(client, mock_google_creds):
    """Test that /google/login redirects to Google Auth URL"""
    response = client.get("/api/auth/google/login", follow_redirects=False)
    assert response.status_code == 307
    assert "accounts.google.com" in response.headers["location"]
    assert "client_id=test-client-id" in response.headers["location"]

@pytest.mark.asyncio
async def test_google_callback_success(client, mock_google_creds):
    """Test successful Google OAuth callback and user upsert"""
    # 1. Mock the DB Session
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None # New user
    
    session_instance = AsyncMock()
    session_instance.execute.return_value = mock_result
    
    async def override_get_session():
        yield session_instance
    app.dependency_overrides[get_session] = override_get_session

    # 2. Mock the HTTP Session (aiohttp)
    mock_http_session = AsyncMock()
    
    # Mock token response
    mock_token_resp = MagicMock()
    mock_token_resp.status = 200
    mock_token_resp.json = AsyncMock(return_value={"access_token": "fake-google-token"})
    mock_http_session.post.return_value.__aenter__.return_value = mock_token_resp
    
    # Mock userinfo response
    mock_userinfo_resp = MagicMock()
    mock_userinfo_resp.status = 200
    mock_userinfo_resp.json = AsyncMock(return_value={
        "email": "google@example.com",
        "name": "Google User"
    })
    mock_http_session.get.return_value.__aenter__.return_value = mock_userinfo_resp

    with patch("app.routers.google_auth.get_http_session", return_value=mock_http_session):
        response = client.get(
            "/api/auth/google/callback",
            params={"code": "fake-code", "state": "career_partner_google"},
            follow_redirects=False
        )

    # 3. Assertions
    assert response.status_code == 307
    location = response.headers["location"]
    assert "http://localhost:3000/dashboard" in location
    assert "token=" in location
    assert "user_id=" in location
    
    # Verify DB calls
    assert session_instance.add.called
    assert session_instance.commit.called
    
    app.dependency_overrides.pop(get_session, None)

def test_google_callback_invalid_state(client, mock_google_creds):
    """Test callback with invalid state parameter"""
    response = client.get(
        "/api/auth/google/callback",
        params={"code": "fake-code", "state": "wrong_state"}
    )
    assert response.status_code == 400
    assert "Invalid state" in response.json()["detail"]
