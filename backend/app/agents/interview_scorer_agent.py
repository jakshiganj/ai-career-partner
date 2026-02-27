import json
from app.agents.gemini_client import gemini_client

class InterviewScorerAgent:
    """
    Evaluates a completed mock interview session (Feature 7).
    Scores the candidate across multiple dimensions based on the chat history.
    """
    
    async def run(self, chat_history: list[dict], target_role: str) -> dict:
        """
        Takes the full conversation history from `interview_prep_agent` and scores it.
        """
        if not chat_history or len(chat_history) < 2:
            return {"error": "Insufficient interview data to score."}
            
        system_instruction = """
        You are a strict but fair Executive Hiring Manager evaluating a candidate's interview performance.
        Review the provided interview transcript.
        
        Score the candidate from 1-10 on the following dimensions:
        1. "technical_depth": How well did they demonstrate required technical knowledge?
        2. "communication": Were their answers clear, concise, and structured (e.g., STAR method)?
        3. "problem_solving": Did they show logical reasoning when faced with challenges?
        4. "culture_fit": Did they demonstrate teamwork, adaptability, and positive attitude?
        
        Calculate an `overall_score` (average of the 4).
        Provide a detailed `constructive_feedback` summary highlighting strengths and areas for improvement.
        
        Return ONLY valid JSON in this exact format:
        {
            "scores": {
                "technical_depth": 7,
                "communication": 8,
                "problem_solving": 6,
                "culture_fit": 9
            },
            "overall_score": 7.5,
            "strengths": ["Clear communication", "Good team attitude"],
            "weaknesses": ["Struggled with deep dive into distributed systems"],
            "constructive_feedback": "You communicate well, but need to study system design patterns before the real interview."
        }
        """
        
        # Format the history for the LLM
        formatted_transcript = ""
        for msg in chat_history:
            role = msg.get("role", "unknown").upper()
            content = msg.get("content", "")
            formatted_transcript += f"{role}: {content}\n\n"
            
        prompt = f"Target Role: {target_role}\n\n--- Interview Transcript ---\n{formatted_transcript}"
        
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
                "error": "Failed to score interview",
                "details": str(e),
                "raw": response_text
            }
