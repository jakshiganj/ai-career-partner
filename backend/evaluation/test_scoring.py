import sys
import os

# Add app to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.agents.graph_rag.agent import calculate_hybrid_match_score, determine_job_tier

def test_scoring():
    print("--- Testing Hybrid Scoring Logic ---")
    
    # Case 1: High semantic, High graph
    s1 = calculate_hybrid_match_score(0.9, ["Python", "React"], ["Python", "React", "Frontend"])
    t1 = determine_job_tier(s1)
    print(f"Case 1 (Matched): Score {s1}, Tier {t1}")
    
    # Case 2: High semantic, Low graph (Potential Hallucination / Missing Key Skills)
    s2 = calculate_hybrid_match_score(0.8, ["AWS", "Kubernetes"], ["Python", "Excel"])
    t2 = determine_job_tier(s2)
    print(f"Case 2 (Mismatch): Score {s2}, Tier {t2}")
    
    # Case 3: Low semantic, High graph (Implicit Skills found)
    s3 = calculate_hybrid_match_score(0.4, ["FastAPI"], ["Python", "FastAPI", "Web Frameworks"])
    t3 = determine_job_tier(s3)
    print(f"Case 3 (Implicit): Score {s3}, Tier {t3}")

    assert t1 == "Realistic"
    assert t2 in ["Stretch", "Reach"]
    print("Test Complete!")

if __name__ == "__main__":
    test_scoring()
