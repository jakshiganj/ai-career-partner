import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

class GeminiClient:
    def __init__(self):
        # Follow 2026 SDK standards: rely on auto-detection of GOOGLE_API_KEY or Vertex env vars
        _key1 = os.getenv("GOOGLE_API_KEY")
        _key2 = os.getenv("GEMINI_API_KEY")
        api_key = (_key1.strip() if _key1 else None) or (_key2.strip() if _key2 else None)
        
        _use_vertex = os.getenv("GOOGLE_GENAI_USE_VERTEXAI")
        use_vertex = _use_vertex.strip() if _use_vertex else None
        
        if api_key or use_vertex == "True":
            _project = os.getenv("GOOGLE_CLOUD_PROJECT")
            _location = os.getenv("GOOGLE_CLOUD_LOCATION", "asia-southeast1")
            project = _project.strip() if _project else None
            location = _location.strip() if _location else None
            
            if use_vertex == "True" and project:
                # Explicitly pass project/location for Vertex AI stability in Cloud Run
                self.client = genai.Client(
                    vertexai=True,
                    project=project,
                    location=location
                )
            else:
                # Fallback to API Key
                self.client = genai.Client(api_key=api_key)
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
                
                raise e
        
        raise Exception("Max retries exceeded for Gemini generation")

    def embed_content(self, model: str, content: str) -> list[float]:
        if not self.client:
            return [0.0] * 768
        
        import time
        import random
        from google.genai import types
        max_retries = 3
        
        if "text-embedding-004" in model:
            model = "models/gemini-embedding-2"
            
        for attempt in range(max_retries):
            try:
                response = self.client.models.embed_content(
                    model=model,
                    contents=content,
                    config=types.EmbedContentConfig(output_dimensionality=768)
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
        from google.genai import types
        import concurrent.futures
        
        if "text-embedding-004" in model:
            model = "models/gemini-embedding-2"
            
        def fetch_embedding(text):
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = self.client.models.embed_content(
                        model=model,
                        contents=text,
                        config=types.EmbedContentConfig(output_dimensionality=768)
                    )
                    if hasattr(response, 'embeddings') and len(response.embeddings) > 0:
                        return response.embeddings[0].values
                    return [0.0] * 768
                except Exception as e:
                    err_msg = str(e)
                    if ("429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg) and attempt < max_retries - 1:
                        time.sleep((2 ** attempt) + random.uniform(0, 1))
                        continue
                    return [0.0] * 768
            return [0.0] * 768

        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            embeddings = list(executor.map(fetch_embedding, contents))
            
        return embeddings

gemini_client = GeminiClient()
