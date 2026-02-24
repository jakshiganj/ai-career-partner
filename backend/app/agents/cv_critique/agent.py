import json
from sqlalchemy.ext.asyncio import AsyncSession
from app.agents.gemini_client import gemini_client
from app.retrieval.graph_rag import fetch_skill_context

async def analyze_cv_with_gemini(cv_text: str, session: AsyncSession) -> dict:
    """
    1. Quick keyword extraction
    2. Fetch GraphRAG context for those keywords
    3. Final gap analysis against general SWE roles
    """
    
    # 1. Quick LLM call to extract top 3-5 keywords
    extract_prompt = f"Extract the top 5 most important technical skills from this CV as a simple comma-separated list without extras:\n{cv_text[:2000]}"
    try:
        keywords_str = gemini_client.generate_content('gemini-2.5-flash', extract_prompt)
    except Exception:
        keywords_str = "Python, React, SQL"
        
    # 2. Fetch Graph Context from ESCO
    context = await fetch_skill_context(keywords_str, session, limit=5)
    
    # 3. Final Gap Analysis Prompt
    system_instruction = f"""
    You are an expert Technical Recruiter and Career Coach for Software Engineering roles. 
    Analyze the following resume text. 
    
    We also have the following ESCO Knowledge Graph context for the user's base skills:
    {context}
    
    Using this graph context:
    1. Identify `matching_skills` that the user has which align with modern SWE demands.
    2. Identify `missing_critical_skills` they should learn based on the 'broader' or 'transversal' skills in the graph context.
    3. Identify `transferable_skills` from their background.

    Return the response ONLY as valid JSON in this format:
    {{
        "score": 85,
        "summary": "Strong core backend skills but missing cloud deployment tools.",
        "matching_skills": ["Python", "FastAPI"],
        "missing_critical_skills": ["Docker", "Kubernetes"],
        "transferable_skills": ["Project Management", "Agile methodologies"]
    }}
    """
    
    response_text = gemini_client.generate_content(
        model='gemini-2.5-flash', 
        prompt=cv_text,
        config={"system_instruction": system_instruction}
    )

    try:
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        return data
    except Exception as e:
        return {"error": "Failed to analyze CV", "details": str(e), "raw": response_text}