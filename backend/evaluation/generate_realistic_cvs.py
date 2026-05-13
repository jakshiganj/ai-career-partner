import json
import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from app.agents.gemini_client import gemini_client

ROLES = [
    "Senior Software Engineer", "Frontend Developer", "Data Scientist", 
    "HR Manager", "Sales Executive", "Project Manager", 
    "DevOps Engineer", "UI/UX Designer", "Marketing Specialist",
    "Database Administrator", "Business Analyst", "QA Engineer",
    "Cloud Architect", "Cybersecurity Analyst", "Product Owner"
]

async def generate_realistic_cv(role):
    system_instruction = (
        "You are an expert HR recruiter. Generate a highly realistic CV for a specific role. "
        "IMPORTANT: Use REALISTIC personal details. Do NOT use placeholders like [Your Name]. "
        "Use realistic Sri Lankan names (e.g., Aruni Perera, Dilshan Silva), "
        "realistic Colombo addresses, phone numbers starting with +94, and plausible emails. "
        "The CV should have sections for Summary, Experience, Education, and Skills."
    )
    prompt = f"Generate a realistic CV for the role: {role}. Ensure it looks like a professional PDF export (text format)."
    
    try:
        response = await asyncio.to_thread(
            gemini_client.generate_content,
            model='gemini-2.0-flash',
            prompt=prompt,
            config={"system_instruction": system_instruction}
        )
        return response
    except Exception as e:
        print(f"Error generating CV for {role}: {e}")
        return None

async def main():
    print(f"Generating {len(ROLES)} realistic CVs with PII...")
    dataset = []
    
    for i, role in enumerate(ROLES):
        print(f"Generating CV {i+1}/{len(ROLES)} for {role}...")
        cv_text = await generate_realistic_cv(role)
        if cv_text:
            dataset.append({
                "role": role,
                "cv": cv_text
            })
            
    output_path = 'evaluation/realistic_pii_dataset.json'
    with open(output_path, 'w') as f:
        json.dump(dataset, f, indent=4)
        
    print(f"\nSuccessfully generated {len(dataset)} CVs and saved to {output_path}")

if __name__ == "__main__":
    asyncio.run(main())
