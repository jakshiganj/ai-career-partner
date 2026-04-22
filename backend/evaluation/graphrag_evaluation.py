import os
import json
import csv
import asyncio
from datetime import datetime
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.agents.graph_rag.agent import graph_rag_agent

# Initialize baseline model
print("Loading baseline model...")
baseline_model = SentenceTransformer('all-MiniLM-L6-v2')
print("Baseline model loaded.")

def baseline_score(cv_text: str, jd_text: str) -> float:
    """Calculate cosine similarity between CV and JD using SBERT."""
    embeddings = baseline_model.encode([cv_text, jd_text])
    score = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
    return float(score)

async def evaluate_pair(i: int, pair: dict) -> dict:
    role = pair['role']
    cv = pair['cv']
    jd = pair['jd']
    expected = pair['expected']
    
    print(f"  Starting Evaluation for Pair {i+1}: {role}")
    
    # 1. Baseline SBERT
    b_score = baseline_score(cv, jd)
    
    # 2. GraphRAG
    try:
        gr_response = await graph_rag_agent(candidate_profile=None, job_description=jd, cv_raw=cv)
        gr_score = gr_response.get("skill_match_score", 0.0)
        implicit_skills = gr_response.get("implicit_skills", [])
        skill_gaps = gr_response.get("skill_gaps", [])
    except Exception as e:
        print(f"Error calling GraphRAG for pair {i+1}: {e}")
        gr_score = 0.0
        implicit_skills = []
        skill_gaps = []
        
    improvement = gr_score - b_score
    baseline_pred = b_score > 0.5
    graphrag_pred = gr_score > 0.5
    
    baseline_correct = (baseline_pred == expected)
    graphrag_correct = (graphrag_pred == expected)
    
    print(f"  Finished Pair {i+1} | Base: {b_score:.2f} | GR: {gr_score:.2f}")
    
    return {
        "Pair_ID": i + 1,
        "Role": role,
        "Expected_Match": expected,
        "Baseline_Score": round(b_score, 4),
        "GraphRAG_Score": round(gr_score, 4),
        "Improvement": round(improvement, 4),
        "Baseline_Correct": baseline_correct,
        "GraphRAG_Correct": graphrag_correct,
        "Implicit_Skills_Count": len(implicit_skills),
        "Skill_Gaps_Count": len(skill_gaps),
        "Implicit_Skills": ", ".join(implicit_skills),
        "Skill_Gaps": ", ".join(skill_gaps)
    }

# ADDED: Semaphore to prevent API Rate Limiting (429 errors)
sem = asyncio.Semaphore(3)

async def evaluate_pair_with_semaphore(i: int, pair: dict):
    async with sem:
        return await evaluate_pair(i, pair)

async def evaluate():
    dataset_path = os.path.join(os.path.dirname(__file__), "evaluation_dataset.json")
    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}. Please run generate_test_data.py first.")
        return

    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    print(f"\nStarting concurrent evaluation of {len(dataset)} pairs...")
    
    # Run evaluation concurrently, but throttled to 3 at a time
    tasks = [evaluate_pair_with_semaphore(i, pair) for i, pair in enumerate(dataset)]
    results = await asyncio.gather(*tasks)
    
    # Metrics aggregators
    total_baseline_score = sum(r['Baseline_Score'] for r in results)
    total_graphrag_score = sum(r['GraphRAG_Score'] for r in results)
    total_improvement = sum(r['Improvement'] for r in results)
    baseline_correct_count = sum(1 for r in results if r['Baseline_Correct'])
    graphrag_correct_count = sum(1 for r in results if r['GraphRAG_Correct'])
    total_implicit_skills = sum(r['Implicit_Skills_Count'] for r in results)
    total_skill_gaps = sum(r['Skill_Gaps_Count'] for r in results)

    num_pairs = len(dataset)
    if num_pairs == 0:
        print("Dataset is empty.")
        return

    # Calculate Averages
    avg_baseline = total_baseline_score / num_pairs
    avg_graphrag = total_graphrag_score / num_pairs
    avg_improvement = total_improvement / num_pairs
    baseline_acc = (baseline_correct_count / num_pairs) * 100
    graphrag_acc = (graphrag_correct_count / num_pairs) * 100
    avg_implicit = total_implicit_skills / num_pairs
    avg_gaps = total_skill_gaps / num_pairs

    # Save Results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = os.path.join(os.path.dirname(__file__), f"evaluation_results_{timestamp}.csv")
    
    with open(csv_filename, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)

    # Print Summary
    print("\n" + "="*50)
    print("GraphRAG Evaluation Summary (vs SBERT Baseline)")
    print("="*50)
    print(f"Total Pairs Evaluated:  {num_pairs}")
    print(f"Average Baseline Score: {avg_baseline:.4f}")
    print(f"Average GraphRAG Score: {avg_graphrag:.4f}")
    print(f"Average Improvement:    {avg_improvement:.4f} ({(avg_improvement/avg_baseline)*100 if avg_baseline else 0:.2f}%)")
    print("-" * 50)
    print(f"Baseline Accuracy:      {baseline_acc:.2f}%")
    print(f"GraphRAG Accuracy:      {graphrag_acc:.2f}%")
    print("-" * 50)
    print(f"Avg Implicit Skills Discovered: {avg_implicit:.2f}")
    print(f"Avg Skill Gaps Identified:      {avg_gaps:.2f}")
    print("="*50)
    print(f"\nDetailed results saved to: {csv_filename}")

if __name__ == "__main__":
    asyncio.run(evaluate())