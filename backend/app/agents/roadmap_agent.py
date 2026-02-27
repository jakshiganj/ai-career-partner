import json
from app.agents.gemini_client import gemini_client

class RoadmapAgent:
    """
    Generates a Visual Skill Gap Roadmap (Feature 8).
    Creates a step-by-step learning progression based on the missing skills
    identified between the CV and target Job Description.
    """
    
    async def run(self, missing_skills: list[str], target_role: str, user_level: str = "intermediate") -> dict:
        """
        Returns a structured JSON timeline of how to acquire the missing skills.
        """
        system_instruction = """
        You are an elite Career Coach and Senior Staff Engineer.
        The user wants to become a "{target_role}" but is missing certain key skills.
        
        Create a practical, step-by-step learning roadmap to acquire these missing skills.
        Organize it chronologically (e.g., Phase 1, Phase 2, etc.).
        For each missing skill, provide:
        1. A brief "why it matters" explanation.
        2. 2-3 specific learning resources or project ideas.
        3. Estimated time to proficiency.
        
        Return ONLY valid JSON in this exact format:
        {
            "target_role": "Backend Engineer",
            "phases": [
                {
                    "phase_name": "Phase 1: Foundations",
                    "estimated_weeks": 4,
                    "skills_covered": ["Docker", "Linux Basics"],
                    "action_items": [
                        "Containerize a simple Python app",
                        "Complete 'Docker for Beginners' on YouTube"
                    ]
                }
            ],
            "overall_advice": "Focus on deploying real projects rather than just tutorials."
        }
        """
        
        prompt = f"Target Role: {target_role}\nUser Level: {user_level}\nMissing Skills to Cover: {', '.join(missing_skills)}"
        
        response_text = gemini_client.generate_content(
            model='gemini-2.5-flash', 
            prompt=prompt,
            config={"system_instruction": system_instruction.replace("{target_role}", target_role)}
        )

        try:
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_text)
            return data
        except Exception as e:
            return {
                "error": "Failed to generate roadmap",
                "details": str(e),
                "raw": response_text
            }
