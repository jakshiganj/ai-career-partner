from fastapi import FastAPI
import asyncio

app = FastAPI(title="AI Career Partner")

@app.get("/")
async def root():
    return {"message": "System Online", "status": "active"}

@app.get("/test-db")
async def test_db():
    # We will replace this with real DB code later
    return {"database": "Connected (Simulation)"}