import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

def seed_db():
    print(f"Connecting to Neo4j at {NEO4J_URI}...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    try:
        # Verify connection
        driver.verify_connectivity()
        
        with driver.session() as session:
            # Clear existing Skill nodes to avoid duplicates on re-run
            session.run("MATCH (n:Skill) DETACH DELETE n")
            print("Cleared existing Skill nodes.")
            
            # Create skills and relationships
            query = """
            // Core Languages
            CREATE (python:Skill {name: 'Python'})
            CREATE (js:Skill {name: 'JavaScript'})
            CREATE (ts:Skill {name: 'TypeScript'})
            CREATE (java:Skill {name: 'Java'})
            CREATE (csharp:Skill {name: 'C#'})
            CREATE (sql:Skill {name: 'SQL'})

            // Frameworks & Libraries
            CREATE (react:Skill {name: 'React'})
            CREATE (nextjs:Skill {name: 'Next.js'})
            CREATE (node:Skill {name: 'Node.js'})
            CREATE (django:Skill {name: 'Django'})
            CREATE (fastapi:Skill {name: 'FastAPI'})
            CREATE (spring:Skill {name: 'Spring Boot'})

            // Tools / Data
            CREATE (docker:Skill {name: 'Docker'})
            CREATE (k8s:Skill {name: 'Kubernetes'})
            CREATE (aws:Skill {name: 'AWS'})
            CREATE (git:Skill {name: 'Git'})
            CREATE (neo4j:Skill {name: 'Neo4j'})
            CREATE (postgres:Skill {name: 'PostgreSQL'})

            // Relationships
            CREATE (react)-[:RELATED_TO]->(js)
            CREATE (react)-[:RELATED_TO]->(ts)
            CREATE (nextjs)-[:IMPLIES]->(react)
            CREATE (node)-[:RELATED_TO]->(js)
            CREATE (django)-[:IMPLIES]->(python)
            CREATE (fastapi)-[:IMPLIES]->(python)
            CREATE (spring)-[:IMPLIES]->(java)
            CREATE (k8s)-[:RELATED_TO]->(docker)
            CREATE (postgres)-[:RELATED_TO]->(sql)
            CREATE (ts)-[:IMPLIES]->(js)
            """
            session.run(query)
            print("Successfully seeded Neo4j with IT skills taxonomy.")
            
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        driver.close()

if __name__ == "__main__":
    seed_db()
