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

from unittest.mock import patch, MagicMock

@patch('app.agents.graph_rag.agent.GraphRAGAgent.get_expanded_skills')
def test_graph_rag_agent(mock_get_expanded_skills):
    # Mock Neo4j expansion
    mock_get_expanded_skills.return_value = {"python", "django", "postgresql"}
    
    # Mock the gemini extraction so it returns a stable set of job skills
    with patch('app.agents.graph_rag.agent.GraphRAGAgent.extract_job_skills') as mock_extract:
        mock_extract.return_value = ["Python", "AWS"]
        
        result = asyncio.run(graph_rag_agent({"skills": ["Python"]}, "Python Developer wanted"))
        
        assert "skill_match_score" in result
        assert "AWS" in result["skill_gaps"]

import asyncio

def test_interview_prep_agent():
    result = asyncio.run(interview_prep_agent("Job Desc", "Resume Summary"))
    assert len(result["initial_questions"]) > 0

if __name__ == "__main__":
    test_market_trends_agent()
    test_graph_rag_agent()
    test_interview_prep_agent()
    print("Agent tests passed!")
