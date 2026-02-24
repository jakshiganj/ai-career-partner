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

    def generate_content(self, model: str, prompt: str, config: dict = None) -> str:
        if not self.client:
            return '{"mock": "response", "details": "Gemini Key missing"}'
        
        try:
             response = self.client.models.generate_content(
                model=model,
                contents=prompt,
                config=config
            )
             return response.text
        except Exception as e:
            return json.dumps({"error": str(e)})

    def embed_content(self, model: str, content: str) -> list[float]:
        if not self.client:
            return [0.0] * 768
        
        try:
            response = self.client.models.embed_content(
                model=model,
                contents=content
            )
            # The structure for google-genai SDK 
            if hasattr(response, 'embeddings') and len(response.embeddings) > 0:
                return response.embeddings[0].values
            return [0.0] * 768
        except Exception as e:
            print(f"Embedding error: {str(e)}")
            return [0.0] * 768

gemini_client = GeminiClient()
