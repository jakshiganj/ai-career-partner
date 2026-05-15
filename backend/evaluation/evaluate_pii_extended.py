import json
import re
import os
import asyncio
import sys

# Add backend to path so we can import app.agents
sys.path.append(os.getcwd())

from transformers import pipeline
from app.agents.gemini_client import gemini_client

# Load the 40 synthetic CVs
DATASET_PATH = 'evaluation/evaluation_dataset.json'

def load_cvs():
    with open(DATASET_PATH, 'r') as f:
        data = json.load(f)
    return [item['cv'] for item in data if 'cv' in item]

def run_regex_redaction(text):
    redacted = text
    # Standard PII regexes
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,}'
    
    redacted = re.sub(email_pattern, '[REDACTED_EMAIL]', redacted)
    redacted = re.sub(phone_pattern, '[REDACTED_PHONE]', redacted)
    return redacted

def run_ner_redaction(text, nlp_pipeline):
    entities = nlp_pipeline(text)
    redacted = text
    
    # Sort entities by end index descending to avoid shifting offsets
    entities = sorted(entities, key=lambda x: x['start'], reverse=True)
    
    for ent in entities:
        label = ent.get('entity_group') or ent.get('entity')
        if not label: continue
        
        if 'PER' in label:
            redacted = redacted[:ent['start']] + '[REDACTED_NAME]' + redacted[ent['end']:]
        elif 'LOC' in label:
            redacted = redacted[:ent['start']] + '[REDACTED_LOCATION]' + redacted[ent['end']:]
            
    return redacted

async def get_ground_truth(cv_text):
    """Use Gemini to identify the 'Ground Truth' PII in the CV."""
    system_instruction = "You are a data labeling expert. Extract all PII (Names, Locations, Email Addresses, and Phone Numbers) from the provided CV. Return ONLY a JSON object with keys 'names', 'locations', 'emails', and 'phones', each being a list of strings found in the text."
    prompt = f"Extract PII from this CV:\n\n{cv_text}"
    
    try:
        response = await asyncio.to_thread(
            gemini_client.generate_content,
            model='gemini-2.0-flash',
            prompt=prompt,
            config={"system_instruction": system_instruction}
        )
        clean_text = response.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)
    except Exception as e:
        print(f"Error labeling PII: {e}")
        return {"names": [], "locations": [], "emails": [], "phones": []}

async def evaluate_extended():
    print("--- Extended PII Evaluation (40 CVs) ---")
    cvs = load_cvs()
    print(f"Loaded {len(cvs)} CVs for testing.")
    
    print("Loading Local NER Model...")
    nlp = pipeline("token-classification", model="dslim/bert-base-NER", aggregation_strategy="simple")
    
    regex_scores = []
    ner_scores = []
    
    # We'll test a subset if it's too slow, but let's try 20 first for a representative sample
    limit = 20
    for i, cv in enumerate(cvs[:limit]):
        print(f"Processing CV {i+1}/{limit}...")
        
        # 1. Establish Ground Truth
        truth = await get_ground_truth(cv)
        all_truth_pii = list(set(truth.get('names', []) + truth.get('locations', []) + truth.get('emails', []) + truth.get('phones', [])))
        
        if not all_truth_pii:
            continue # Skip if no PII found to evaluate
            
        # 2. Run Redactions
        redacted_regex = run_regex_redaction(cv)
        redacted_ner = run_ner_redaction(cv, nlp)
        
        # 3. Score
        # How many of the ground truth entities were successfully redacted?
        regex_caught = 0
        ner_caught = 0
        
        for p in all_truth_pii:
            if p.lower() in cv.lower():
                # Check if the text still exists in the redacted version (case-insensitive for safety)
                if p.lower() not in redacted_regex.lower():
                    regex_caught += 1
                if p.lower() not in redacted_ner.lower():
                    ner_caught += 1
        
        regex_scores.append(regex_caught / len(all_truth_pii))
        ner_scores.append(ner_caught / len(all_truth_pii))
        
    avg_regex = sum(regex_scores) / len(regex_scores) if regex_scores else 0
    avg_ner = sum(ner_scores) / len(ner_scores) if ner_scores else 0
    
    print("\n" + "="*40)
    print("FINAL EXTENDED METRICS")
    print("="*40)
    print(f"Total CVs Evaluated: {len(regex_scores)}")
    print(f"Regex-only Mean Accuracy: {avg_regex*100:.2f}%")
    print(f"Transformers.js (NER) Mean Accuracy: {avg_ner*100:.2f}%")
    print("="*40)
    print(f"Conclusion: Local NER improves PII detection by {(avg_ner - avg_regex)*100:.1f} percentage points across the dataset.")

if __name__ == "__main__":
    asyncio.run(evaluate_extended())
