from duckduckgo_search import DDGS
from .scraper import get_jobs_for_skill
from app.agents.gemini_client import gemini_client
import json

class MarketConnectorAgent:
    """
    Analyzes job market trends and extracts salary expectations.
    Combines TopJobs scraping + DuckDuckGo search + Gemini interpretation.
    """
    
    async def run(self, job_title: str, location: str = "remote, US, global") -> dict:
        """
        Gathers salary expectations and hot skills needed for the target job title.
        """
        query = f"average salary for {job_title} {location} 2025"
        search_results_text = "No search results available."
        
        try:
            with DDGS() as ddgs:
                search_results = list(ddgs.text(query, max_results=3))
                if search_results:
                    snippets = [r['body'] for r in search_results]
                    search_results_text = "\n".join(snippets)
        except Exception as e:
            print(f"DDGS Salary search failed: {e}")
            
        system_instruction = """
        You are an expert tech recruiter and compensation analyst.
        Analyze the provided web search snippet regarding the salary for the target role.
        
        Extract a realistic low, median, and high boundary for what this role pays.
        Return ONLY valid JSON in this exact format, with numbers as integers:
        {
            "salary_min": 80000,
            "salary_median": 120000,
            "salary_max": 160000,
            "currency": "USD",
            "confidence": "High",
            "source_summary": "Based on search results mentioning averages around 120k for remote US roles."
        }
        """
        
        prompt = f"Target Role: {job_title}\nLocation Focus: {location}\n\nWeb Search Results:\n{search_results_text}"
        
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
                "error": "Failed to extract salary benchmark",
                "salary_min": 0, "salary_median": 0, "salary_max": 0,
                "currency": "USD",
                "details": str(e)
            }
