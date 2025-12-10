from fastapi import FastAPI
from app.routers import auth  # <--- Import the router

app = FastAPI(title="AI Career Partner")

# Include the Auth Router
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])

@app.get("/")
async def root():
    return {"message": "System Online"}