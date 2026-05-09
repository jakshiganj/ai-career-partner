Project Development Plan: AI Partner for Career Development
1. Project Overview

Goal: A Multi-Agent System (MAS) for personalized job seeking, specifically for final-year undergraduates and interns.


Core Objective: Bridge the "skills gap" by providing a stateful "co-pilot" for CV optimization and interview coaching.

2. System Architecture & Orchestration

Orchestrator: Google Agent Development Kit (ADK) using Python SDK.


State Management: Use LangGraph to maintain context across fragmented tasks and the ADK Interactions API for session state.

Agent Mesh:


CV Critic Agent: Provides text-based analysis and critique.


CV Creator Agent: Handles CV generation and optimization.


Market Trend Agent: Scrapes local Sri Lankan job portals (e.g., topjobs.lk) for real-time data.


Interview Prop Agent: Uses Gemini 2.5 Flash Native Audio for real-time, speech-to-speech mock interviews.


GraphRAG Agent: Uses Neo4j and ESCO v1.1 ontology for skill reasoning (e.g., inferring "JavaScript" from "React").

3. Technology Stack 


Frontend: Next.js.


Backend Orchestration: Google ADK, LangGraph.


Database: Supabase (Persistent Candidate State) and Neo4j (Knowledge Graph).


Models: Gemini 2.5 Flash (Audio/Text) and Sentence-BERT (all-MiniLM-L6-v2) for vector similarity.


Communication: Agent-to-Agent (A2A) protocol.


Security: Client-side PII redaction using Transformers.js.

4. Key Functional Deliverables 


ADK Orchestrator: Manage SequentialAgent and RouterAgent workflows.


A2A Layer: Implement on_message_send for structured task handoffs between agents.


GraphRAG Engine: Implement skill trees to improve "Semantic Match Score" by 25%.


Native Audio Coach: Ensure WebSocket-based audio latency is under 500ms.

5. Security & Privacy 


Zero Trust for Agents: Use Short-Lived JWT Tokens and Machine-to-Machine (M2M) authentication.


PII Redaction: Ensure all sensitive data (names, emails) is stripped locally before cloud processing.