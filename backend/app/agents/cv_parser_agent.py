import json
from app.agents.gemini_client import gemini_client

class CVParserAgent:
    """
    Analyzes raw CV text and extracts key information into a highly structured JSON format.
    This mapped output is fed directly into the CandidateProfile schema.
    """
    
    async def run(self, cv_text: str) -> dict:
        system_instruction = """
        You are an expert technical recruiter and resume parser.
        Your job is to read the raw, unstructured CV text and extract the data into a perfectly structured JSON object.
        
        Ensure you extract:
        1. 'headline': A short, 1-line professional title (e.g. Senior Frontend Developer)
        2. 'summary': A paragraph summarizing their professional background.
        3. 'skills': An array of strings representing technologies, tools, and methodologies.
        4. 'experience': An array of objects, each containing:
           - 'company' (str)
           - 'title' (str)
           - 'years' (str)
           - 'description' (str)
        5. 'education': An array of objects, each containing:
           - 'institution' (str)
           - 'degree' (str)
           - 'year' (str)
        6. 'certifications': An array of objects, each containing:
           - 'name' (str)
           - 'issuer' (str)
           - 'year' (str)
           
        If a section is missing from the CV completely, return an empty array or null for that field.
        
        Return ONLY valid JSON in this exact structure without any markdown wrap formatting:
        {
            "headline": "...",
            "summary": "...",
            "skills": ["...", "..."],
            "experience": [
                { "company": "...", "title": "...", "years": "...", "description": "..." }
            ],
            "education": [
                { "institution": "...", "degree": "...", "year": "..." }
            ],
            "certifications": [
                { "name": "...", "issuer": "...", "year": "..." }
            ]
        }
        """
        
        prompt = f"--- Raw CV Text ---\n{cv_text}"
        
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
            print(f"Failed to parse CV: {e}")
            return {
                "headline": None,
                "summary": None,
                "skills": [],
                "experience": [],
                "education": [],
                "certifications": []
            }
