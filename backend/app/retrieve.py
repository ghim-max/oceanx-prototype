"""RAG stage 2: retrieve relevant feedback for a component.

Educator notes are matched directly by component_id. Learner comments are
not tagged to any component, so they are found by meaning: the component's
title and description are embedded and compared in pgvector (match_feedback).
"""
from app.db import supabase
from app.embeddings import embed_text


def retrieve_evidence(component_id: str, title: str, description: str, keywords: list[str] | None = None) -> list[dict]:
    """
    Retrieve evidence for a component:
    - All educator notes for this component_id
    - Top 6 learner comments via vector search using title+description embedding
    Returns list of dicts with: id, source, content, who
    """
    evidence = []

    # 1. All educator notes for this component
    educator_resp = supabase.table("educator_responses").select(
        "id, note"
    ).eq("component_id", component_id).not_.is_("note", "null").neq("note", "").execute()
    for row in educator_resp.data:
        if row["note"] and row["note"].strip():
            evidence.append({
                "id": row["id"],
                "source": "educator_note",
                "content": row["note"],
                "who": "Educator",
            })

    # 2. Top 6 learner comments via vector search
    keywords = [k.lower() for k in (keywords or [])]
    query_text = f"{title}. {description}. Keywords: {', '.join(keywords)}"
    query_embedding = embed_text(query_text)
    
    matches = supabase.rpc("match_feedback", {
        "query_embedding": query_embedding,
        "match_count": 30,
        "min_similarity": 0.35,
    }).execute()
    
    # Learner comments are untagged. Keep a match only if it also names this
    # component (keyword check), so a comment about another activity is not
    # attributed here. Found in the step 8 quality check.
    learner_rows = [
        row for row in matches.data
        if row["source"] in ("learner_comment", "learner_short_answer")
        and (not keywords or any(k in row["content"].lower() for k in keywords))
    ][:6]
    for row in learner_rows:
        evidence.append({
            "id": row["source_id"],
            "source": row["source"],
            "content": row["content"],
            "who": "Learner",
        })

    return evidence