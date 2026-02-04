from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

from app.routers import auth  
from app.routers import cv
from app.routers import matcher

app = FastAPI(title="AI Career Partner")

# Include the Auth Router
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(cv.router, prefix="/cv", tags=["CV Operations"])
app.include_router(matcher.router, prefix="/jobs", tags=["Job Matcher"])

@app.get("/")
async def root():
    return {"message": "System Online"}