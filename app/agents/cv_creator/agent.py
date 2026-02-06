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
    
    Rewrite the CV content to address the specific feedback provided. 
    
    Guidelines:
    - Use star method for bullet points (Situation, Task, Action, Result).
    - Maximise the use of strong action verbs.
    - Quantify results wherever possible (hallucinate reasonable metrics if necessary for the example, but mark them).
    - Highlight the skills mentioned in 'missing_keywords' if applicable to the profile.
    
    Return the result as a Markdown string inside a JSON object:
    {{
        "cv_markdown": "# Name ...",
        "improvements_made": ["Added metrics to Project A", "Replaced 'worked on' with 'Architected'"]
    }}
    """
    
    response_text = gemini_client.generate_content(model='gemini-2.5-flash', prompt=prompt)
    
    try:
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)
    except Exception as e:
        return {"error": "Failed to generate CV", "raw_response": response_text}
