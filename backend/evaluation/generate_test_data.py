import os
import json
import asyncio
from typing import List, Dict

# Setup sys path so we can import from app
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.agents.gemini_client import gemini_client

ROLES_MATCHED = [
    "Junior Software Engineer", "Frontend React Developer", "Backend Python Developer", 
    "Full Stack Developer", "Data Scientist", "Data Analyst", 
    "Machine Learning Engineer", "DevOps Engineer", "AWS Cloud Architect", 
    "QA Automation Engineer", "iOS Developer", "Android Developer", 
    "UI/UX Designer", "Cybersecurity Analyst", "Database Administrator",
    "Node.js Developer", "Java Spring Boot Developer", "C++ Systems Engineer",
    "Go Developer", "Data Engineer", "Site Reliability Engineer",
    "Information Security Engineer", "Penetration Tester", "Angular Developer",
    "Flutter Developer"
] # 25 roles

ROLES_MISMATCHED = [
    ("Frontend Developer", "Database Administrator"),
    ("Data Scientist", "Mobile App Developer"),
    ("QA Automation Engineer", "UI/UX Designer"),
    ("Cloud Architect", "Frontend Developer"),
    ("Cybersecurity Analyst", "Full Stack Developer"),
    ("Backend Engineer", "Technical Writer"),
    ("Machine Learning Engineer", "Scrum Master"),
    ("iOS Developer", "Data Analyst"),
    ("DevOps Engineer", "Product Manager"),
    ("React Developer", "Network Engineer"),
    ("Java Developer", "Cybersecurity Analyst"),
    ("Data Engineer", "Frontend Developer"),
    ("System Administrator", "Data Scientist"),
    ("Penetration Tester", "UI/UX Designer"),
    ("Go Developer", "QA Automation Engineer")
] # 15 pairs of (JD Role, CV Role)

async def generate_jd(role: str) -> str:
    system_instruction = "You are an HR manager in Sri Lanka. Create a short, realistic Job Description (150-200 words) for the given IT role. Include a list of required technical skills."
    prompt = f"Role: {role}\nGenerate the job description."
    
    try:
        response_text = await asyncio.to_thread(
            gemini_client.generate_content,
            model='gemini-2.5-flash',
            prompt=prompt,
            config={"system_instruction": system_instruction}
        )
        return response_text.strip()
    except Exception as e:
        print(f"Error generating JD for {role}: {e}")
        return f"Job Description for {role}\nRequired Skills: [Failed to generate]"

async def generate_cv(role: str) -> str:
    system_instruction = "You are an IT graduate in Sri Lanka with 1-2 years of experience. Create a short, realistic CV (150-250 words) for the given target role. Include a skills section, a brief project, and experience. Do NOT make it a perfect match; miss a couple of advanced skills."
    prompt = f"Target Role: {role}\nGenerate the CV text."
    
    try:
        response_text = await asyncio.to_thread(
            gemini_client.generate_content,
            model='gemini-2.5-flash',
            prompt=prompt,
            config={"system_instruction": system_instruction}
        )
        return response_text.strip()
    except Exception as e:
        print(f"Error generating CV for {role}: {e}")
        return f"CV for {role}\nSkills: [Failed to generate]"

async def process_matched(role):
    jd = await generate_jd(role)
    cv = await generate_cv(role)
    return {"role": role, "jd": jd, "cv": cv, "expected": True}

async def process_mismatched(jd_role, cv_role):
    jd = await generate_jd(jd_role)
    cv = await generate_cv(cv_role)
    return {"role": f"{jd_role} (JD) vs {cv_role} (CV)", "jd": jd, "cv": cv, "expected": False}

async def main():
    print("Generating 40 pairs concurrently...")
    
    matched_tasks = [process_matched(role) for role in ROLES_MATCHED]
    mismatched_tasks = [process_mismatched(jd, cv) for jd, cv in ROLES_MISMATCHED]
    
    all_tasks = matched_tasks + mismatched_tasks
    dataset = await asyncio.gather(*all_tasks)
        
    output_path = os.path.join(os.path.dirname(__file__), "evaluation_dataset.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=4)
        
    print(f"\nSuccessfully generated {len(dataset)} pairs and saved to {output_path}")

if __name__ == "__main__":
    asyncio.run(main())
