import requests
from bs4 import BeautifulSoup
import re

def scrape_topjobs_software_vacancies():
    """
    Scrapes the 'Software Development' category from TopJobs.lk.
    Returns a list of dicts: {'title': str, 'company': str}
    """
    # FA=SDQ seems to be the internal code for "IT-Sware/DB/QA/Web/Graphics/GIS" based on link analysis
    url = "http://topjobs.lk/applicant/vacancybyfunctionalarea.jsp?FA=SDQ"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    jobs = []
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return []
            
        soup = BeautifulSoup(response.text, 'html.parser')
        rows = soup.find_all('tr')
        
        # Skip header rows (approx first 9)
        if len(rows) < 10:
            return []
            
        for row in rows[9:]:
            cols = row.find_all('td')
            if len(cols) > 2:
                # Column 2 contains the Title (h2) and Company (h1)
                content_col = cols[2]
                
                title_tag = content_col.find('h2')
                company_tag = content_col.find('h1')
                
                if title_tag and company_tag:
                    title = title_tag.get_text(strip=True)
                    company = company_tag.get_text(strip=True)
                    jobs.append({
                        "title": title,
                        "company": company,
                        "search_text": f"{title} {company}".lower()
                    })
                    
    except Exception as e:
        print(f"TopJobs Scrape Error: {e}")
        
    return jobs

def get_jobs_for_skill(skill, all_jobs=None):
    """
    Filters cached/fresh jobs for a specific skill.
    """
    if all_jobs is None:
        all_jobs = scrape_topjobs_software_vacancies()
        
    skill_lower = skill.lower()
    matches = [
        f"{j['title']} at {j['company']}" 
        for j in all_jobs 
        if skill_lower in j['search_text']
    ]
    
    return matches
