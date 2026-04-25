# Antigravity Task: Research Evaluation Data & Scripts for Extended Abstract

## System Context
We are generating the quantitative evaluation metrics for an extended academic abstract titled: "GraphRAG-Enhanced Skill Matching for Personalised Career Guidance: A Multi-Agent Approach Using the ESCO Ontology". 
The underlying system uses LangGraph, FastAPI, Neo4j, and Gemini to perform GraphRAG-based semantic skill reasoning. We need to evaluate this system against a baseline SBERT model using 40 CV-to-Job-Description pairs.

## Objective
Implement Python scripts to generate synthetic test data (CVs and JDs) and execute an automated evaluation pipeline that calculates baseline vs. GraphRAG accuracy, outputting the results into a research-ready CSV.

## Phase 1: Synthetic Data Generation
Create a script named `backend/evaluation/generate_test_data.py`.

**1. CV Generation (Gemini API):**
- Implement a function using `google.generativeai` to generate 40 synthetic CVs.
- Target demographic: Sri Lankan IT graduates applying for roles like Junior Software Engineer, React Developer, Backend Engineer, Data Scientist, etc.
- Content requirements: Skills section, 1-2 years experience, university projects, certifications. Ensure skills are realistic but not perfect for the target role.

**2. Job Description (JD) Data:**
- Integrate with the existing `MarketConnectorAgent` to scrape 40 varied IT job listings from topjobs.lk or LinkedIn.
- Alternatively, generate 40 synthetic JDs mirroring the Sri Lankan IT job market.

**3. Pair Construction:**
- Construct a JSON dataset of 40 evaluation pairs structured with `role`, `cv` (text), `jd` (text), and `expected` (boolean).
- Distribution: 25 "Matched" pairs (CV suits the JD -> `expected: True`) and 15 "Mismatched" pairs (CV does NOT suit the JD -> `expected: False`).

## Phase 2: Evaluation Pipeline implementation
Create a script named `backend/evaluation/graphrag_evaluation.py` to run the benchmark.

**1. Baseline Setup:**
- Import `SentenceTransformer('all-MiniLM-L6-v2')` and `cosine_similarity` from `sklearn`.
- Implement `baseline_score(cv_text, jd_text)` to return a simple cosine similarity float.

**2. GraphRAG Setup:**
- Import the existing `GraphRAGAgent` from the system architecture.
- Implement `async def graphrag_score(cv_text, jd_text)` to run the agent and extract: `final_score`, `implicit_skills` (list), and `skill_gaps` (list).

**3. Execution Loop:**
- Iterate through the 40 test pairs. 
- For each pair, calculate:
  - `baseline_score`
  - `graphrag_score`
  - `improvement` (graphrag - baseline)
  - `implicit_skills_found` (count)
  - `skill_gaps_identified` (count)
  - `baseline_correct` (baseline > 0.5 == expected)
  - `graphrag_correct` (graphrag > 0.5 == expected)

**4. Results Output:**
- Implement a `save_results` function that writes the raw data to `evaluation_results_[TIMESTAMP].csv`.
- Print a formatted console summary calculating the averages across all pairs: Average Baseline Score, Average GraphRAG Score, Average Improvement (%), Baseline Accuracy (%), and GraphRAG Accuracy (%).

## Deliverables
1. `generate_test_data.py` (Functional and ready to execute).
2. `graphrag_evaluation.py` (Integrated with the existing LangGraph/GraphRAG codebase).
3. Ensure `requirements.txt` is updated with `sentence-transformers`, `scikit-learn`, and `google-generativeai`.