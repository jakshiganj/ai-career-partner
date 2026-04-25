import os
from neo4j import GraphDatabase

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

def create_index():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session() as session:
        # Check if index exists first
        res = session.run("SHOW INDEXES WHERE name = 'skill_embeddings'")
        if not res.peek():
            print("Creating index...")
            session.run("""
                CREATE VECTOR INDEX skill_embeddings
                FOR (n:Skill) ON (n.embedding)
                OPTIONS {indexConfig: {
                 `vector.dimensions`: 768,
                 `vector.similarity_function`: 'cosine'
                }}
            """)
            print("Index created.")
        else:
            print("Index already exists.")
    driver.close()

if __name__ == "__main__":
    create_index()
