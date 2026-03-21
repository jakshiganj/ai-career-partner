import pytest
from app.agents.graph_rag.agent import graph_rag_agent

@pytest.mark.anyio
async def test_graph_rag_agent():
    candidate_profile = {
        "headline": "Full Stack Developer",
        "skills": ["React", "Python", "SQL"]
    }

    job_description = """
    We are looking for a Senior Software Engineer to join our team.
    Requirements:
    - 5+ years of experience with JavaScript and TypeScript.
    - Proficiency in React and Node.js.
    - Strong backend skills using Python and PostgreSQL.
    - Experience with Docker and AWS is a huge plus.
    """

    print("Running GraphRAG Agent test...")
    result = await graph_rag_agent(candidate_profile, job_description)
    
    print("\n--- TEST RESULTS ---")
    print(f"Skill Match Score: {result.get('skill_match_score')}")
    print(f"Skill Gaps: {result.get('skill_gaps')}")

