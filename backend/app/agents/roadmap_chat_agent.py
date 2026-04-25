import json
from app.agents.gemini_client import gemini_client

class RoadmapChatAgent:
    """
    Sub-agent that allows users to chat with their skill roadmap.
    It can read user messages (e.g., 'I finished Docker'), update the
    roadmap JSON by marking relevant tasks as complete, and reply.
    """
    
    async def chat(self, user_message: str, current_roadmap: list) -> dict:
        """
        Returns a dict containing:
        {
            "updated_roadmap": [...],
            "reply": "Excellent job finishing Docker! Here is what you should focus on next..."
        }
        """
        system_instruction = """
        You are a supportive, high-level Career Coach AI. 
        You are helping the user manage their learning roadmap.
        
        The user will provide you with a message about their progress and their CURRENT roadmap JSON.
        Your job is to:
        1. Parse the user's progress.
        2. Update the CURRENT roadmap JSON by changing "completed": false to "completed": true for any tasks the user specifically says they finished.
        3. Provide a short, encouraging textual reply (1-2 sentences) about their progress and what to do next.
        
        Return ONLY valid JSON in this exact format, with NO markdown formatting around the output:
        {
            "updated_roadmap": [
                {
                    "phase_name": "...",
                    "action_items": [
                        { "task": "...", "completed": true }
                    ]
                }
            ],
            "reply": "Great job! Keep it up."
        }
        """
        
        prompt = f"USER MESSAGE:\n{user_message}\n\nCURRENT ROADMAP JSON:\n{json.dumps(current_roadmap, indent=2)}"
        
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
                import traceback
                print(f"RoadmapChatAgent Attempt {attempt} failed: {e}")
                if attempt == 2:
                    return {
                        "error": "Failed to sync updates via chat",
                        "details": str(e)
                    }
