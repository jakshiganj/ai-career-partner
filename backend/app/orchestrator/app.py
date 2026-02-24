"""
Supervisor Orchestrator — Routes user goals through the specialist agent pipeline.

Flow:
  1. Receive a goal + TaskState from the API layer
  2. Run CV Critic → Market Analyst → GraphRAG sequentially
  3. After each step, detect INPUT_REQUIRED patterns
  4. On INPUT_REQUIRED: set TaskState.status = Paused, log to DecisionAudit
  5. On success: set TaskState.status = Success

The ConnectionManager is imported here so the Supervisor can broadcast
WebSocket events to connected frontend clients.
"""
import json
import asyncio
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.task_state import TaskState, TaskStatus, DecisionAudit
from app.agents.cv_critique.agent import analyze_cv_with_gemini
from app.agents.market_trends.agent import market_trends_agent
from app.agents.graph_rag.agent import graph_rag_agent


# ─── Patterns that signal the agent needs more info ──────────────────────────
MISSING_INFO_KEYWORDS = [
    "missing", "not provided", "required", "please provide",
    "insufficient", "incomplete", "input required", "need more",
]


def _detect_input_required(text: str) -> tuple[bool, list[str]]:
    """Return (is_paused, list_of_missing_fields) by scanning agent output."""
    text_lower = text.lower()
    triggered = [kw for kw in MISSING_INFO_KEYWORDS if kw in text_lower]
    return bool(triggered), triggered


async def _log_decision(
    session: AsyncSession,
    task_state_id: int,
    agent_name: str,
    decision: str,
    reasoning: Optional[str] = None,
):
    audit = DecisionAudit(
        task_state_id=task_state_id,
        agent_name=agent_name,
        decision=decision,
        reasoning=reasoning,
        timestamp=datetime.utcnow(),
    )
    session.add(audit)
    await session.commit()


class SupervisorAgent:
    """
    Orchestrates the multi-agent pipeline for a single user session.
    """

    def __init__(self, task_state: TaskState, session: AsyncSession, ws_manager=None):
        self.task_state = task_state
        self.session = session
        self.ws_manager = ws_manager  # Optional ConnectionManager for WebSocket broadcast

    async def _update_state(self, status: TaskStatus, current_agent: str, context: dict):
        self.task_state.status = status
        self.task_state.current_agent = current_agent
        self.task_state.context_json = json.dumps(context)
        self.task_state.updated_at = datetime.utcnow()
        self.session.add(self.task_state)
        await self.session.commit()

        # Broadcast to WebSocket clients if a manager is attached
        if self.ws_manager:
            message = {
                "type": "STATE_UPDATE",
                "task_state_id": self.task_state.id,
                "status": status.value,
                "current_agent": current_agent,
            }
            if status == TaskStatus.paused:
                message["type"] = "PAUSED"
                message["missing_fields"] = self.task_state.missing_fields or ""
            await self.ws_manager.broadcast(
                self.task_state.user_id, json.dumps(message)
            )

    async def run(self, goal: str, cv_text: str, skills: list[str]) -> dict:
        """
        Execute the full pipeline. Returns a summary dict with results.
        Raises no exceptions — failures are captured in TaskState.
        """
        context = {"goal": goal, "cv_preview": cv_text[:200]}

        # ── Step 1: CV Critique ───────────────────────────────────────────────
        await self._update_state(TaskStatus.working, "cv_critic", context)
        await _log_decision(
            self.session, self.task_state.id, "supervisor",
            "ROUTE_TO_CV_CRITIC", f"Goal: {goal}"
        )

        try:
            cv_result = await analyze_cv_with_gemini(cv_text, self.session)
            is_paused, missing = _detect_input_required(str(cv_result))
            await _log_decision(
                self.session, self.task_state.id, "cv_critic",
                "PAUSED" if is_paused else "SUCCESS", str(cv_result)[:500]
            )
            if is_paused:
                self.task_state.missing_fields = ", ".join(missing)
                await self._update_state(TaskStatus.paused, "cv_critic", context)
                return {"status": "PAUSED", "agent": "cv_critic", "missing": missing}

            context["cv_critique"] = cv_result
        except Exception as e:
            await _log_decision(self.session, self.task_state.id, "cv_critic", "ERROR", str(e))
            context["cv_critique_error"] = str(e)

        # ── Step 2: Market Trends ─────────────────────────────────────────────
        await self._update_state(TaskStatus.working, "market_analyst", context)
        await _log_decision(
            self.session, self.task_state.id, "supervisor",
            "ROUTE_TO_MARKET_ANALYST", f"Skills: {skills}"
        )

        try:
            market_result = await asyncio.get_event_loop().run_in_executor(
                None, market_trends_agent, skills
            )
            context["market_analysis"] = market_result
            await _log_decision(
                self.session, self.task_state.id, "market_analyst",
                "SUCCESS", f"Hot skills: {market_result.get('hot_skills', [])}"
            )
        except Exception as e:
            await _log_decision(self.session, self.task_state.id, "market_analyst", "ERROR", str(e))
            context["market_error"] = str(e)

        # ── Step 3: GraphRAG Skill Reasoning ──────────────────────────────────
        await self._update_state(TaskStatus.working, "graph_rag", context)
        await _log_decision(
            self.session, self.task_state.id, "supervisor",
            "ROUTE_TO_GRAPH_RAG", f"Enriching skills: {skills}"
        )

        try:
            graph_result = await asyncio.get_event_loop().run_in_executor(
                None, graph_rag_agent, skills
            )
            context["graph_rag"] = graph_result
            await _log_decision(
                self.session, self.task_state.id, "graph_rag", "SUCCESS", str(graph_result)[:300]
            )
        except Exception as e:
            await _log_decision(self.session, self.task_state.id, "graph_rag", "ERROR", str(e))
            context["graph_rag_error"] = str(e)

        # ── Pipeline Complete ─────────────────────────────────────────────────
        await self._update_state(TaskStatus.success, "supervisor", context)
        await _log_decision(
            self.session, self.task_state.id, "supervisor",
            "PIPELINE_COMPLETE", "All agents finished successfully."
        )

        return {"status": "SUCCESS", "context": context}
