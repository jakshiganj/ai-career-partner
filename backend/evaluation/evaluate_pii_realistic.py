import json
import re
import os
import asyncio
import sys

# Add backend to path
sys.path.append(os.getcwd())

from transformers import pipeline
from app.agents.gemini_client import gemini_client

# Load the realistic synthetic CVs
DATASET_PATH = 'evaluation/realistic_pii_dataset.json'

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

def run_hybrid_redaction(text, nlp_pipeline):
    # 1. Regex Pass
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{3}[-.\s]?\d{4,}'
    
    redacted = text
    redacted = re.sub(email_pattern, '[REDACTED_EMAIL]', redacted)
    redacted = re.sub(phone_pattern, '[REDACTED_PHONE]', redacted)
    
    # 2. NER Pass
    entities = nlp_pipeline(text)
    
    for ent in entities:
        label = ent.get('entity_group') or ent.get('entity')
        if not label: continue
        
        original_word = text[ent['start']:ent['end']]
        if 'PER' in label:
            redacted = redacted.replace(original_word, '[REDACTED_NAME]')
        elif 'LOC' in label:
            redacted = redacted.replace(original_word, '[REDACTED_LOCATION]')
            
    return redacted

async def get_ground_truth(cv_text):
    """Use Gemini to identify the 'Ground Truth' PII in the CV."""
    system_instruction = (
        "You are a data labeling expert. Extract all Identity PII from the provided CV. "
        "Keys: 'names', 'locations', 'emails', 'phones'. "
        "IMPORTANT: Do NOT include company names, university names, or organization names as PII. "
        "Return ONLY valid JSON."
    )
    prompt = f"Extract Identity PII from this CV:\n\n{cv_text}"
    
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
        return {"names": [], "locations": [], "emails": [], "phones": []}

async def evaluate_realistic():
    print("\n" + "="*50)
    print("FINAL IDENTITY PII REDACTION BENCHMARK")
    print("="*50)
    
    cvs = load_cvs()
    print(f"Testing on {len(cvs)} realistic CVs (Identity-only PII)")
    
    print("Initializing NER Pipeline (BERT-base-NER)...")
    nlp = pipeline("token-classification", model="dslim/bert-base-NER", aggregation_strategy="simple")
    
    regex_scores = []
    hybrid_scores = []
    
    for i, cv in enumerate(cvs):
        print(f"Analyzing CV {i+1}/{len(cvs)}...")
        
        truth = await get_ground_truth(cv)
        all_truth_pii = list(set(
            truth.get('names', []) + 
            truth.get('locations', []) + 
            truth.get('emails', []) + 
            truth.get('phones', [])
        ))
        
        if not all_truth_pii:
            continue
            
        redacted_regex = run_regex_redaction(cv)
        redacted_hybrid = run_hybrid_redaction(cv, nlp)
        
        regex_caught = 0
        hybrid_caught = 0
        
        missed_hybrid = []
        for p in all_truth_pii:
            if not p: continue
            if p.lower() in cv.lower():
                # If it's NOT in the redacted version, it was caught
                if p.lower() not in redacted_regex.lower():
                    regex_caught += 1
                if p.lower() not in redacted_hybrid.lower():
                    hybrid_caught += 1
                else:
                    missed_hybrid.append(p)
        
        if missed_hybrid:
            print(f"  > Hybrid missed: {missed_hybrid[:3]}...")
            
        regex_scores.append(regex_caught / len(all_truth_pii))
        hybrid_scores.append(hybrid_caught / len(all_truth_pii))
        
    avg_regex = sum(regex_scores) / len(regex_scores) if regex_scores else 0
    avg_hybrid = sum(hybrid_scores) / len(hybrid_scores) if hybrid_scores else 0
    
    print("\n" + "#"*40)
    print("   FINAL HYBRID PII TEST RESULTS")
    print("#"*40)
    print(f"Dataset Size: {len(regex_scores)} Real-world style CVs")
    print(f"Legacy Regex Accuracy: {avg_regex*100:.2f}%")
    print(f"Modern Hybrid (NER+Regex) Accuracy:  {avg_hybrid*100:.2f}%")
    print("#"*40)
    print(f"VERDICT: The Hybrid pipeline is {avg_hybrid/avg_regex:.1f}x more effective than Regex alone.")

if __name__ == "__main__":
    asyncio.run(evaluate_realistic())
