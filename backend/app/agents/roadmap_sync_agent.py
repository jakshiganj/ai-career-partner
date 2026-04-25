import json
from app.agents.gemini_client import gemini_client

class RoadmapSyncAgent:
    """
    Sub-agent that reads a newly parsed CV profile and the user's current 
    learning roadmap, and automatically marks roadmap tasks as 'completed: true'
    if the new CV demonstrates mastery of those skills.
    """
    
    async def sync(self, profile_data: dict, current_roadmap: list) -> dict:
        system_instruction = """
        You are an intelligent data synchronizer for a career platform.
        You will receive the user's freshly parsed CV profile (skills, experience, etc.)
        and their existing learning roadmap JSON.
        
        Your job is to:
        1. Compare the new CV data against the roadmap action_items.
        2. If the CV clearly shows the user has learned or applied an item that is currently "completed": false, change it to "completed": true.
        3. Do NOT modify the structure, phase names, or remove any tasks. Only flip the boolean.
        
        Return ONLY valid JSON in this exact format:
        {
            "updated_roadmap": [
                {
                    "phase_name": "...",
                    "action_items": [
                        { "task": "...", "completed": true }
                    ]
                }
            ],
            "sync_summary": "I marked 'Docker basics' as completed because it appeared in your new experience section."
        }
        """
        
        prompt = f"NEW PROFILE DATA:\n{json.dumps(profile_data, indent=2)}\n\nCURRENT ROADMAP:\n{json.dumps(current_roadmap, indent=2)}"
        
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
                print(f"RoadmapSyncAgent Attempt {attempt} failed: {e}")
                if attempt == 2:
                    return {
                        "error": "Failed to sync updates via CV upload",
                        "details": str(e)
                    }
