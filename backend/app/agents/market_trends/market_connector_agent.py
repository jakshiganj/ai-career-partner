import asyncio
import json
from duckduckgo_search import DDGS
from .scraper import get_jobs_for_skill, scrape_topjobs_software_vacancies
from app.agents.gemini_client import gemini_client

class MarketConnectorAgent:
    """
    Analyzes job market trends and extracts salary expectations.
    Combines TopJobs scraping + DuckDuckGo search + Gemini interpretation.
    """
    
    async def run(self, job_title: str, location: str = "remote, Sri Lanka, global") -> dict:
        print(f"DEBUG: MarketConnectorAgent.run called for '{job_title}'")
        """
        Gathers salary expectations and scrapes job vacancies for the target role.
        """
        query = f"average salary for {job_title} 2025"
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
        
        salary_data = {
            "salary_min": 0, "salary_median": 0, "salary_max": 0,
            "currency": location.lower().partition("sri lanka")[1].replace("sri lanka", "LKR") or "USD",
            "source_summary": "Failed to extract salary benchmark"
        }

        try:
            response_text = gemini_client.generate_content(
                model='gemini-2.5-flash', 
                prompt=prompt,
                config={"system_instruction": system_instruction}
            )
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            salary_data = json.loads(clean_text)
        except Exception as e:
            print(f"Salary Extraction Error: {e}")

        # Real-time Job Scraping
        try:
            # First try matching the specific title
            matched = await asyncio.to_thread(get_jobs_for_skill, job_title)
            
            # If no matches or very few, just merge in the 5 most recent software vacancies anyway
            all_jobs = await asyncio.to_thread(scrape_topjobs_software_vacancies)
            recent_snippets = [f"{j['title']} at {j['company']}" for j in all_jobs[:5]]
            
            # Combine them, ensuring we have at least something
            job_snippets = list(set(matched + recent_snippets))[:10]
        except Exception as e:
            print(f"Job Scraping Error: {e}", flush=True)
            job_snippets = []

        return {
            "salary_benchmarks": salary_data,
            "market_analysis": {
                "Recent Vacancies": {
                    "snippets": job_snippets
                }
            }
        }
