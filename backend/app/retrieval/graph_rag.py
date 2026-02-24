from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.agents.gemini_client import gemini_client

async def fetch_skill_context(query: str, session: AsyncSession, limit: int = 3) -> str:
    """
    Execute a Hybrid GraphRAG pipeline for a given skill query:
    1. Hybrid Search (Vector + FTS via RRF) to find base ESCO skills matching the query.
    2. Graph Expansion (CTE) to fetch their relational context.
    Returns a formatted string representing the knowledge graph context.
    """
    
    # 1. Generate Query Vector
    query_vector = gemini_client.embed_content('text-embedding-004', query)
    
    # 2. Hybrid Search Query with Reciprocal Rank Fusion
    hybrid_query = text("""
        WITH vector_search AS (
            SELECT id, name, description, skill_type,
                   ROW_NUMBER() OVER (ORDER BY embedding <-> :vector) as rank_vector
            FROM esco_skills
            ORDER BY embedding <-> :vector
            LIMIT 20
        ),
        keyword_search AS (
            SELECT id, name, description, skill_type,
                   ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', name || ' ' || coalesce(description, '')), plainto_tsquery('english', :query)) DESC) as rank_keyword
            FROM esco_skills
            WHERE to_tsvector('english', name || ' ' || coalesce(description, '')) @@ plainto_tsquery('english', :query)
            LIMIT 20
        ),
        rrf AS (
            SELECT 
                COALESCE(v.id, k.id) as id,
                COALESCE(v.name, k.name) as name,
                COALESCE(v.description, k.description) as description,
                COALESCE(v.skill_type, k.skill_type) as skill_type,
                -- 60 is standard RRF constant factor
                COALESCE(1.0 / (60 + v.rank_vector), 0.0) + 
                COALESCE(1.0 / (60 + k.rank_keyword), 0.0) as rrf_score 
            FROM vector_search v
            FULL OUTER JOIN keyword_search k ON v.id = k.id
        )
        SELECT id, name, description, skill_type
        FROM rrf
        ORDER BY rrf_score DESC
        LIMIT :limit;
    """)
    
    # pgvector expects vectors passed as strings dynamically in parameterized queries like '[0.1, 0.2, ...]'
    result = await session.execute(hybrid_query, {"vector": str(query_vector), "query": query, "limit": limit})
    base_skills = result.fetchall()
    
    if not base_skills:
        return f"No ESCO skills matched the query: '{query}'."

    # 3. Graph Expansion via CTE
    # Find relationships up to a depth of 2 edges connected to our base seed skills
    skill_ids = [s.id for s in base_skills]
    
    # Provide a dummy list [-1] if empty to prevent syntax errors (won't happen here due to the check above, but good practice)
    if not skill_ids:
        skill_ids = [-1]

    cte_query = text("""
        WITH RECURSIVE skill_relations AS (
            -- Base case: Direct connections
            SELECT 
                er.source_skill_id, 
                er.target_skill_id, 
                er.relation_type,
                1 as depth
            FROM esco_relations er
            WHERE er.source_skill_id = ANY(:skill_ids) OR er.target_skill_id = ANY(:skill_ids)
            
            UNION
            
            -- Recursive step: Connections from the discovered nodes, up to depth 2
            SELECT 
                er.source_skill_id, 
                er.target_skill_id, 
                er.relation_type,
                sr.depth + 1
            FROM esco_relations er
            INNER JOIN skill_relations sr 
                ON er.source_skill_id = sr.target_skill_id OR er.target_skill_id = sr.source_skill_id
            WHERE sr.depth < 2
        )
        SELECT DISTINCT
            sr.relation_type,
            ss.name as source_name,
            ts.name as target_name
        FROM skill_relations sr
        JOIN esco_skills ss ON sr.source_skill_id = ss.id
        JOIN esco_skills ts ON sr.target_skill_id = ts.id;
    """)
    
    relations_result = await session.execute(cte_query, {"skill_ids": skill_ids})
    relations = relations_result.fetchall()
    
    # 4. Format Output for the Agent Prompt
    context_lines = []
    context_lines.append(f"Query: '{query}'")
    context_lines.append("Matched ESCO Base Skills:")
    for skill in base_skills:
        description_snippet = skill.description[:150] + "..." if skill.description else "No description available"
        context_lines.append(f" - {skill.name} ({skill.skill_type}): {description_snippet}")
        
    context_lines.append("Knowledge Graph Context (Broader / Narrower / Transversal):")
    if relations:
        for rel in relations:
            context_lines.append(f" - {rel.source_name} is '{rel.relation_type}' related to {rel.target_name}")
    else:
        context_lines.append(" - No further relationships found in graph.")
        
    return "\n".join(context_lines)
