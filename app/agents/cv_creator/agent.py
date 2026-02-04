import json
from app.agents.gemini_client import gemini_client

def cv_creator_agent(candidate_profile: dict, critique_feedback: dict) -> dict:
    """
    Generates an improved CV based on the detailed critique and profile.
    """
    prompt = f"""
    You are an expert CV Writer.
    
    Candidate Profile: {json.dumps(candidate_profile)}
    Critique Feedback: {json.dumps(critique_feedback)}
    
    Rewrite the CV content to address the feedback. 
    Focus on Action Verbs, Quantifiable Metrics, and proper formatting.
    
    Return the result as a Markdown string inside a JSON object:
    {{
        "cv_markdown": "# Name ..."
    }}
    """
    
    response_text = gemini_client.generate_content(model='gemini-2.5-flash', prompt=prompt)
    
    try:
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)
    except Exception as e:
        return {"error": "Failed to generate CV", "raw_response": response_text}
