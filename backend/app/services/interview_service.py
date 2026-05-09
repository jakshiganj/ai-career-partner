"""
Interview service — post-session scoring and report formatting.
Extracted from the interview router for testability.
"""
from datetime import datetime
from sqlmodel.ext.asyncio.session import AsyncSession
from app.models.interview_roadmap import InterviewSession
from app.agents.interview_scorer_agent import InterviewScorerAgent


async def score_and_save_interview(
    db: AsyncSession, 
    user_id, 
    pipeline_id, 
    transcript: list[dict], 
    target_role: str
):
    """
    Score a completed interview session and persist the result.
    Requires at least 2 transcript turns to be worth scoring.
    """
    if len(transcript) < 2:
        print(f"Skipping scoring — only {len(transcript)} turns.")
        return

    scorer = InterviewScorerAgent()
    score_data = await scorer.run(transcript, target_role)
    
    if 'error' in score_data:
        print("Error scoring interview:", score_data.get('error'))
        return

    scores = score_data.get('scores', {})
    overall = score_data.get('overall_score', 0)
    
    db_session = InterviewSession(
        user_id=user_id,
        pipeline_id=pipeline_id,
        answers={
            "history": transcript, 
            "feedback": score_data.get("constructive_feedback"),
            "tips": score_data.get("tips", {})
        },
        scores=scores,
        overall_score=overall,
        completed_at=datetime.utcnow()
    )
    db.add(db_session)
    await db.commit()
    print("Successfully configured and saved native audio interview score.")


def format_interview_report(session: InterviewSession) -> dict:
    """Format an InterviewSession DB row into the API report response."""
    return {
        "overall_score": session.overall_score,
        "relevance": session.scores.get("relevance", 0),
        "clarity": session.scores.get("clarity", 0),
        "depth": session.scores.get("depth", 0),
        "star_compliance": session.scores.get("star_compliance", 0),
        "feedback": session.answers.get("feedback", "No feedback available"),
        "tips": session.answers.get("tips", {}),
        "transcript": "\n".join([
            f"{msg['role'].upper()}: {msg['content']}" 
            for msg in session.answers.get('history', [])
        ])
    }
