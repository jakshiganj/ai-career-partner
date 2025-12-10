import google.generativeai as genai
import os
import json

# 1. Configure the API
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_KEY)

def analyze_cv_with_gemini(cv_text: str) -> dict:
    """
    Sends CV text to Gemini and asks for a structured critique.
    """
    model = genai.GenerativeModel('gemini-2.5-flash')

    # 2. The "System Prompt" - This tells the AI how to behave
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

    try:
        # 3. Call the API
        response = model.generate_content(prompt)
        
        # 4. Clean up the response (Gemini sometimes adds ```json ... ```)
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        
        return json.loads(clean_text)
        
    except Exception as e:
        print(f"AI Error: {e}")
        return {"error": "Failed to analyze CV", "details": str(e)}