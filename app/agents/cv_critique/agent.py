import json
from app.agents.gemini_client import gemini_client

def analyze_cv_with_gemini(cv_text: str) -> dict:
    """
    Sends CV text to Gemini and asks for a structured critique.
    """
    
    prompt = f"""
    You are an expert strict Career Coach for Computer Science students. 
    Analyze the following resume text. 
    
    Identify:
    1. Weak verbs (e.g., "Worked on", "Helped").
    2. Missing metrics (e.g., "Improved performance" without saying by how much).
    3. Formatting or structural issues (inferred from text).
    4. Give a score out of 100.

    Resume Text:
    {cv_text}

    Return the response ONLY as valid JSON in this format:
    {{
        "score": 85,
        "weaknesses": ["Used 'helped' instead of 'spearheaded'", "No github link found"],
        "suggestions": ["Change 'worked on' to 'developed'", "Add quantified results"]
    }}
    """

    response_text = gemini_client.generate_content(model='gemini-2.5-flash', prompt=prompt)

    try:
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)
    except Exception as e:
        return {"error": "Failed to analyze CV", "details": str(e), "raw": response_text}