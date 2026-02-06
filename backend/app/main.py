from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

from app.routers import auth  
from app.routers import cv
from app.routers import matcher
from app.routers import interview

app = FastAPI(title="AI Career Partner")

# Include the Auth Router
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(cv.router, prefix="/cv", tags=["CV Operations"])
app.include_router(matcher.router, prefix="/jobs", tags=["Job Matcher"])
app.include_router(interview.router, tags=["Interview Coach"])

from app.routers import agents
app.include_router(agents.router, prefix="/agents", tags=["Agent API"])

from fastapi.staticfiles import StaticFiles

app.mount("/static", StaticFiles(directory="static"), name="static")

# Root endpoint (Trigger Reload)
@app.get("/")
async def root():
    return {"message": "System Online. Go to /static/demo.html for the Agent Demo."}