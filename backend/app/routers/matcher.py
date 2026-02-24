from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.resume import Resume
from app.models.job import Job
from app.utils.embedding import get_embedding
import numpy as np

router = APIRouter()

def cosine_similarity(v1, v2):
    """Calculates how similar two vectors are (0 to 1)."""
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

@router.post("/match")
async def match_job_to_cv(
    cv_id: int, 
    job_text: str,
    session: Session = Depends(get_session)
):
    # 1. Get the CV
    cv = await session.get(Resume, cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
        
    # 2. Generate Embeddings (if not already done)
    if cv.embedding is None: 
        cv.embedding = get_embedding(cv.content_text)
        session.add(cv)
        await session.commit()
    
    # 3. Generate Job Embedding
    job_embedding = get_embedding(job_text)
    
    # 4. Calculate Similarity
    score = cosine_similarity(cv.embedding, job_embedding)
    
    # 5. Convert to percentage
    match_percentage = round(score * 100, 2)
    
    return {
        "cv_id": cv_id,
        "match_score": f"{match_percentage}%",
        "status": "High Match" if match_percentage > 70 else "Low Match"
    }