from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.models.pipeline import PipelineRun
from app.models.user import User
from app.models.preference import UserPreference

class DigestAgent:
    """
    Agent responsible for compiling a weekly summary of career progress and sending an email.
    """
    
    async def run(self, user_id: str, session: AsyncSession) -> dict:
        """
        Compiles the weekly report for a given user.
        In a real scenario, this would format an email and send it via Resend API.
        """
        # 1. Check Preferences
        pref = await session.get(UserPreference, user_id)
        if not pref or not pref.email_digest_enabled:
            return {"status": "skipped", "reason": "User opted out"}
            
        # 2. Compile metrics
        # Fetch runs from the last 7 days (simplified query for now)
        runs_query = select(PipelineRun).where(PipelineRun.user_id == user_id)
        result = await session.execute(runs_query)
        runs = result.scalars().all()
        
        matches = []
        for r in runs:
            if "job_matches" in r.state_json: # Assuming pipeline starts saving job matches in state
                matches.extend(r.state_json["job_matches"])
                
        # 3. Formulate digest
        digest = {
            "status": "sent",
            "to": "user@example.com", # Would join with User table for actual email
            "subject": f"Your Weekly Career Insights for {pref.target_role}",
            "body": {
                "pipelines_run": len(runs),
                "new_job_matches": len(matches),
                "hot_skill_to_learn": pref.target_role + " fundamentals", # naive placeholder
                "tone": pref.preferred_tone
            }
        }
        
        # In actual implementation: send_email_via_resend(digest)
        return digest
