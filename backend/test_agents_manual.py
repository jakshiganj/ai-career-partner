import sys
import os

# Ensure app is in path
sys.path.append(os.getcwd())

from dotenv import load_dotenv
load_dotenv()

from app.agents.market_trends.agent import market_trends_agent
from app.agents.graph_rag.agent import graph_rag_agent
from app.agents.interview_prep.agent import interview_prep_agent
from app.agents.cv_critique.agent import analyze_cv_with_gemini

def test_agents():
    print("--- Testing Market Trends Agent ---")
    trends = market_trends_agent(["Python", "React"])
    print(trends)
    
    print("\n--- Testing GraphRAG Agent ---")
    skills = graph_rag_agent(["Python"])
    print(skills)
    
    print("\n--- Testing Interview Prep Agent ---")
    session = interview_prep_agent("Senior Python Dev", "Summary of myself...")
    print(session)
    
    print("\n--- Testing CV Critique Agent ---")
    critique = analyze_cv_with_gemini("I worked on some stuff using python.")
    print(critique)

if __name__ == "__main__":
    test_agents()
