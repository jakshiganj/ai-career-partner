from app.agents.gemini_client import gemini_client

class CoverLetterAgent:
    """
    Generates a highly tailored cover letter based on the user's CV and the target Job Description.
    """
    
    async def run(self, cv_text: str, job_description: str, tone: str = "professional and enthusiastic") -> str:
        system_instruction = f"""
        You are an expert career coach and copywriter specializing in tech industry cover letters.
        Write a highly tailored, compelling Cover Letter based on the provided CV and Job Description.
        
        Guidelines:
        - The tone should be: {tone}.
        - Do not hallucinate experiences not present in the CV.
        - Map specific achievements from the CV to the requirements in the JD.
        - Keep it concise, no more than 4 paragraphs.
        - Use standard business letter formatting (placeholders for Name/Date/Address are fine).
        - State clearly how the candidate's unique background solves the employer's problems.
        
        Return ONLY the finalized cover letter text. Do not include markdown blocks or conversational filler.
        """
        
        prompt = f"--- Candidate CV ---\n{cv_text}\n\n--- Target Job Description ---\n{job_description}"
        
        response_text = gemini_client.generate_content(
            model='gemini-2.5-flash', 
            prompt=prompt,
            config={"system_instruction": system_instruction}
        )

        return response_text.strip()
