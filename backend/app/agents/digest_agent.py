from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.models.pipeline import PipelineRun
from app.models.user import User
from app.models.preference import UserPreference
from app.services.email_service import send_digest_email

class DigestAgent:
    """
    Agent responsible for compiling a weekly summary of career progress and sending an email.
    """
    
    async def run(self, user_id: str, session: AsyncSession) -> dict:
        """
        Compiles the weekly report for a given user.
        Format an email and send it via Resend API.
        """
        # 1. Check Preferences and User
        pref = await session.get(UserPreference, user_id)
        if not pref or not pref.email_digest_enabled:
            return {"status": "skipped", "reason": "User opted out or no preferences"}
            
        user = await session.get(User, user_id)
        if not user or not user.email:
             return {"status": "skipped", "reason": "User email not found"}
        
        # 2. Compile metrics
        # Fetch runs from the last 7 days (simplified query for now)
        runs_query = select(PipelineRun).where(PipelineRun.user_id == user_id)
        result = await session.execute(runs_query)
        runs = result.scalars().all()
        
        matches = []
        for r in runs:
            if isinstance(r.state_json, dict) and "job_matches" in r.state_json: 
                matches.extend(r.state_json["job_matches"])
                
        # 3. Formulate digest
        digest_data = {
            "pipelines_run": len(runs),
            "new_job_matches": len(matches),
            "hot_skill_to_learn": pref.target_role + " fundamentals" if pref.target_role else "Target Role fundamentals",
            "target_role": pref.target_role if pref.target_role else "Target Role",
        }
        
        subject = f"Your Weekly Career Insights for {digest_data['target_role']}"
        
        # 4. Send email
        success = await send_digest_email(user.email, subject, digest_data)
        
        if success:
            return {"status": "sent", "to": user.email, "metrics": digest_data}
        else:
            return {"status": "failed", "to": user.email, "reason": "Resend API call failed. Check API key."}
