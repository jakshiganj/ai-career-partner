import asyncio
import json
from app.agents.graph_rag.agent import graph_rag_agent

async def run_final_test():
    # Scenario: A candidate who knows basic web development (React, JS) 
    # applying for a Senior Frontend Software Engineer role that requires broader architecture skills.
    
    candidate_profile = {
        "headline": "Junior Web Developer",
        "skills": ["React", "JavaScript", "HTML", "CSS"]
    }

    job_description = """
    Senior Frontend Software Engineer
    
    We are looking for a senior engineer to lead our frontend architecture.
    Key responsibilities include:
    - Designing scalable frontend systems using React and Next.js.
    - Implementing complex state management and performance optimizations.
    - Mentoring junior developers in software engineering best practices.
    - Proficiency in TypeScript and modern CSS-in-JS libraries.
    - Deep knowledge of computer programming and software development lifecycles.
    - Experience with debug software and interpreting technical requirements.
    """

    print("="*60)
    print("RUNNING FINAL GRAPHRAG AGENT TEST WITH FULL ESCO ONTOLOGY")
    print("="*60)
    print(f"Candidate Skills: {candidate_profile['skills']}")
    print("-" * 60)
    
    result = await graph_rag_agent(candidate_profile, job_description)
    
    print("\n--- GRAPHRAG MATCH RESULTS ---")
    print(f"Match Score: {result.get('skill_match_score')}")
    print("\nSkill Gaps Identified (Missing from CV and not found in Graph):")
    for gap in result.get('skill_gaps', []):
        print(f" - {gap}")
        
    print("\nNote: Some matching might have happened implicitly via ESCO 'broaderSkill' or 'RELATED_TO' nodes.")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(run_final_test())
