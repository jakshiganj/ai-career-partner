import pytest
from app.services.dashboard_service import build_job_cards_from_market

def test_matching_algorithm_no_matches():
    """Verify scoring when no skills match the job title."""
    state_json = {
        "skills": ["Chef", "Baking"],
        "market_analysis": {
            "market_analysis": {
                "Python": {
                    "status": "Stable",
                    "snippets": ["Python Developer at TechCorp"]
                }
            }
        }
    }
    cards = build_job_cards_from_market(state_json)
    assert len(cards) == 1
    assert cards[0]["match_score"] == 0.3 # Base score
    assert cards[0]["tier"] == "Reach"

def test_matching_algorithm_high_overlap():
    """Verify scoring when skills overlap with job title."""
    state_json = {
        "skills": ["Python", "Backend"],
        "market_analysis": {
            "market_analysis": {
                "Python": {
                    "status": "Stable",
                    "snippets": ["Senior Python Backend Developer at CloudScale"]
                }
            }
        }
    }
    cards = build_job_cards_from_market(state_json)
    assert len(cards) == 1
    # 0.3 + (2 skills * 0.15) = 0.6
    assert cards[0]["match_score"] == 0.6
    assert cards[0]["tier"] == "Stretch"

def test_market_status_bonus():
    """Verify that 'Active Hiring' status adds a bonus to the score."""
    state_json = {
        "skills": ["React"],
        "market_analysis": {
            "market_analysis": {
                "React": {
                    "status": "Active Hiring",
                    "snippets": ["React Engineer at Startup"]
                }
            }
        }
    }
    cards = build_job_cards_from_market(state_json)
    # 0.3 + (1 skill * 0.15) + 0.1 bonus = 0.55
    assert cards[0]["match_score"] == 0.55
    assert cards[0]["tier"] == "Stretch"

def test_tier_sorting():
    """Ensure cards are sorted by Realistic > Stretch > Reach."""
    state_json = {
        "skills": ["Python", "Java", "React"],
        "market_analysis": {
            "market_analysis": {
                "Python": {
                    "status": "Active Hiring",
                    "snippets": ["Python Developer at A"]
                },
                "React": {
                    "status": "Stable",
                    "snippets": ["Junior React Dev at B"]
                },
                "COBOL": {
                    "status": "Legacy",
                    "snippets": ["COBOL Maintainer at C"]
                }
            }
        }
    }
    cards = build_job_cards_from_market(state_json)
    assert len(cards) == 3
    assert cards[0]["tier"] == "Realistic" # High score
    assert cards[1]["tier"] == "Stretch"   # Mid score
    assert cards[2]["tier"] == "Reach"     # Low score
