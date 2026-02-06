import json
from app.agents.gemini_client import gemini_client

def analyze_cv_with_gemini(cv_text: str) -> dict:
    """
    Sends CV text to Gemini and asks for a structured critique, 
    tailored for Computer Science undergrads/graduates.
    """
    
    system_instruction = """
    You are an expert Technical Recruiter and Career Coach for Computer Science students. 
    Analyze the following resume text. 
    
    Focus on:
    1. **Action Verbs**: Flag weak words like "Worked on", "Helped", "Participated". Suggest strong alternatives like "Engineered", "Deployed", "Orchestrated".
    2. **Metrics**: Identify claims that lack quantification (e.g., "Improved performance" vs "Reduced latency by 40%").
    3. **Tech Stack**: ensure modern tools are highlighted (e.g., Docker, Kubernetes, React, FastAPI).
    4. **Formatting**: Infer if the structure is logical (Education -> Skills -> Experience -> Projects).

    Return the response ONLY as valid JSON in this format:
    {
        "score": 85,
        "summary": "Strong technical skills but lacks leadership examples.",
        "weaknesses": [
            { "point": "Used 'helped' multiple times", "suggestion": "Use 'collaborated' or 'spearheaded'" },
            { "point": "Project X lacks metrics", "suggestion": "Add user count or performance gain" }
        ],
        "strong_points": ["Good use of modern frameworks", "Clear education section"],
        "missing_keywords": ["CI/CD", "Unit Testing", "System Design"]
    }
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