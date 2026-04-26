import os
import json
import asyncio
from neo4j import GraphDatabase
from app.agents.gemini_client import gemini_client
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

# Initialize the baseline model globally so it doesn't reload on every evaluation loop
sbert_model = SentenceTransformer('all-MiniLM-L6-v2')

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
        CRITICAL: If a skill is a specific modern framework or tool (e.g., React, Docker, Next.js), 
        also output its broader ESCO-compatible IT category (e.g., Frontend Web Development, Containerization).
        Return ONLY a JSON array of strings in lowercase (e.g., ["python", "react", "frontend web development"]).
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
        Hybrid Search (Optimized):
        1. Batch Graph expansion for all skills at once.
        2. Parallel Vector search via Neo4j Vector Index.
        3. Reciprocal Rank Fusion (RRF) to merge and rank results.
        """
        expanded = set(s.lower() for s in skills)
        if not skills:
            return expanded
            
        try:
            # 1. Batch Graph matches (Direct + Shared Occupation context)
            # This query handles all skills in one go
            with self.driver.session() as session:
                graph_query = """
                MATCH (s:Skill)
                WHERE toLower(s.name) IN $skills
                OPTIONAL MATCH (s)-[:RELATED_TO|IMPLIES*1..2]-(r1:Skill)
                OPTIONAL MATCH (s)<-[:REQUIRES]-(o:Occupation)-[:REQUIRES]->(r2:Skill)
                WITH collect(DISTINCT r1.name) + collect(DISTINCT r2.name) AS combined
                UNWIND combined AS name
                RETURN DISTINCT name
                LIMIT 100
                """
                graph_res = [record["name"] for record in session.run(graph_query, skills=[s.lower() for s in skills])]
                for name in graph_res:
                    expanded.add(name.lower())

            # 2. Vector matches (Semantic) - Limit to top 15 skills to save time
            # If we have too many skills, expansion becomes noise
            top_skills = skills[:15]
            embeddings = gemini_client.embed_content_batch('text-embedding-004', top_skills)
            
            with self.driver.session() as session:
                for idx, embedding in enumerate(embeddings):
                    if embedding and not all(v == 0.0 for v in embedding):
                        vector_query = """
                        CALL db.index.vector.queryNodes('skill_embeddings', 10, $embedding) 
                        YIELD node, score
                        RETURN node.name AS name
                        LIMIT 5
                        """
                        try:
                            v_res = [record["name"] for record in session.run(vector_query, embedding=embedding)]
                            for name in v_res:
                                expanded.add(name.lower())
                        except Exception as ve:
                            print(f"Vector search warning: {ve}")
                        
        except Exception as e:
            print(f"Warning: Neo4j not reachable or error in query. Graph expansion skipped. (Error: {e})")

        return expanded

    def extract_candidate_skills(self, cv_text: str) -> list[str]:
        """Extract candidate skills from their raw CV if profile is missing."""
        system_instruction = '''
        You are an expert IT recruiter. Extract a JSON list of technical skills from the candidate's CV.
        Only include hard skills, programming languages, frameworks, and tools.
        CRITICAL: If a skill is a specific modern framework or tool (e.g., React, Docker, Next.js), 
        also output its broader ESCO-compatible IT category (e.g., Frontend Web Development, Containerization).
        Return ONLY a JSON array of strings in lowercase (e.g., ["python", "react", "frontend web development", "aws"]).
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
        candidate_expanded_skills = await asyncio.to_thread(self.get_expanded_skills, candidate_skills)
        
        gaps = []
        matched_count = 0
        
        # --- FUZZY SUBSTRING MATCHING ---
        for req_skill in required_skills:
            req_lower = req_skill.lower()
            match_found = False
            
            # Check if the required skill is a substring of the expanded skill, or vice versa
            for exp_skill in candidate_expanded_skills:
                if req_lower in exp_skill or exp_skill in req_lower:
                    match_found = True
                    break
                    
            if match_found:
                matched_count += 1
            else:
                gaps.append(req_skill)
                
        # --- HYBRID SCORING LOGIC ---
        
        # 1. Calculate the Graph Overlap Ratio (0.0 to 1.0)
        if len(required_skills) > 0:
            graph_ratio = matched_count / len(required_skills)
        else:
            graph_ratio = 0.0

        # 2. Calculate the Baseline SBERT Score
        base_semantic_score = 0.0
        if cv_raw and job_description:
            # SBERT encode is CPU intensive, run in thread
            cv_emb = await asyncio.to_thread(sbert_model.encode, [cv_raw])
            jd_emb = await asyncio.to_thread(sbert_model.encode, [job_description])
            base_semantic_score = float(cosine_similarity(cv_emb, jd_emb)[0][0])
            
        # 3. Calculate Final Weighted Hybrid Score (60% Baseline, 40% Graph Validation)
        final_score = round((base_semantic_score * 0.6) + (graph_ratio * 0.4), 4)
            
        implicit_skills = list(candidate_expanded_skills - set(s.lower() for s in candidate_skills))
        
        return {
            "skill_gaps": gaps,
            "skill_match_score": final_score,
            "implicit_skills": implicit_skills
        }

graph_agent_instance = GraphRAGAgent()

async def graph_rag_agent(candidate_profile: dict, job_description: str, cv_raw: str = None) -> dict:
    return await graph_agent_instance.run(candidate_profile, job_description, cv_raw)

# Standalone A2A function for orchestrator pattern wrapper
def get_graph_rag_agent():
    return graph_agent_instance