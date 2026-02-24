from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.routers import auth  
from app.routers import cv
from app.routers import matcher
from app.routers import interview

# Import models so SQLModel creates the tables
from app.models import user, resume, job, profile  # noqa: F401
from app.models import task_state  # noqa: F401

app = FastAPI(title="AI Career Partner")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the Auth Router
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(cv.router, prefix="/cv", tags=["CV Operations"])
app.include_router(matcher.router, prefix="/jobs", tags=["Job Matcher"])
app.include_router(interview.router, tags=["Interview Coach"])

from app.routers import agents
app.include_router(agents.router, prefix="/agents", tags=["Agent API"])

from app.routers import pipeline
app.include_router(pipeline.router, prefix="/pipeline", tags=["Orchestrator Pipeline"])

from fastapi.staticfiles import StaticFiles

app.mount("/static", StaticFiles(directory="static"), name="static")

# Root endpoint (Trigger Reload)
@app.get("/")
async def root():
    return {"message": "System Online. Go to /static/demo.html for the Agent Demo."}