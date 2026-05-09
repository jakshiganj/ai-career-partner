import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

class GeminiClient:
    def __init__(self):
        # Follow 2026 SDK standards: rely on auto-detection of GOOGLE_API_KEY or Vertex env vars
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if api_key or os.getenv("GOOGLE_GENAI_USE_VERTEXAI") == "True":
            self.client = genai.Client()
        else:
            print("WARNING: Gemini authentication not set. Agents will use mock responses.")
            self.client = None

    def generate_content(self, model: str, prompt: str, config: dict = None) -> str:
        if not self.client:
            return '{"mock": "response", "details": "Gemini Key missing"}'
        
        import time
        import random
        
        max_retries = 3
        base_delay = 5  # Start with 5 seconds
        
        for attempt in range(max_retries):
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=config
                )
                return response.text
            except Exception as e:
                err_msg = str(e)
                # If we hit a rate limit (429), wait and retry
                if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                    if attempt < max_retries - 1:
                        # Exponential backoff with jitter
                        delay = (base_delay * (2 ** attempt)) + random.uniform(0, 2)
                        print(f"Rate limit hit. Retrying in {delay:.2f} seconds... (Attempt {attempt + 1})")
                        time.sleep(delay)
                        continue
                
                return json.dumps({"error": err_msg})
        
        return json.dumps({"error": "Max retries exceeded for rate limit"})

    def embed_content(self, model: str, content: str) -> list[float]:
        if not self.client:
            return [0.0] * 768
        
        import time
        import random
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                response = self.client.models.embed_content(
                    model=model,
                    contents=content
                )
                if hasattr(response, 'embeddings') and len(response.embeddings) > 0:
                    return response.embeddings[0].values
                return [0.0] * 768
            except Exception as e:
                err_msg = str(e)
                if ("429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg) and attempt < max_retries - 1:
                    delay = (5 * (2 ** attempt)) + random.uniform(0, 2)
                    print(f"Rate limit hit in embedding. Retrying in {delay:.2f}s...")
                    time.sleep(delay)
                    continue
                print(f"Embedding error: {err_msg}")
                return [0.0] * 768
        return [0.0] * 768

    def embed_content_batch(self, model: str, contents: list[str]) -> list[list[float]]:
        if not self.client or not contents:
            return [[0.0] * 768 for _ in contents]
        
        import time
        import random
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                response = self.client.models.embed_content(
                    model=model,
                    contents=contents
                )
                if hasattr(response, 'embeddings') and len(response.embeddings) > 0:
                    return [emb.values for emb in response.embeddings]
                return [[0.0] * 768 for _ in contents]
            except Exception as e:
                err_msg = str(e)
                if ("429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg) and attempt < max_retries - 1:
                    delay = (5 * (2 ** attempt)) + random.uniform(0, 2)
                    print(f"Batch embedding hit rate limit. Retrying in {delay:.2f}s...")
                    time.sleep(delay)
                    continue
                print(f"Batch embedding error: {err_msg}")
                return [[0.0] * 768 for _ in contents]
        return [[0.0] * 768 for _ in contents]

gemini_client = GeminiClient()
