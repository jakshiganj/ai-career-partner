from __future__ import annotations
from typing import TYPE_CHECKING

# Lazy-load to avoid crashing at server startup if torch DLLs fail to load
# (common with Python 3.13 + older torch wheels on Windows)
_model = None

def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            raise RuntimeError(
                f"Could not load embedding model (torch/sentence-transformers issue): {e}\n"
                "Try: pip install torch --index-url https://download.pytorch.org/whl/cpu"
            ) from e
    return _model

def get_embedding(text: str) -> list[float]:
    """
    Converts text into a 384-dimensional vector using sentence-transformers.
    Model is loaded lazily on first call.
    """
    model = _get_model()
    return model.encode(text).tolist()
