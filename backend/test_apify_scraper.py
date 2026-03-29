import os
from dotenv import load_dotenv
from app.agents.market_trends.scraper import get_jobs_for_skill

load_dotenv()

def test_apify():
    skill = "Python Automation"
    print(f"Testing job scrape for skill: {skill}")
    jobs = get_jobs_for_skill(skill)
    print("Found jobs:")
    for j in jobs:
        print(j)

if __name__ == "__main__":
    test_apify()
