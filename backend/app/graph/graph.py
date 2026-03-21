from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from app.graph.state import AgentState
from app.graph.nodes import (
    ingest_node,
    analyse_node,
    optimise_node,
    classify_node,
    roadmap_node,
    interview_prep_node,
    persist_node,
    route_after_ingest,
    route_after_classify,
)

def build_graph(checkpointer=None):
    workflow = StateGraph(AgentState)

    # Register all nodes
    workflow.add_node("ingest",         ingest_node)
    workflow.add_node("analyse",        analyse_node)
    workflow.add_node("optimise",       optimise_node)
    workflow.add_node("classify",       classify_node)
    workflow.add_node("roadmap",        roadmap_node)
    workflow.add_node("interview_prep", interview_prep_node)
    workflow.add_node("persist",        persist_node)

    # Entry point
    workflow.set_entry_point("ingest")

    # Edges with conditional routing
    workflow.add_conditional_edges(
        "ingest",
        route_after_ingest,
        {"analyse": "analyse", END: END}
    )
    workflow.add_edge("analyse",        "optimise")
    workflow.add_edge("optimise",       "classify")
    workflow.add_conditional_edges(
        "classify",
        route_after_classify,
        {"roadmap": "roadmap", "interview_prep": "interview_prep"}
    )
    workflow.add_edge("roadmap",        "interview_prep")
    workflow.add_edge("interview_prep", "persist")
    workflow.add_edge("persist",        END)

    return workflow.compile(checkpointer=checkpointer)
