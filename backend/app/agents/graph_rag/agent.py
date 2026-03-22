import os
import json
from neo4j import GraphDatabase
from app.agents.gemini_client import gemini_client

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

class GraphRAGAgent:
    def __init__(self):
        self.driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    def close(self):
        self.driver.close()

    def extract_job_skills(self, job_description: str) -> list[str]:
        """Use Gemini to extract a list of required skills from the job description."""
        system_instruction = '''
        You are an expert IT recruiter. Extract a JSON list of required skills from the job description.
        Only include hard skills, programming languages, frameworks, and tools.
        Return ONLY a JSON array of strings, formatted as valid JSON (e.g., ["Python", "React", "AWS"]).
        Do not include markdown or code block tags.
        '''
        prompt = f"--- Job Description ---\n{job_description}"
        response_text = gemini_client.generate_content(
            model='gemini-2.5-flash',
            prompt=prompt,
            config={"system_instruction": system_instruction}
        )
        
        try:
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
        except Exception as e:
            print(f"Error extracting JD skills: {e}")
            return []

    def get_expanded_skills(self, skills: list[str]) -> set[str]:
        """
        Query Neo4j to find related or implied skills.
        If the candidate has 'React', they implicitly know 'JavaScript'.
        """
        expanded = set(s.lower() for s in skills)
        
        try:
            with self.driver.session() as session:
                for skill in skills:
                    # ESCO Relationships: 
                    # 1. Skill -> RELATED_TO -> Skill
                    # 2. Skill -> broaderSkill -> Skill (Implied from the hierarchy)
                    query = """
                    MATCH (s:Skill)-[:RELATED_TO|broaderSkill*1..2]->(r:Skill)
                    WHERE toLower(s.name) = toLower($skill)
                    RETURN DISTINCT r.name AS related_skill
                    LIMIT 20
                    """
                    result = session.run(query, skill=skill)
                    for record in result:
                        expanded.add(record["related_skill"].lower())
        except Exception as e:
            print(f"Warning: Neo4j not reachable. Graph expansion skipped. (Error: {e})")

        return expanded

    async def run(self, candidate_profile: dict, job_description: str) -> dict:
        """
        Main pipeline method:
        1. Extract skills from JD.
        2. Expand candidate skills using Neo4j.
        3. Compare and compute score/gaps.
        """
        if not candidate_profile:
            candidate_profile = {}
            
        candidate_skills = candidate_profile.get("skills", [])
        if not isinstance(candidate_skills, list):
            candidate_skills = []
            
        required_skills = self.extract_job_skills(job_description)
        if not required_skills:
            return {"skill_gaps": [], "skill_match_score": 0.0}

        # Expand candidate skills with graph knowledge
        candidate_expanded_skills = self.get_expanded_skills(candidate_skills)
        
        gaps = []
        matched_count = 0
        
        for req_skill in required_skills:
            req_lower = req_skill.lower()
            # Direct match or implied match
            if req_lower in candidate_expanded_skills:
                matched_count += 1
            else:
                gaps.append(req_skill)
                
        # Calculate score
        if len(required_skills) > 0:
            score = round(matched_count / len(required_skills), 2)
        else:
            score = 0.0
            
        implicit_skills = list(candidate_expanded_skills - set(s.lower() for s in candidate_skills))
        
        return {
            "skill_gaps": gaps,
            "skill_match_score": score,
            "implicit_skills": implicit_skills
        }

graph_agent_instance = GraphRAGAgent()

async def graph_rag_agent(candidate_profile: dict, job_description: str) -> dict:
    return await graph_agent_instance.run(candidate_profile, job_description)

# Standalone A2A function for orchestrator pattern wrapper
def get_graph_rag_agent():
    return graph_agent_instance
