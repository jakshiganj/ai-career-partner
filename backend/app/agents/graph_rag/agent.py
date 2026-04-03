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
        for attempt in range(3):
            try:
                response_text = gemini_client.generate_content(
                    model='gemini-2.5-flash',
                    prompt=prompt,
                    config={"system_instruction": system_instruction}
                )
                clean_text = response_text.replace("```json", "").replace("```", "").strip()
                return json.loads(clean_text)
            except Exception as e:
                if attempt == 2:
                    print(f"Error extracting JD skills: {e}")
                    return []

    def get_expanded_skills(self, skills: list[str]) -> set[str]:
        """
        Hybrid Search:
        1. Graph expansion via RELATED_TO/broaderSkill.
        2. Vector search via Neo4j Vector Index on skill embeddings.
        3. Reciprocal Rank Fusion (RRF) to merge and rank results.
        """
        expanded = set(s.lower() for s in skills)
        if not skills:
            return expanded
            
        try:
            # Fetch embeddings in a single batch API call
            embeddings = gemini_client.embed_content_batch('text-embedding-004', skills)
            
            with self.driver.session() as session:
                for idx, skill in enumerate(skills):
                    # 1. Graph matches
                    graph_query = """
                    MATCH (s:Skill)-[:RELATED_TO|broaderSkill*1..2]->(r:Skill)
                    WHERE toLower(s.name) = toLower($skill)
                    RETURN DISTINCT r.name AS name
                    LIMIT 20
                    """
                    graph_res = [record["name"] for record in session.run(graph_query, skill=skill)]
                    
                    # 2. Vector matches (Semantic)
                    embedding = embeddings[idx] if idx < len(embeddings) else []
                    vector_res = []
                    if embedding and not all(v == 0.0 for v in embedding):
                        vector_query = """
                        CALL db.index.vector.queryNodes('skill_embeddings', 20, $embedding) 
                        YIELD node, score
                        RETURN node.name AS name
                        """
                        try:
                            vector_res = [record["name"] for record in session.run(vector_query, embedding=embedding)]
                        except Exception as ve:
                            print(f"Vector search warning: {ve}")
                    
                    # 3. Reciprocal Rank Fusion (RRF)
                    K = 60
                    rrf_scores = {}
                    
                    for i, name in enumerate(graph_res):
                        name_lower = name.lower()
                        rrf_scores[name_lower] = rrf_scores.get(name_lower, 0) + 1.0 / (K + i + 1)
                        
                    for i, name in enumerate(vector_res):
                        name_lower = name.lower()
                        rrf_scores[name_lower] = rrf_scores.get(name_lower, 0) + 1.0 / (K + i + 1)
                        
                    # Top 20 combined
                    sorted_skills = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
                    for name_lower, _ in sorted_skills[:20]:
                        expanded.add(name_lower)
                        
        except Exception as e:
            print(f"Warning: Neo4j not reachable or error in query. Graph expansion skipped. (Error: {e})")

        return expanded

    def extract_candidate_skills(self, cv_text: str) -> list[str]:
        """Extract candidate skills from their raw CV if profile is missing."""
        system_instruction = '''
        You are an expert IT recruiter. Extract a JSON list of technical skills from the candidate's CV.
        Only include hard skills, programming languages, frameworks, and tools already present in the text.
        Return ONLY a JSON array of strings (e.g., ["Python", "React", "AWS"]).
        Do not include markdown or code block tags.
        '''
        prompt = f"--- Candidate CV ---\n{cv_text[:3000]}"
        try:
            response_text = gemini_client.generate_content(
                model='gemini-2.5-flash',
                prompt=prompt,
                config={"system_instruction": system_instruction}
            )
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
        except Exception as e:
            print(f"Error extracting candidate skills: {e}")
            return []

    async def run(self, candidate_profile: dict, job_description: str, cv_raw: str = None) -> dict:
        """
        Main pipeline method:
        1. Extract skills from JD.
        2. Ensure candidate skills are available (extract from cv_raw if profile is empty).
        3. Expand candidate skills using Neo4j.
        4. Compare and compute score/gaps.
        """
        candidate_skills = []
        if candidate_profile and candidate_profile.get("skills"):
            candidate_skills = candidate_profile["skills"]
        elif cv_raw:
            candidate_skills = self.extract_candidate_skills(cv_raw)
            
        if not isinstance(candidate_skills, list):
            candidate_skills = []
            
        required_skills = self.extract_job_skills(job_description)
        if not required_skills:
            return {"skill_gaps": [], "skill_match_score": 0.0, "implicit_skills": []}

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

async def graph_rag_agent(candidate_profile: dict, job_description: str, cv_raw: str = None) -> dict:
    return await graph_agent_instance.run(candidate_profile, job_description, cv_raw)

# Standalone A2A function for orchestrator pattern wrapper
def get_graph_rag_agent():
    return graph_agent_instance
