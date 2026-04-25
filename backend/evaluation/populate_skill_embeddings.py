import os
import asyncio
import sys
from typing import List

# Setup sys path so we can import from app
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from neo4j import GraphDatabase
from app.agents.gemini_client import gemini_client

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

async def populate_embeddings():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    # 1. Fetch skills without embeddings
    with driver.session() as session:
        res = session.run("MATCH (s:Skill) WHERE s.embedding IS NULL RETURN s.name as name")
        skill_names = [record["name"] for record in res]
    
    if not skill_names:
        print("No skills found without embeddings.")
        driver.close()
        return

    print(f"Found {len(skill_names)} skills to embed.")
    
    batch_size = 100
    for i in range(0, len(skill_names), batch_size):
        batch = skill_names[i:i + batch_size]
        print(f"Processing batch {i//batch_size + 1}/{(len(skill_names)-1)//batch_size + 1} ({len(batch)} skills)...")
        
        try:
            embeddings = gemini_client.embed_content_batch('text-embedding-004', batch)
            
            # Update Neo4j
            with driver.session() as session:
                session.run("""
                    UNWIND $data AS item
                    MATCH (s:Skill {name: item.name})
                    SET s.embedding = item.embedding
                """, data=[{"name": n, "embedding": e} for n, e in zip(batch, embeddings)])
                
        except Exception as e:
            print(f"Error processing batch: {e}")
            
    print("Finished populating embeddings.")
    driver.close()

if __name__ == "__main__":
    asyncio.run(populate_embeddings())
