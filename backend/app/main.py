from dotenv import load_dotenv
load_dotenv()

import os
import sys
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.http_client import HttpClient
from app.core.logging import setup_logging, get_logger

# Initialize logging
setup_logging()
logger = get_logger("app.main")

# Import all routers
from app.routers import (
    auth, cv, interview,
    pipeline, cv_versions, linkedin, google_auth,
    preferences, dashboard, roadmap, payment,
)

# Import models so SQLModel creates the tables
from app.models import (  # noqa: F401
    user, profile, task_state,
    pipeline as pipeline_model, cv_history,
    job_market, interview_roadmap, preference, esco,
)

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Close HTTP session on shutdown
    await HttpClient.close_session()


app = FastAPI(title="AI Career Partner", lifespan=lifespan)

from app.core.config import settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fix for HTTPS protocol behind Cloud Run proxy
@app.middleware("http")
async def fix_protocol(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    if request.headers.get("x-forwarded-proto") == "https":
        request.scope["scheme"] = "https"
    return await call_next(request)

# ── Error Handling ───────────────────────────────────────────────────
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all for any unhandled exceptions."""
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error. Please check backend logs.",
            "type": type(exc).__name__
        }
    )

# ── Router Registration ──────────────────────────────────────────────
_ROUTERS = [
    (auth.router,        "/api/auth",        "Authentication"),
    (cv.router,          "/api/cv",          "CV Operations"),
    (interview.router,   "/api/interview",   "Interview Coach"),
    (pipeline.router,    "/api/pipeline",    "Orchestrator Pipeline"),
    (cv_versions.router, "/api/cv-versions", "CV Versions"),
    (linkedin.router,    "/api/auth",        "LinkedIn OAuth"),
    (google_auth.router, "/api/auth",        "Google OAuth"),
    (preferences.router, "/api/preferences", "User Settings"),
    (dashboard.router,   "/api/dashboard",   "Dashboard"),
    (roadmap.router,     "/api/roadmap",     "Skill Roadmap"),
    (payment.router,     "/api/payment",     "Payment & Subscriptions"),
]

for router, prefix, tag in _ROUTERS:
    app.include_router(router, prefix=prefix, tags=[tag])

# ── Static Files & Root ──────────────────────────────────────────────
static_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if not os.path.exists(static_path):
    os.makedirs(static_path)
app.mount("/static", StaticFiles(directory=static_path), name="static")


@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "AI Career Partner API is running.",
        "documentation": "/docs"
    }


@app.get("/health")
async def health_check():
    """Simple health check for Docker/Kubernetes."""
    return {"status": "healthy"}