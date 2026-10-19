"""Orchestration: index -> retrieve -> generate -> guardrail -> save cards."""
import json
import uuid
import time
from typing import Optional
from app.db import supabase
from app.index import sync_embeddings
from app.retrieve import retrieve_evidence
from app.rules import decide_recommendation, RuleResult
from app.llm import generate_card, call_override_why
from app.config import AI_MODEL, TEST_OVERRIDES

# Load components
with open("app/components.json") as f:
    COMPONENTS = json.load(f)


def parse_overrides(overrides_str: str) -> dict:
    """Parse TEST_OVERRIDES like 'create-activity:Reuse,video-changi-point:Reuse'"""
    result = {}
    if not overrides_str:
        return result
    for part in overrides_str.split(","):
        part = part.strip()
        if ":" in part:
            comp_id, rec = part.split(":", 1)
            result[comp_id.strip()] = rec.strip()
    return result

def run_pipeline(only: Optional[list[str]] = None) -> dict:
    """
    Run the full pipeline:
    1. Sync embeddings
    2. Read component_metrics and session_metrics
    3. For each component, generate card
    4. Insert into insight_cards
    Returns dict with run_id and cards.
    """
    # 1. Sync embeddings
    sync_embeddings()

    # 2. Read metrics
    comp_metrics = supabase.table("component_metrics").select("*").execute().data
    session_metrics = supabase.table("session_metrics").select("*").execute().data
    session = session_metrics[0] if session_metrics else {}

    # Parse overrides
    overrides = parse_overrides(TEST_OVERRIDES)

    run_id = str(uuid.uuid4())
    cards = []

    errors = []
    todo = [c for c in COMPONENTS if not only or c["id"] in only]
    for i, comp in enumerate(todo):
        # One failed card must not stop the whole run.
        try:
            # Find metrics for this component
            metrics = next((m for m in comp_metrics if m["component_id"] == comp["id"]), {})

            # Rule recommendation
            rule_result = decide_recommendation(
                gain_pts=metrics.get("gain_pts"),
                learning=metrics.get("learning"),
                engagement=metrics.get("engagement"),
                used_as_is=metrics.get("used_as_is", 0),
                changed=metrics.get("changed", 0),
                skipped=metrics.get("skipped", 0),
                time_right=metrics.get("time_right", 0),
                time_too_long=metrics.get("time_too_long", 0),
                time_too_short=metrics.get("time_too_short", 0),
            )
            rule_rec = rule_result.recommendation

            # Retrieve evidence
            evidence = retrieve_evidence(comp["id"], comp["title"], comp["description"], comp.get("keywords"))

            # Check if overridden
            override_rec = overrides.get(comp["id"])
            overridden = override_rec is not None

            if overridden:
                # First, get the AI recommendation using true facts
                ai_result = generate_card(comp, metrics, evidence)
                card_usage = ai_result.pop("_usage", {})
                ai_rec = ai_result["recommendation"]

                # Second call: write a "why" arguing for the override using only true facts
                override_why = call_override_why(comp, metrics, override_rec)
                if not override_why:
                    # Fallback: plain sentence built from the true numbers only
                    gain = metrics.get("gain_pts")
                    parts = []
                    if gain is not None:
                        parts.append(f"a {gain} point learning gain")
                    if metrics.get("engagement") is not None:
                        parts.append(f"engagement of {metrics['engagement']}/5")
                    if metrics.get("used_as_is") is not None:
                        parts.append(f"{metrics['used_as_is']} of {metrics.get('educator_count', 3)} educators using it as is")
                    override_why = f"Recommended {override_rec} based on " + (", ".join(parts) if parts else "the feedback received") + "."

                # Build card with override
                card = {
                    "recommendation": override_rec,
                    "why": override_why,
                    "evidence": ai_result["evidence"],
                    "quotes": ai_result["quotes"],
                    "suggested_action": ai_result["suggested_action"],
                }
                ai_recommendation = ai_rec
                guardrail_ok = False
            else:
                # Normal generation
                card = generate_card(comp, metrics, evidence)
                card_usage = card.pop("_usage", {})
                ai_recommendation = card["recommendation"]
                guardrail_ok = (ai_recommendation == rule_rec)

            # Insert into insight_cards
            insert_data = {
                "run_id": run_id,
                "component_id": comp["id"],
                "recommendation": card["recommendation"],
                "why": card["why"],
                "evidence": card["evidence"],
                "quotes": card["quotes"],
                "metrics": {k: v for k, v in metrics.items() if k not in ("question", "status")},
                "rule_recommendation": rule_rec,
                "ai_recommendation": ai_recommendation,
                "guardrail_ok": guardrail_ok,
                "overridden": overridden,
                "model": AI_MODEL,
                "suggested_action": card.get("suggested_action"),
                "input_tokens": card_usage.get("input_tokens"),
                "output_tokens": card_usage.get("output_tokens"),
                "latency_ms": card_usage.get("latency_ms"),
                "cost_usd": card_usage.get("cost_usd"),
            }
            supabase.table("insight_cards").insert(insert_data).execute()

            cards.append({
                "component_id": comp["id"],
                "title": comp["title"],
                "status": comp["status"],
                "recommendation": card["recommendation"],
                "why": card["why"],
                "evidence": card["evidence"],
                "quotes": card["quotes"],
                "suggested_action": card["suggested_action"],
                "metrics": {k: v for k, v in metrics.items() if k not in ("question", "status")},
            })

        except Exception as e:
            errors.append({"component_id": comp["id"], "error": str(e)[:300]})

    return {
        "run_id": run_id,
        "cards": cards,
        "session": session,
        "errors": errors,
    }

def get_latest_run() -> Optional[dict]:
    """Get the latest run_id from insight_cards"""
    result = supabase.table("insight_cards").select("run_id").order("generated_at", desc=True).limit(1).execute()
    if result.data:
        return result.data[0]["run_id"]
    return None

def get_latest_cards(admin: bool = False) -> list[dict]:
    """Newest card for each component, across runs. Lets a failed card be regenerated on its own."""
    result = supabase.table("insight_cards").select("*").order("generated_at", desc=True).execute()
    seen = {}
    for row in result.data:
        if row["component_id"] not in seen:
            seen[row["component_id"]] = row
    order = [c["id"] for c in COMPONENTS]
    rows = [seen[cid] for cid in order if cid in seen]
    return [_row_to_card(r, admin) for r in rows]


def _row_to_card(row: dict, admin: bool) -> dict:
    card = {
        "component_id": row["component_id"],
        "title": next((c["title"] for c in COMPONENTS if c["id"] == row["component_id"]), row["component_id"]),
        "status": next((c["status"] for c in COMPONENTS if c["id"] == row["component_id"]), "Fixed"),
        "recommendation": row["recommendation"],
        "why": row["why"],
        "evidence": row["evidence"],
        "quotes": row["quotes"],
        "suggested_action": row.get("suggested_action"),
        "metrics": row["metrics"],
        "generated_at": row["generated_at"],
    }
    if admin:
        card["rule_recommendation"] = row["rule_recommendation"]
        card["ai_recommendation"] = row["ai_recommendation"]
        card["guardrail_ok"] = row["guardrail_ok"]
        card["overridden"] = row["overridden"]
        card["model"] = row.get("model")
        card["run_id"] = row["run_id"]
    return card


def get_cards_for_run(run_id: str, admin: bool = False) -> list[dict]:
    """Get cards for a run, optionally including admin fields"""
    result = supabase.table("insight_cards").select("*").eq("run_id", run_id).order("component_id").execute()
    cards = []
    for row in result.data:
        card = {
            "component_id": row["component_id"],
            "title": next((c["title"] for c in COMPONENTS if c["id"] == row["component_id"]), row["component_id"]),
            "status": next((c["status"] for c in COMPONENTS if c["id"] == row["component_id"]), "Fixed"),
            "recommendation": row["recommendation"],
            "why": row["why"],
            "evidence": row["evidence"],
            "quotes": row["quotes"],
            "suggested_action": row.get("suggested_action"),
            "metrics": row["metrics"],
        }
        if admin:
            card["rule_recommendation"] = row["rule_recommendation"]
            card["ai_recommendation"] = row["ai_recommendation"]
            card["guardrail_ok"] = row["guardrail_ok"]
            card["overridden"] = row["overridden"]
        cards.append(card)
    return cards

def get_raw_data() -> dict:
    """Get raw data for /insights/raw endpoint"""
    comp_metrics = supabase.table("component_metrics").select("*").execute().data

    # All learner comments (ungrouped)
    learner_comments = supabase.table("learner_responses").select(
        "id, comment, short_answer, helped_most, is_sample"
    ).or_("comment.not.is.null,short_answer.not.is.null").execute().data

    # All educator notes grouped by component_id
    educator_notes = supabase.table("educator_responses").select(
        "id, component_id, note, usage, is_sample"
    ).not_.is_("note", "null").neq("note", "").execute().data

    notes_by_component = {}
    for note in educator_notes:
        cid = note["component_id"]
        if cid not in notes_by_component:
            notes_by_component[cid] = []
        notes_by_component[cid].append({
            "id": note["id"],
            "note": note["note"],
            "usage": note["usage"],
            "is_sample": note["is_sample"],
        })

    return {
        "component_metrics": comp_metrics,
        "learner_comments": learner_comments,
        "educator_notes_by_component": notes_by_component,
    }
