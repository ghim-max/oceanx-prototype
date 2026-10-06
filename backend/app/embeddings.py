from fastembed import TextEmbedding
import numpy as np

# Load once at module import
_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

EMBEDDING_DIM = 384

def embed_text(text: str) -> list[float]:
    """Embed a single text string, returns list of 384 floats."""
    if not text or not text.strip():
        return [0.0] * EMBEDDING_DIM
    embeddings = list(_model.embed([text.strip()]))
    if not embeddings:
        return [0.0] * EMBEDDING_DIM
    return embeddings[0].tolist()

def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts, returns list of 384-float lists."""
    if not texts:
        return []
    # Filter empty texts but keep positions
    valid_texts = [t.strip() if t else "" for t in texts]
    embeddings = list(_model.embed(valid_texts))
    return [e.tolist() for e in embeddings]