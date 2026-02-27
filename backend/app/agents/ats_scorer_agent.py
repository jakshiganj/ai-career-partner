import json
from app.agents.gemini_client import gemini_client

class ATSScorerAgent:
    """
    Analyzes a CV against a specific Job Description to predict an ATS match score.
    Returns structured JSON with the score and reasoning.
    """
    
    async def run(self, cv_text: str, job_description: str) -> dict:
        system_instruction = """
        You are an expert Application Tracking System (ATS) algorithm and senior technical recruiter.
        Analyze the provided CV against the Job Description. 
        
        Calculate an 'ATS Match Score' out of 100 based on:
        1. Keyword match density
        2. Experience alignment
        3. Skills overlap
        
        Provide constructive feedback on what is missing or could be improved to increase the score.
        
        Return ONLY valid JSON in this exact format:
        {
            "ats_score": 75,
            "summary": "Good match for core skills but lacks cloud deployment experience.",
            "missing_keywords": ["Docker", "AWS", "CI/CD"],
            "matching_keywords": ["Python", "FastAPI", "PostgreSQL"],
            "formatting_issues": ["No github link", "Too much text in experience description"]
        }
        """
        
        prompt = f"--- CV ---\n{cv_text}\n\n--- Job Description ---\n{job_description}"
        
        response_text = gemini_client.generate_content(
            model='gemini-2.5-flash', 
            prompt=prompt,
            config={"system_instruction": system_instruction}
        )

        try:
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_text)
            return data
        except Exception as e:
            return {"error": "Failed to parse ATS score", "details": str(e), "raw": response_text}
