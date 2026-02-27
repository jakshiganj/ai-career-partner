import json
from app.agents.gemini_client import gemini_client

class JobClassifierAgent:
    """
    Classifies a job target as 'Reach', 'Realistic', or 'Safety' 
    based on the candidate's CV.
    """
    
    async def run(self, cv_text: str, job_description: str) -> dict:
        system_instruction = """
        You are an expert career strategist. 
        Analyze the candidate's CV against the target Job Description.
        
        Classify the job into exactly one of three tiers for this candidate:
        - "Safety": The candidate clearly exceeds the requirements.
        - "Realistic": The candidate meets most core requirements.
        - "Reach": The candidate is missing key requirements and it would be a stretch.
        
        Return ONLY valid JSON in this exact format:
        {
            "match_score": 65,
            "tier": "Reach",
            "reasoning": "Candidate lacks the required 5 years of system design experience, but has strong fundamentals.",
            "missing_skills": ["System Architecture", "Kafka"]
        }
        """
        
        prompt = f"--- Candidate CV ---\n{cv_text}\n\n--- Target Job Description ---\n{job_description}"
        
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
            return {
                "error": "Failed to classify job", 
                "tier": "Unknown",
                "details": str(e)
            }
