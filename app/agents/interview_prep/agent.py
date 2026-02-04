def interview_prep_agent(job_description: str, resume_summary: str) -> dict:
    """
    Generates interview questions based on the job description and resume.
    """
    questions = [
        "Tell me about a time you faced a technical challenge.",
        "How do your skills align with this job description?",
        "Explain the CAP theorem."
    ]
    
    return {
        "questions": questions,
        "mode": "text-simulation" # Placeholder for "native-audio"
    }
