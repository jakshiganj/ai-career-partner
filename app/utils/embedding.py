from sentence_transformers import SentenceTransformer

# Load the model once (it downloads about 80MB)
model = SentenceTransformer('all-MiniLM-L6-v2')

def get_embedding(text: str) -> list[float]:
    """
    Converts text into a 384-dimensional vector.
    """
    # encode() returns a numpy array, we convert it to a standard Python list
    return model.encode(text).tolist()