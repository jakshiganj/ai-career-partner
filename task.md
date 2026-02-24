# Project: AI Career Partner - Orchestration Phase
**Current Status**: Specialist agents (Gemini API) and SQLModel/SQLAlchemy schemas are defined.
**Objective**: Integrate existing components into a unified, stateful multi-agent pipeline with autonomous decision-making and human-in-the-loop triggers.

## 1. Integration Goals
- **Stateful Handoff**: Connect the existing agents via a centralized 'TaskState' managed in PostgreSQL.
- **Autonomous Orchestration**: Implement a Supervisor Agent using Google ADK to route tasks between the CV Agent and Market Analyst.
- **Decision Engine**: Enable the Supervisor to detect "Missing Data" based on existing Pydantic schemas and pause execution for user input.

## 2. Technical Requirements
- **Unified Schema**: Use existing SQLAlchemy models to create a `MissionControl` table that tracks agent status (Idle, Working, Paused, Success).
- **Agent IAM**: Implement a manual JWT middleware that verifies if Agent A has permission to request data from Agent B (Zero Trust).
- **Real-time Communication**: Set up FastAPI WebSockets to alert the React frontend when an agent moves to a `PAUSED` state due to missing info.

## 3. Tasks for the Agentic IDE
1. **Analyze Existing Code**: Scan `/backend/agents` and `/backend/models` to map out current capabilities.
2. **Implement Router**: Build a `main_orchestrator.py` that utilizes Google ADK's `RouterAgent` to coordinate the existing specialist agents.
3. **Handle Interruptions**: Write logic that intercepts agent outputs; if the output matches a "MissingInfo" pattern, update the DB state and broadcast a WebSocket message.
4. **Security Layer**: Wrap existing API endpoints with a custom `AgentAccess` dependency to enforce internal IAM.
5. **Frontend Bridge**: Generate a React hook (`useAgentPipeline`) to subscribe to real-time status updates from the backend.

## 4. Quality Benchmarks
- **Persistence**: Pipeline must be able to resume 24 hours later from the exact point of interruption.
- **Performance**: Internal agent handoffs must occur in <100ms.
- **Auditability**: Every decision made by the Supervisor must be logged in a `decision_audit` table.

# Project: AI Career Development Partner (Multi-Agent System)
**Goal**: Build a stateful, multi-agent career platform using FastAPI and React that autonomously manages CV optimization and career roadmapping, with human-in-the-loop triggers for missing data.

## 1. Core Technical Stack
- **Backend**: FastAPI (Python 3.12+)
- **Frontend**: React (Vite)
- **Database**: PostgreSQL (Manual Setup via SQLAlchemy/SQLModel)
- **AI Framework**: Google ADK (Agent Development Kit) & Gemini 2.5 Flash
- **Orchestration**: A2A Protocol for multi-agent handoffs

## 2. System Architecture Requirements
### A. Agentic Orchestrator (The Supervisor)
- Implement a `SupervisorAgent` using Google ADK to manage the "one-pipeline" flow.
- The supervisor must analyze the user goal and delegate to specialized sub-agents.
- **Decision Logic**: If a required field (defined in Pydantic schemas) is missing, the agent must return a `STATUS: INPUT_REQUIRED` and pause the execution.

### B. Specialized Agents
- **CV Specialist**: Analyzes text/PDFs, extracts skills, and generates a "Gap Analysis" based on the ESCO ontology.
- **Market Analyst**: Fetches live industry trends to map skills to current demand.
- **Audio Coach**: Implements a WebSocket-based real-time interview coach using Gemini 2.5 Flash Native Audio (Target Latency: <500ms).

### C. Manual Infrastructure & Security
- **Identity (Agent IAM)**: Build a custom JWT-based middleware to enforce "Zero Trust" between agents.
- **State Management**: Use SQLAlchemy to store the `TaskState` in PostgreSQL, allowing for long-running sessions that persist across "Human-in-the-loop" interruptions.

## 3. Implementation Steps for Antigravity
1. **Scaffold Project**: Create a `/backend` (FastAPI) and `/frontend` (React) directory structure.
2. **Database Setup**: Generate SQLAlchemy models for `User`, `CV`, and `TaskState`.
3. **Agent Integration**: Wrap existing Gemini agents into ADK `LlmAgent` classes.
4. **WebSocket Implementation**: Build the real-time audio stream bridge for the Interview Coach.
5. **Testing**: Use the Antigravity Browser Agent to verify the "Missing Info" interruption flow.

## 4. Quality Criteria
- **Zero-Latency Feel**: Ensure all agent communication is asynchronous.
- **Safety**: Implement client-side PII redaction using Transformers.js before data reaches the backend.