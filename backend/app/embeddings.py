from fastembed import TextEmbedding
import numpy as np

# Loaded on first use only, so the hosted (read-only) backend never loads it
_model = None

def _get_model() -> TextEmbedding:
    global _model
    if _model is None:
        _model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    return _model

EMBEDDING_DIM = 384

def embed_text(text: str) -> list[float]:
    """Embed a single text string, returns list of 384 floats."""
    if not text or not text.strip():
        return [0.0] * EMBEDDING_DIM
    embeddings = list(_get_model().embed([text.strip()]))
    if not embeddings:
        return [0.0] * EMBEDDING_DIM
    return embeddings[0].tolist()

def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts, returns list of 384-float lists."""
    if not texts:
        return []
    # Filter empty texts but keep positions
    valid_texts = [t.strip() if t else "" for t in texts]
    embeddings = list(_get_model().embed(valid_texts))
    return [e.tolist() for e in embeddings]