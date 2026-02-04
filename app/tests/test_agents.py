import pytest
import sys
import os

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.agents.market_trends.agent import market_trends_agent
from app.agents.interview_prep.agent import interview_prep_agent
from app.agents.graph_rag.agent import graph_rag_agent

def test_market_trends_agent():
    result = market_trends_agent(["Python", "COBOL"])
    assert "Python" in result["market_analysis"]
    assert "COBOL" in result["market_analysis"]

def test_graph_rag_agent():
    result = graph_rag_agent(["Python"])
    assert "Django" in result["related_skills"]
    assert "learning_path" in result

def test_interview_prep_agent():
    result = interview_prep_agent("Job Desc", "Resume Summary")
    assert len(result["questions"]) > 0

if __name__ == "__main__":
    test_market_trends_agent()
    test_graph_rag_agent()
    test_interview_prep_agent()
    print("Agent tests passed!")
