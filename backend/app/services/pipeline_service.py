"""
Pipeline service — business logic extracted from the pipeline router.

Contains:
  - run_label_from_state: Extract a short label for a pipeline run
  - format_run_for_api: Format a PipelineRun row into API response dict
"""


def run_label_from_state(state_json: dict) -> str:
    """Extract a short label for the run from state (e.g. job title or job description snippet)."""
    jd = (state_json or {}).get("job_description") or ""
    if not jd:
        return "Untitled run"
    
    # Try to find a better title by skipping common generic headers
    lines = [l.strip() for l in jd.split("\n") if l.strip()]
    generic_headers = {
        "about the role", "about the job", "job description", "the role", 
        "position summary", "key responsibilities", "role description",
        "**about the role**", "**job description**", "job title:", "**job title:**"
    }
    
    selected_line = "Untitled run"
    for line in lines:
        clean_line = line.lower().rstrip(':')
        if clean_line not in generic_headers and len(line) > 3:
            # Strip markdown bold/italics if present
            selected_line = line.replace("**", "").replace("__", "").replace("#", "").strip()
            # If it looks like "Job Title: DevOps Engineer", just take the title part
            if ":" in selected_line and any(h in selected_line.lower() for h in ["job title", "position"]):
                selected_line = selected_line.split(":", 1)[1].strip()
            break

    if len(selected_line) > 50:
        return selected_line[:47] + "..."
    return selected_line or "Untitled run"


def format_run_for_api(run) -> dict:
    """Format a PipelineRun DB row into the API response dict."""
    state = run.state_json or {}
    return {
        "id": str(run.id),
        "label": run_label_from_state(state),
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "ats_score": state.get("ats_score"),
        "status": run.status,
        "current_stage": run.current_stage,
    }
