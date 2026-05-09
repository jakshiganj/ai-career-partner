"""
Dashboard business logic — separated from router for testability.

Contains:
  - build_job_cards_from_market: Transforms pipeline market_analysis → frontend JobCard dicts
  - build_job_cards_from_db: Converts persisted JobMatch rows → frontend-compatible cards
  - assemble_dashboard_data: Builds the full dashboard response payload
"""
import hashlib
from app.models.job_market import JobMatch


def build_job_cards_from_market(state_json: dict) -> list[dict]:
    """
    Transforms the market_analysis data from the pipeline into JobCard-shaped dicts.
    """
    market_data = state_json.get("market_analysis", {})
    if not market_data:
        return []

    analysis = market_data.get("market_analysis", {})
    user_skills_lower = [s.lower() for s in state_json.get("skills", [])]
    missing_skills = state_json.get("missing_skills", [])

    cards = []
    seen_titles = set()

    for skill, info in analysis.items():
        if not isinstance(info, dict):
            continue
        status = info.get("status", "")
        snippets = info.get("snippets", [])

        for snippet in snippets:
            parts = snippet.split(" at ", 1)
            if len(parts) == 2:
                title = parts[0].strip()
                company = parts[1].strip()
            else:
                title = snippet.strip()
                company = "Sri Lanka"

            title_key = title.lower()
            if title_key in seen_titles:
                continue
            seen_titles.add(title_key)

            title_lower = title.lower()
            matched_count = sum(1 for s in user_skills_lower if s in title_lower)
            base_score = min(0.95, 0.3 + (matched_count * 0.15))

            if "active hiring" in status.lower() or "high demand" in status.lower():
                base_score = min(0.95, base_score + 0.1)

            if base_score >= 0.7:
                tier = "Realistic"
            elif base_score >= 0.45:
                tier = "Stretch"
            else:
                tier = "Reach"

            card_id = hashlib.md5(f"{title}|{company}".encode()).hexdigest()[:10]

            cards.append({
                "id": card_id,
                "title": title,
                "company": company,
                "match_score": round(base_score, 2),
                "tier": tier,
                "missing_skills": missing_skills[:6] if tier != "Realistic" else [],
                "market_status": status,
                "source_skill": skill,
            })

    tier_order = {"Realistic": 0, "Stretch": 1, "Reach": 2}
    cards.sort(key=lambda c: (tier_order.get(c["tier"], 3), -c["match_score"]))

    return cards


def build_job_cards_from_db(db_matches: list[JobMatch]) -> list[dict]:
    """Convert persisted JobMatch rows into frontend-compatible cards."""
    cards = []
    for jm in db_matches:
        cards.append({
            "id": str(jm.id)[:10],
            "title": jm.job_title or "Unknown Role",
            "company": jm.company or "—",
            "match_score": jm.match_score or 0,
            "tier": jm.tier or "Stretch",
            "missing_skills": jm.missing_skills or [],
            "salary_min": jm.salary_min,
            "salary_max": jm.salary_max,
            "url": jm.job_url,
        })
    return cards


def assemble_dashboard_data(
    latest_run, latest_cv, latest_interview, all_interviews,
    db_job_matches, db_roadmap, db_salaries,
    state_json: dict, job_cards: list[dict], roadmap_data,
) -> dict:
    """
    Assembles the full dashboard response payload from individual data sources.
    """
    # Extract hot_skills from market analysis
    market_data = state_json.get("market_analysis", {})
    hot_skills = market_data.get("hot_skills", []) if isinstance(market_data, dict) else []

    # Interview trend data
    trend_data = [
        {
            "date": intv.completed_at.strftime("%b %d") if intv.completed_at else "Unknown",
            "score": intv.overall_score
        }
        for intv in all_interviews if intv.overall_score is not None
    ]

    dashboard_data = {
        "cv_raw": state_json.get("cv_raw", latest_cv.cv_text if latest_cv else ""),
        "goal": state_json.get("job_description", ""),
        "pipeline_status": {
            "is_running": latest_run is not None and latest_run.status == "running",
            "current_stage": latest_run.current_stage if latest_run else 0,
            "pipeline_id": str(latest_run.id) if latest_run else None
        },
        "cv_health": {
            "version": latest_cv.version_number if latest_cv else (1 if latest_run else 0),
            "ats_score": state_json.get("ats_score", latest_cv.ats_score if latest_cv else None),
            "feedback": state_json.get("ats_breakdown"),
            "critique": state_json.get("cv_critique"),
            "cover_letter": state_json.get("cover_letter"),
            "last_updated": latest_run.created_at.isoformat() if latest_run else (latest_cv.created_at.isoformat() if latest_cv else None)
        },
        "job_matches": job_cards,
        "hot_skills": hot_skills,
        "salary_benchmarks": [
            {
                "role_title": sb.role_title,
                "salary_min": sb.salary_min,
                "salary_median": sb.salary_median,
                "salary_max": sb.salary_max,
                "currency": sb.currency,
            }
            for sb in db_salaries
        ] if db_salaries else (
            [{
                "role_title": state_json.get("job_description", "Target Role")[:80],
                "salary_min": state_json["salary_benchmarks"].get("salary_min"),
                "salary_median": state_json["salary_benchmarks"].get("salary_median"),
                "salary_max": state_json["salary_benchmarks"].get("salary_max"),
                "currency": state_json["salary_benchmarks"].get("currency", "USD"),
            }] if state_json.get("salary_benchmarks") and state_json["salary_benchmarks"].get("salary_min") else []
        ),
        "skill_progress": {
            "roadmap_exists": bool(roadmap_data),
            "completed": 0, 
            "total": len(roadmap_data)
        },
        "skill_roadmap": roadmap_data,
        "interview_readiness": {
            "last_score": latest_interview.overall_score if latest_interview else None,
            "report": {
                "overall_score": latest_interview.overall_score,
                "relevance": latest_interview.scores.get("relevance", 0) if latest_interview.scores else 0,
                "clarity": latest_interview.scores.get("clarity", 0) if latest_interview.scores else 0,
                "depth": latest_interview.scores.get("depth", 0) if latest_interview.scores else 0,
                "star_compliance": latest_interview.scores.get("star_compliance", 0) if latest_interview.scores else 0,
                "feedback": latest_interview.answers.get("feedback", "No feedback available") if (latest_interview.answers and isinstance(latest_interview.answers, dict)) else "No feedback available",
                "tips": latest_interview.answers.get("tips", {}) if (latest_interview.answers and isinstance(latest_interview.answers, dict)) else {},
                "transcript": "\n".join([f"{msg.get('role', 'unknown').upper()}: {msg.get('content', '')}" for msg in latest_interview.answers.get('history', [])]) if (latest_interview.answers and isinstance(latest_interview.answers, dict)) else ""
            } if latest_interview else None,
            "trend": trend_data,
            "question_bank": state_json.get("interview_question_bank", [])
        },
        "next_actions": [
            "Review your latest ATS Score breakdown",
            "Complete Phase 1 of your Skill Roadmap",
            "Schedule a mock interview"
        ]
    }
    
    return dashboard_data
