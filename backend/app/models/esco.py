from sqlmodel import SQLModel, Field
from typing import Optional
from sqlalchemy import Column
import uuid
from pgvector.sqlalchemy import Vector

class EscoSkillBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None
    # skill type e.g. skill/competence, knowledge, transversal
    skill_type: str = Field(default="skill") 

class EscoSkill(EscoSkillBase, table=True):
    __tablename__ = "esco_skills"
    
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    # Gemini text-embedding-004 has 768 dimensions
    embedding: Optional[list[float]] = Field(default=None, sa_column=Column(Vector(768)))

class EscoRelationBase(SQLModel):
    source_skill_id: uuid.UUID = Field(foreign_key="esco_skills.id", index=True)
    target_skill_id: uuid.UUID = Field(foreign_key="esco_skills.id", index=True)
    relation_type: str = Field(index=True) # e.g., 'broader', 'narrower', 'transversal'

class EscoRelation(EscoRelationBase, table=True):
    __tablename__ = "esco_relations"
    
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
