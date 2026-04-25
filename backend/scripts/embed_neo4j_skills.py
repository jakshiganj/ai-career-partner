import os
import sys
import asyncio
from neo4j import GraphDatabase

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.agents.gemini_client import gemini_client
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

def run_query(driver, query, parameters=None):
    with driver.session() as session:
        return session.run(query, parameters).data()

async def embed_skills():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    try:
        # Create Index first
        print("Creating Vector Index...")
        index_query = """
        CREATE VECTOR INDEX skill_embeddings IF NOT EXISTS
        FOR (s:Skill) ON (s.embedding)
        OPTIONS {indexConfig: {
            `vector.dimensions`: 768, 
            `vector.similarity_function`: 'cosine'
        }};
        """
        try:
            run_query(driver, index_query)
        except Exception as e:
            print(f"Note: Index creation failed or already exists: {e}")
            
        print("Fetching skills without embeddings...")
        fetch_query = """
        MATCH (s:Skill)
        WHERE s.embedding IS NULL
        RETURN s.uri as uri, s.name as name, s.description as description
        """
        skills = run_query(driver, fetch_query)
        print(f"Found {len(skills)} skills to embed.")
        
        batch_size = 50
        batch = []
        count = 0
        
        for skill in skills:
            # Combine name and description for better semantics
            text_to_embed = f"Skill: {skill['name']}\nDescription: {skill.get('description', 'No description available.')}"
            
            # Embed
            try:
                embedding = gemini_client.embed_content('text-embedding-004', text_to_embed)
                if not embedding or all(v == 0.0 for v in embedding):
                    print(f"Skipping {skill['name']} (Failed to get embedding)")
                    continue
                
                batch.append({
                    "uri": skill["uri"],
                    "embedding": embedding
                })
            except Exception as e:
                print(f"Error embedding {skill['name']}: {e}")
                
            if len(batch) >= batch_size:
                update_query = """
                UNWIND $rows AS row
                MATCH (s:Skill {uri: row.uri})
                SET s.embedding = row.embedding
                """
                run_query(driver, update_query, {"rows": batch})
                count += len(batch)
                print(f"Embedded and updated {count} / {len(skills)} skills...")
                batch = []
                
        # Final batch
        if batch:
            update_query = """
            UNWIND $rows AS row
            MATCH (s:Skill {uri: row.uri})
            SET s.embedding = row.embedding
            """
            run_query(driver, update_query, {"rows": batch})
            count += len(batch)
            print(f"Finished. Total updated: {count}")

    finally:
        driver.close()

if __name__ == "__main__":
    asyncio.run(embed_skills())
