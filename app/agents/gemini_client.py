from google import genai
import os
import json

class GeminiClient:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            self.client = genai.Client(api_key=api_key)
        else:
            print("WARNING: GEMINI_API_KEY not set. Agents will use mock responses.")
            self.client = None

    def generate_content(self, model: str, prompt: str) -> str:
        if not self.client:
            return '{"mock": "response", "details": "Gemini Key missing"}'
        
        try:
             response = self.client.models.generate_content(
                model=model,
                contents=prompt
            )
             return response.text
        except Exception as e:
            return json.dumps({"error": str(e)})

gemini_client = GeminiClient()
