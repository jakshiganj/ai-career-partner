from langgraph.graph import StateGraph, END
from app.graph.state import AgentState
from app.agents.cv_critique.agent import analyze_cv_with_gemini
from app.agents.cv_creator.agent import cv_creator_agent
from app.agents.market_trends.agent import market_trends_agent
from app.agents.interview_prep.agent import interview_prep_agent
from app.agents.graph_rag.agent import graph_rag_agent

def cv_critic_node(state: AgentState):
    cv_text = state['candidate_profile'].get('raw_cv', '')
    critique = analyze_cv_with_gemini(cv_text)
    # Update the state with the full critique for other nodes to use
    return {"critique": critique, "messages": [f"CV Score: {critique.get('score')}"]}

def graph_rag_node(state: AgentState):
    skills = state['candidate_profile'].get('skills', [])
    insights = graph_rag_agent(skills)
    return {"messages": [f"Suggested Skills: {insights.get('related_skills')}"]}

def market_trends_node(state: AgentState):
    skills = state['candidate_profile'].get('skills', [])
    trends = market_trends_agent(skills)
    return {"messages": [f"Market Trends: {trends.get('market_analysis')}"]}

def cv_creator_node(state: AgentState):
    # This would typically use the critique from the state, simpler for now
    return {"messages": ["CV Creator: Generating CV..."]}

def build_graph():
    workflow = StateGraph(AgentState)

    # Add Nodes
    workflow.add_node("cv_critic", cv_critic_node)
    workflow.add_node("graph_rag", graph_rag_node)
    workflow.add_node("market_trends", market_trends_node)
    workflow.add_node("cv_creator", cv_creator_node)

    # Define Edges
    workflow.set_entry_point("cv_critic")
    
    # Parallelize market research and skill analysis after critique
    workflow.add_edge("cv_critic", "graph_rag")
    workflow.add_edge("cv_critic", "market_trends")
    
    # Converge on Creator
    workflow.add_edge("graph_rag", "cv_creator")
    workflow.add_edge("market_trends", "cv_creator")
    
    workflow.add_edge("cv_creator", END)

    return workflow.compile()

app_graph = build_graph()
