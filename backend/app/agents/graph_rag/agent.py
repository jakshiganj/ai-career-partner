from neo4j import GraphDatabase
import os

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

class GraphRAGAgent:
    def __init__(self):
        self.driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    def close(self):
        self.driver.close()

    def get_related_skills(self, skills: list) -> dict:
        """
        Queries Neo4j to find skills related to the input list.
        Uses ESCO ontology logic (Skills related to Skills).
        """
        related_skills = set()
        
        try:
            with self.driver.session() as session:
                for skill in skills:
                    # Simple query to find skills that commonly appear with this skill
                    # Assuming node label :Skill and relationship :RELATED_TO
                    query = """
                    MATCH (s:Skill {name: $skill})-[:RELATED_TO]-(r:Skill)
                    RETURN r.name AS related_skill
                    LIMIT 5
                    """
                    try:
                        result = session.run(query, skill=skill)
                        for record in result:
                            related_skills.add(record["related_skill"])
                    except Exception:
                        pass
        except Exception as e:
            print(f"Warning: Neo4j not reachable. Using fallback data. (Error: {str(e)[:50]}...)")
            # Fallback if DB is completely down
            if "python" in [s.lower() for s in skills]:
                related_skills.update(["Django", "FastAPI", "Pandas"])
            if "react" in [s.lower() for s in skills]:
                related_skills.update(["Redux", "TypeScript", "Node.js"])

        return {
            "input_skills": skills,
            "related_skills": list(related_skills),
            "learning_path": "Recommended: Master core language first, then framework."
        }

# Singleton instance
graph_agent = GraphRAGAgent()

def graph_rag_agent(current_skills: list) -> dict:
    return graph_agent.get_related_skills(current_skills)
