import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.core.security import get_password_hash, verify_password, create_access_token
import jwt
from app.core.security import SECRET_KEY, ALGORITHM
from app.models.user import User
import uuid

def test_verify_password_hashing():
    """TC_AUTH_01: Verify password hashing and verification"""
    password = 'Password123!'
    hashed = get_password_hash(password)
    assert verify_password(password, hashed) is True
    assert verify_password('WrongPassword', hashed) is False

def test_jwt_generation_and_decoding():
    """TC_AUTH_02: Verify JWT generation and decoding"""
    data = {"sub": "test@example.com"}
    token = create_access_token(data)
    decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert decoded.get("sub") == "test@example.com"

@patch('app.routers.auth.AsyncSession')
def test_signup_valid_user(mock_session, client):
    """Test successful signup"""
    # Mock existing user check to return None
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    
    # Mock the get_session dependency
    session_instance = AsyncMock()
    session_instance.execute.return_value = mock_result
    
    from app.main import app
    from app.core.database import get_session
    
    async def override_get_session():
        yield session_instance
        
    app.dependency_overrides[get_session] = override_get_session
    
    response = client.post("/auth/signup", json={
        "email": "test@example.com",
        "full_name": "Test User",
        "password": "Password123!"
    })
    
    # Clean up override
    app.dependency_overrides.pop(get_session, None)
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data

@patch('app.routers.auth.AsyncSession')
def test_signup_existing_email(mock_session, client):
    """TC_AUTH_05: Test /auth/signup with existing email"""
    mock_result = MagicMock()
    # Mock existing user check to return a User
    mock_result.scalar_one_or_none.return_value = User(email="exist@example.com", password_hash="hash", full_name="Ex")
    
    session_instance = AsyncMock()
    session_instance.execute.return_value = mock_result
    
    from app.main import app
    from app.core.database import get_session
    
    async def override_get_session():
        yield session_instance
        
    app.dependency_overrides[get_session] = override_get_session
    
    response = client.post("/auth/signup", json={
        "email": "exist@example.com",
        "full_name": "Another User",
        "password": "Password123!"
    })
    
    app.dependency_overrides.pop(get_session, None)
    
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"

@patch('app.routers.auth.AsyncSession')
def test_login_valid_credentials(mock_session, client):
    """TC_AUTH_04: Test /auth/login with valid credentials"""
    mock_result = MagicMock()
    # Mock existing user check to return a User
    mock_result.scalar_one_or_none.return_value = User(
        id=uuid.uuid4(),
        email="login@example.com", 
        password_hash=get_password_hash("Password123!"), 
        full_name="Login User"
    )
    
    session_instance = AsyncMock()
    session_instance.execute.return_value = mock_result
    
    from app.main import app
    from app.core.database import get_session
    
    async def override_get_session():
        yield session_instance
        
    app.dependency_overrides[get_session] = override_get_session
    
    response = client.post("/auth/login", data={
        "username": "login@example.com",
        "password": "Password123!"
    })
    
    app.dependency_overrides.pop(get_session, None)
    
    assert response.status_code == 200
    assert "access_token" in response.json()
