import os
import csv
import json
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password123")

ESCO_DIR = os.path.join(os.getcwd(), "esco")

def run_query(driver, query, parameters=None):
    with driver.session() as session:
        session.run(query, parameters)

def batch_import(driver, csv_file, query, batch_size=1000):
    path = os.path.join(ESCO_DIR, csv_file)
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    print(f"Starting import from {csv_file}...")
    with open(path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        batch = []
        count = 0
        for row in reader:
            batch.append(row)
            if len(batch) >= batch_size:
                run_query(driver, query, {"rows": batch})
                count += len(batch)
                print(f"Imported {count} rows from {csv_file}...")
                batch = []
        if batch:
            run_query(driver, query, {"rows": batch})
            count += len(batch)
            print(f"Finished {csv_file}. Total: {count}")

def import_esco():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    try:
        # Constraints
        print("Ensuring constraints...")
        run_query(driver, "CREATE CONSTRAINT skill_uri IF NOT EXISTS FOR (s:Skill) REQUIRE s.uri IS UNIQUE")
        run_query(driver, "CREATE CONSTRAINT occ_uri IF NOT EXISTS FOR (o:Occupation) REQUIRE o.uri IS UNIQUE")

        # 1. Skills
        skill_query = """
        UNWIND $rows AS row
        MERGE (s:Skill {uri: row.conceptUri})
        SET s.name = row.preferredLabel,
            s.type = row.skillType,
            s.reuseLevel = row.reuseLevel,
            s.description = row.description
        """
        batch_import(driver, "skills_en.csv", skill_query)

        # 2. Occupations
        occ_query = """
        UNWIND $rows AS row
        MERGE (o:Occupation {uri: row.conceptUri})
        SET o.name = row.preferredLabel,
            o.code = row.iscoGroup,
            o.description = row.description
        """
        batch_import(driver, "occupations_en.csv", occ_query)

        # 3. Skill-Skill Relations
        ss_query = """
        UNWIND $rows AS row
        MATCH (s1:Skill {uri: row.skillUri})
        MATCH (s2:Skill {uri: row.relatedSkillUri})
        MERGE (s1)-[:RELATED_TO {type: row.relationshipType}]->(s2)
        """
        batch_import(driver, "skillSkillRelations_en.csv", ss_query)

        # 4. Occupation-Skill Relations
        os_query = """
        UNWIND $rows AS row
        MATCH (o:Occupation {uri: row.occupationUri})
        MATCH (s:Skill {uri: row.skillUri})
        MERGE (o)-[:REQUIRES {type: row.relationType}]->(s)
        """
        batch_import(driver, "occupationSkillRelations_en.csv", os_query)

        print("\nESCO Import Complete!")

    except Exception as e:
        print(f"Critical Error: {e}")
    finally:
        driver.close()

if __name__ == "__main__":
    import_esco()
