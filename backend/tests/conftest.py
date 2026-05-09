import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.main import app
from app.core.database import get_session

@pytest.fixture
def mock_session():
    session = AsyncMock()
    return session

async def override_get_session():
    # Because depends resolves to a generator if we use yield
    session = AsyncMock()
    yield session

app.dependency_overrides[get_session] = override_get_session

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
