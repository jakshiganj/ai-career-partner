from google import genai
import os
from dotenv import load_dotenv

# Load env file manually
load_dotenv()

key = os.getenv("GEMINI_API_KEY")
print(f"Key found: {'Yes' if key else 'No'}")
if key:
    print(f"Key starts with: {key[:4]}...")
    print(f"Key length: {len(key)}")

try:
    print("Initializing client...")
    client = genai.Client(api_key=key)
    print("Testing generate_content...")
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents='Hello, are you working?'
    )
    print("SUCCESS! Response received:")
    print(response.text)
except Exception as e:
    print("FAILURE!")
    print(e)
