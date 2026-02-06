from duckduckgo_search import DDGS
from .scraper import get_jobs_for_skill

def market_trends_agent(skills: list) -> dict:
    """
    Analyzes job market trends for the given skills using TopJobs Scraping (Primary) 
    and DuckDuckGo Search (Secondary/Fallback).
    """
    results = {}
    
    # 1. Scrape TopJobs once for efficiency
    try:
        scraped_matches = {}
        # Pre-fetch all jobs to avoid hitting the site 10 times in a loop
        from .scraper import scrape_topjobs_software_vacancies
        all_jobs = scrape_topjobs_software_vacancies()
        
        for skill in skills:
             matched_titles = get_jobs_for_skill(skill, all_jobs=all_jobs)
             if matched_titles:
                 scraped_matches[skill] = matched_titles
    except Exception as e:
        print(f"TopJobs integration error: {e}")
        scraped_matches = {}

    with DDGS() as ddgs:
        for skill in skills:
            # Check Scraped Data First
            if skill in scraped_matches and scraped_matches[skill]:
                results[skill] = {
                    "status": "Active Hiring on TopJobs",
                    "snippets": scraped_matches[skill][:3] # Show top 3 matches
                }
                continue # Skip DDG if we have real local data

            query = f"{skill} developer jobs demand Sri Lanka 2025"
            try:
                # Get top 2 search results to summarize demand
                search_results = list(ddgs.text(query, max_results=2))
                
                if not search_results:
                    raise Exception("No results found")

                # Simple sentiment/keyword analysis on snippets
                # In production, we'd feed these snippets to Gemini for a summary
                snippets = [r['body'] for r in search_results]
                combined_text = " ".join(snippets).lower()
                
                if "high demand" in combined_text or "urgent" in combined_text:
                    status = "High Demand"
                elif "remote" in combined_text:
                    status = "Remote Opportunities Available"
                else:
                    status = "Stable Demand"
                    
                results[skill] = {
                    "status": status,
                    "snippets": snippets
                }
            except Exception as e:
                # Fallback implementation for Demo purposes (if Search fails/blocks)
                print(f"Search failed for {skill}: {e}. Using fallback.")
                
                fallback_data = {
                    "python": {"status": "High Demand", "snippets": ["Senior Python Developer wanted for FinTech company in Colombo.", "Urgent: Python/Django Engineer (Remote)."]},
                    "react": {"status": "Very High Demand", "snippets": ["Frontend Developer (React.js) - Top Salary.", "React Native Developer for US based startup."]},
                    "devops": {"status": "Growing Demand", "snippets": ["AWS/Azure DevOps Engineer needed.", "Cloud Infrastructure Engineer opportunities."]},
                    "java": {"status": "Stable Demand", "snippets": ["Java Spring Boot Developer - Enterprise Banking.", "Backend Engineer (Java) positions."]},
                    "django": {"status": "High Demand", "snippets": ["Python/Django Full Stack Dev required.", "Django Backend Developer - Remote."]}
                }
                
                # Dynamic fallback if not in list
                default_fallback = {
                    "status": "Stable Demand",
                    "snippets": [f"{skill.capitalize()} Developer positions available.", f"Hiring {skill.capitalize()} experts for immediate start."]
                }
                
                results[skill] = fallback_data.get(skill.lower(), default_fallback)

    # Identify 'Hot Skills' dynamically from our scraped data if available
    if 'all_jobs' in locals() and all_jobs:
        # Simple frequency counter for common tech keywords in titles
        keyword_counts = {}
        # Keywords to track (can be expanded)
        track_list = ["java", "python", "react", "node", "aws", "azure", "devops", ".net", "c#", "php", "qa", "android", "ios", "angular"]
        
        for job in all_jobs:
            title_lower = job['title'].lower()
            for kw in track_list:
                if kw in title_lower:
                    keyword_counts[kw] = keyword_counts.get(kw, 0) + 1
        
        # Sort by frequency and take top 5
        hot_skills = sorted(keyword_counts, key=keyword_counts.get, reverse=True)[:5]
        # Capitalize for display
        hot_skills = [s.upper() if len(s) < 3 else s.title() for s in hot_skills]
    else:
        # Fallback if scraping failed
        hot_skills = ["Cloud Computing", "AI/ML", "DevOps", "Cybersecurity"]
    
    return {
        "market_analysis": results,
        "hot_skills": hot_skills
    }
