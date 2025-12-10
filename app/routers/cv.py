from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlmodel import Session
from app.core.database import get_session
from app.models.resume import Resume
from app.utils.parsing import extract_text_from_pdf
from app.agents.cv_critique.agent import analyze_cv_with_gemini 

router = APIRouter()

@router.post("/upload", status_code=201)
async def upload_cv(
    user_id: int,  # In real app, we get this from the token (Auth)
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    # 1. Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # 2. Read file content
    file_content = await file.read()
    
    # 3. Use our helper to get the text
    text = extract_text_from_pdf(file_content)
    
    # 4. Save to Database
    new_cv = Resume(user_id=user_id, content_text=text)
    session.add(new_cv)
    await session.commit()
    await session.refresh(new_cv)
    
    return {"message": "CV uploaded successfully", "cv_id": new_cv.id, "text_preview": text[:100]}

@router.post("/analyze/{cv_id}")
async def analyze_cv(cv_id: int, session: Session = Depends(get_session)):
    # 1. Find the CV in the database
    cv = await session.get(Resume, cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
        
    # 2. Send the text to the AI Agent
    critique_result = analyze_cv_with_gemini(cv.content_text)
    
    # 3. (Optional) Save the result to the DB? 
    # For now, just return it to the user
    return {
        "cv_id": cv_id,
        "ai_feedback": critique_result
    }