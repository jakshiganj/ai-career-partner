import os
from google import genai
from google.genai import types

def list_live_models():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not found")
        return

    # Try both v1beta1 and v1alpha
    for version in ['v1beta1', 'v1alpha']:
        print(f"\n--- Checking API version: {version} ---")
        client = genai.Client(api_key=api_key, http_options=types.HttpOptions(api_version=version))
        try:
            for model in client.models.list():
                if 'bidiGenerateContent' in model.supported_generation_methods:
                    print(f"Model: {model.name} (Supports bidiGenerateContent)")
                elif 'flash' in model.name.lower():
                    print(f"Model: {model.name} (Methods: {model.supported_generation_methods})")
        except Exception as e:
            print(f"Error listing models for {version}: {e}")

if __name__ == "__main__":
    list_live_models()
