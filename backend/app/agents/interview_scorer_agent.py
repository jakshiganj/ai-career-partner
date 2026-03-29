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
        
        Score the candidate from 1-10 on the following 4 dimensions:
        1. "relevance": Did the answer address the question?
        2. "clarity": Was it well-structured and easy to follow?
        3. "depth": Did it demonstrate genuine knowledge or experience?
        4. "star_compliance": For behavioural questions, did it follow Situation -> Task -> Action -> Result?
        
        Calculate an `overall_score` (average of the 4).
        Provide a detailed `constructive_feedback` summary highlighting strengths and areas for improvement.
        Also provide `tips`, a dictionary mapping each dimension to one specific improvement tip.
        
        Return ONLY valid JSON in this exact format:
        {
            "scores": {
                "relevance": 7,
                "clarity": 8,
                "depth": 6,
                "star_compliance": 9
            },
            "overall_score": 7.5,
            "strengths": ["Clear communication", "Good team attitude"],
            "weaknesses": ["Struggled with deep dive into distributed systems"],
            "constructive_feedback": "You communicate well, but need to study system design patterns before the real interview.",
            "tips": {
                "relevance": "Try to stay more on topic instead of drifting into unrelated side projects.",
                "clarity": "Use simpler sentences to explain complex logic.",
                "depth": "Provide specific metrics and names of technologies you used.",
                "star_compliance": "Ensure you clearly describe the Result of your actions."
            }
        }
        """
        
        # Format the history for the LLM
        formatted_transcript = ""
        for msg in chat_history:
            role = msg.get("role", "unknown").upper()
            content = msg.get("content", "")
            formatted_transcript += f"{role}: {content}\n\n"
            
        prompt = f"Target Role: {target_role}\n\n--- Interview Transcript ---\n{formatted_transcript}"
        
        for attempt in range(3):
            try:
                response_text = gemini_client.generate_content(
                    model='gemini-2.5-flash', 
                    prompt=prompt,
                    config={"system_instruction": system_instruction}
                )
                clean_text = response_text.replace("```json", "").replace("```", "").strip()
                data = json.loads(clean_text)
                return data
            except Exception as e:
                if attempt == 2:
                    return {
                        "error": "Failed to score interview",
                        "details": str(e)
                    }
