import sys
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from app.core.http_client import HttpClient

# Import all routers
from app.routers import (
    auth, cv, matcher, interview, agents,
    pipeline, cv_versions, linkedin, google_auth,
    scrape, preferences, dashboard, roadmap, payment,
)

# Import models so SQLModel creates the tables
from app.models import (  # noqa: F401
    user, resume, job, profile, task_state,
    pipeline as pipeline_model, cv_history,
    job_market, interview_roadmap, preference, esco,
)

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Close HTTP session on shutdown
    await HttpClient.close_session()


app = FastAPI(title="AI Career Partner", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Router Registration ──────────────────────────────────────────────
_ROUTERS = [
    (auth.router,        "/auth",            "Authentication"),
    (cv.router,          "/cv",              "CV Operations"),
    (matcher.router,     "/jobs",            "Job Matcher"),
    (interview.router,   "/api/interview",   "Interview Coach"),
    (agents.router,      "/agents",          "Agent API"),
    (pipeline.router,    "/api/pipeline",    "Orchestrator Pipeline"),
    (cv_versions.router, "/api/cv-versions", "CV Versions"),
    (linkedin.router,    "/auth",            "LinkedIn OAuth"),
    (google_auth.router, "/auth",            "Google OAuth"),
    (scrape.router,      "/api/linkedin",    "LinkedIn Scrape"),
    (preferences.router, "/api/preferences", "User Settings"),
    (dashboard.router,   "/api/dashboard",   "Dashboard"),
    (roadmap.router,     "/api/roadmap",     "Skill Roadmap"),
    (payment.router,     "/api/payment",     "Payment & Subscriptions"),
]

for router, prefix, tag in _ROUTERS:
    app.include_router(router, prefix=prefix, tags=[tag])

# ── Static Files & Root ──────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    return {"message": "System Online. Go to /static/demo.html for the Agent Demo."}