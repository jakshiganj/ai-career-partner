import uuid

sessions = {}

def create_interview_session(job_description: str, cv_text: str, mode: str = "text") -> str:
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "job_description": job_description,
        "cv_text": cv_text,
        "mode": mode,
        "history": []
    }
    return session_id

def get_session(session_id: str):
    return sessions.get(session_id)

from app.agents.gemini_client import gemini_client
import json

def interview_prep_agent(job_description: str, resume_summary: str, mode: str = "text") -> dict:
    """
    Initializes an interview session and generates initial questions.
    """
    session_id = create_interview_session(job_description, resume_summary, mode)
    
    # Generate initial questions (Mock for now, normally would use Gemini)
    questions = [
        "Tell me about a project where you used the skills mentioned in your resume.",
        "What is your biggest weakness?",
        "How do you handle conflict in a team?"
    ]
    
    return {
        "session_id": session_id,
        "mode": mode,
        "initial_questions": questions,
        "websocket_url": f"/ws/interview/{session_id}" if mode == "native-audio" else None
    }

async def generate_interview_questions(job_description: str, cv_text: str, tier: str) -> list[str]:
    """Generates a bank of practice questions tailored to the candidate and role tier."""
    prompt = f"""
    You are an expert technical interviewer. Generate exactly 3 highly relevant interview questions for:
    Role: {job_description}
    Difficulty Tier: {tier} (e.g. Reach, Stretch, Realistic)
    Candidate Background: {cv_text}
    
    Structure the response as a JSON array of strings:
    ["Question 1", "Question 2", "Question 3"]
    """
    try:
        response_text = gemini_client.generate_content(model='gemini-2.5-flash', prompt=prompt)
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        questions = json.loads(clean_text)
        if isinstance(questions, list):
            return questions
    except Exception as e:
        print(f"Error generating interview questions: {e}")
    
    return [
        f"Tell me about a time you used your skills for this {tier} role.",
        "How would you approach the challenges mentioned in the job description?",
        "What is your biggest weakness technically?"
    ]

async def process_interview_message(session_id: str, user_message: str) -> str:
    """
    Process a user message in an interview session, calling Gemini to generate the coach's response.
    Maintains conversation history.
    """
    session = get_session(session_id)
    if not session:
        return "Error: Session not found."
        
    # maintain history
    session['history'].append({"role": "user", "content": user_message})
    
    # Construct prompt
    jd = session.get('job_description', 'General Software Engineering Role')
    cv = session.get('cv_text', 'No CV provided')
    
    # Simple history formatting
    history_text = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in session['history'][-10:]])
    
    prompt = f"""
    You are an expert AI Technical Interviewer and Career Coach. 
    You are interviewing a candidate for the following role:
    "{jd}"
    
    Candidate's Resume Summary:
    "{cv}"
    
    Current Conversation History:
    {history_text}
    
    Instructions:
    - Act exactly like a professional interviewer.
    - Ask ONE follow-up question at a time.
    - If the user gives a good answer, acknowledge it briefly and move to the next topic (technical or behavioral).
    - If the answer is weak, gently critique it and ask for clarification.
    - Keep responses concise (under 3 sentences) to maintain a conversational flow.
    
    Respond as the INTERVIEWER:
    """
    
    try:
        # Call Gemini (using 2.5-flash for speed)
        response_text = gemini_client.generate_content(model='gemini-2.5-flash', prompt=prompt)
        
        # Clean up response if it includes "INTERVIEWER:" prefix
        clean_response = response_text.replace("INTERVIEWER:", "").strip()
        
        # Update history
        session['history'].append({"role": "interviewer", "content": clean_response})
        
        return clean_response
    except Exception as e:
        return f"System Error: {str(e)}"
