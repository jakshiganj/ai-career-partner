"""
Agent IAM Middleware — Zero Trust M2M JWT verification.

Usage:
    @router.post("/endpoint")
    async def secured_endpoint(agent: dict = Depends(verify_agent_token)):
        ...
"""
import os
from datetime import datetime, timedelta
from fastapi import Header, HTTPException, status
from jose import jwt, JWTError

# M2M secret — set AGENT_IAM_SECRET in .env for production
AGENT_IAM_SECRET = os.getenv("AGENT_IAM_SECRET", "CHANGE_THIS_M2M_SECRET")
ALGORITHM = "HS256"

# Allowlist of valid internal agent IDs
ALLOWED_AGENTS = {
    "supervisor",
    "cv_critic",
    "market_analyst",
    "graph_rag",
    "interview_coach",
}


def create_agent_token(agent_id: str, expires_minutes: int = 5) -> str:
    """Generate a short-lived M2M JWT for an agent to call another agent."""
    if agent_id not in ALLOWED_AGENTS:
        raise ValueError(f"Unknown agent_id: {agent_id}")
    payload = {
        "sub": agent_id,
        "agent_id": agent_id,
        "exp": datetime.utcnow() + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, AGENT_IAM_SECRET, algorithm=ALGORITHM)


async def verify_agent_token(x_agent_token: str = Header(...)):
    """
    FastAPI dependency that validates the X-Agent-Token header.
    Raises HTTP 403 if the token is invalid, expired, or from an unknown agent.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid or expired agent token",
    )
    try:
        payload = jwt.decode(x_agent_token, AGENT_IAM_SECRET, algorithms=[ALGORITHM])
        agent_id: str = payload.get("agent_id")
        if agent_id is None or agent_id not in ALLOWED_AGENTS:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    return {"agent_id": agent_id}
