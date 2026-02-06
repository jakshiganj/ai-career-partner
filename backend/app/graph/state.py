from typing import TypedDict, Annotated, List, Dict, Any
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    """
    Main state for the AI Career Partner system.
    """
    messages: Annotated[List[Any], add_messages]
    candidate_profile: Dict[str, Any]
    current_task: str
    skills_gap: List[str]
    job_market_data: Dict[str, Any]
