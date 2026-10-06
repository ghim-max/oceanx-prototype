"""RAG stage 1: index feedback text into pgvector.

Embeds every new learner comment, learner short answer and educator note
and stores it in public.feedback_embeddings. Runs at the start of every
pipeline run, so new feedback is searchable before cards are written.
"""
from app.db import supabase
from app.embeddings import embed_text


def sync_embeddings() -> int:
    """
    Sync all non-empty learner comments, short_answers, and educator notes
    into feedback_embeddings. Returns count of new embeddings inserted.
    """
    inserted = 0

    # Learner comments
    learner_comments = supabase.table("learner_responses").select(
        "id, comment, is_sample"
    ).not_.is_("comment", "null").neq("comment", "").execute()
    for row in learner_comments.data:
        if row["comment"] and row["comment"].strip():
            # Check if already exists
            existing = supabase.table("feedback_embeddings").select("id").eq(
                "source", "learner_comment"
            ).eq("source_id", row["id"]).execute()
            if not existing.data:
                embedding = embed_text(row["comment"])
                supabase.table("feedback_embeddings").insert({
                    "source": "learner_comment",
                    "source_id": row["id"],
                    "component_id": None,
                    "content": row["comment"],
                    "embedding": embedding,
                    "is_sample": row["is_sample"],
                }).execute()
                inserted += 1

    # Learner short_answers
    learner_short = supabase.table("learner_responses").select(
        "id, short_answer, is_sample"
    ).not_.is_("short_answer", "null").neq("short_answer", "").execute()
    for row in learner_short.data:
        if row["short_answer"] and row["short_answer"].strip():
            existing = supabase.table("feedback_embeddings").select("id").eq(
                "source", "learner_short_answer"
            ).eq("source_id", row["id"]).execute()
            if not existing.data:
                embedding = embed_text(row["short_answer"])
                supabase.table("feedback_embeddings").insert({
                    "source": "learner_short_answer",
                    "source_id": row["id"],
                    "component_id": None,
                    "content": row["short_answer"],
                    "embedding": embedding,
                    "is_sample": row["is_sample"],
                }).execute()
                inserted += 1

    # Educator notes
    educator_notes = supabase.table("educator_responses").select(
        "id, note, component_id, is_sample"
    ).not_.is_("note", "null").neq("note", "").execute()
    for row in educator_notes.data:
        if row["note"] and row["note"].strip():
            existing = supabase.table("feedback_embeddings").select("id").eq(
                "source", "educator_note"
            ).eq("source_id", row["id"]).execute()
            if not existing.data:
                embedding = embed_text(row["note"])
                supabase.table("feedback_embeddings").insert({
                    "source": "educator_note",
                    "source_id": row["id"],
                    "component_id": row["component_id"],
                    "content": row["note"],
                    "embedding": embedding,
                    "is_sample": row["is_sample"],
                }).execute()
                inserted += 1

    return inserted
