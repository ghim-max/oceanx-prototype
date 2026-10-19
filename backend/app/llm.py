"""RAG stage 3: generate the decision card from facts + retrieved feedback.

The model gets the metrics, the decision rules text and the retrieved
comments, and decides Reuse / Adapt / Drop on its own. It is NOT told the
rule-based answer; pipeline.py compares the two afterwards (guardrail).
"""
import json
import time
import anthropic
from app.config import ANTHROPIC_API_KEY, AI_MODEL

# USD per MTok — add rows as new models are deployed
_PRICING_PER_MTOK = {
    "claude-haiku-5-5": (0.10, 0.50),
    "claude-haiku-4-5": (1.00, 5.00),
    "claude-sonnet-4-6": (3.00, 15.00),
    "claude-opus-4-8": (5.00, 25.00),
}
_DEFAULT_PRICING_PER_MTOK = (0.10, 0.50)  # fallback matches haiku-5-5

# SDK retries disabled — we manage retries ourselves to keep control over
# what errors to retry on and with what backoff.
client = anthropic.Anthropic(
    api_key=ANTHROPIC_API_KEY or "not-set",
    max_retries=0,
)

SYSTEM_PROMPT = """You are an analyst for OceanX Education content managers.
Use only the facts given. Never invent numbers or quotes.
Quotes must be copied exactly from the provided comments.
Only use a comment if it is clearly about THIS component. Never mention or describe comments about other activities.
For Fixed content, "Adapt" means change how it is used (guiding question, timing, position), not edit the asset.
Return only valid JSON matching the schema."""

_CARD_TOOL = {
    "name": "decision_card",
    "description": "Return the structured decision card for this content component.",
    "input_schema": {
        "type": "object",
        "properties": {
            "recommendation": {
                "type": "string",
                "enum": ["Reuse", "Adapt", "Drop"],
            },
            "why": {
                "type": "string",
                "description": "one or two plain sentences under 45 words",
            },
            "evidence": {
                "type": "array",
                "items": {"type": "string"},
                "description": "3-4 short strings each with a real number from the facts",
            },
            "quotes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "text": {"type": "string"},
                        "who": {"type": "string", "enum": ["Learner", "Educator"]},
                    },
                    "required": ["text", "who"],
                },
                "description": "max 2 verbatim quotes from comments",
            },
            "suggested_action": {"type": "string"},
        },
        "required": ["recommendation", "why", "evidence", "quotes", "suggested_action"],
    },
}

_WHY_TOOL = {
    "name": "justification",
    "description": "Return a brief factual justification for the recommendation.",
    "input_schema": {
        "type": "object",
        "properties": {
            "why": {
                "type": "string",
                "description": "1-2 sentences under 45 words using only the provided metrics",
            }
        },
        "required": ["why"],
    },
}

_RETRY_WAITS = [2, 5]  # seconds; 3 total attempts on transient errors
_RETRYABLE = (
    anthropic.RateLimitError,
    anthropic.InternalServerError,
    anthropic.OverloadedError,
    anthropic.APIConnectionError,
)


def _make_usage(response, latency_ms: int, model: str) -> dict:
    in_mtok, out_mtok = _PRICING_PER_MTOK.get(model, _DEFAULT_PRICING_PER_MTOK)
    return {
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "latency_ms": latency_ms,
        "cost_usd": round(
            response.usage.input_tokens * (in_mtok / 1_000_000)
            + response.usage.output_tokens * (out_mtok / 1_000_000),
            6,
        ),
    }


def call_llm(component: dict, metrics: dict, evidence: list[dict]) -> tuple[dict, dict]:
    """
    Call LLM with component facts, metrics, rules, and retrieved comments.
    Returns (parsed_card_dict, usage_stats_dict).
    Retries on transient errors (429, 5xx, network) with [2, 5]s backoff.
    """
    evidence_text = "\n".join([
        f"[{i+1}] {e['who']}: {e['content'][:500]}"
        for i, e in enumerate(evidence)
    ])

    metrics_summary = {
        "component_id": component["id"],
        "title": component["title"],
        "status": component["status"],
        "gain_pts": metrics.get("gain_pts"),
        "pre_pct": metrics.get("pre_pct"),
        "post_pct": metrics.get("post_pct"),
        "helped_most": metrics.get("helped_most"),
        "least_useful": metrics.get("least_useful"),
        "used_as_is": metrics.get("used_as_is"),
        "changed": metrics.get("changed"),
        "skipped": metrics.get("skipped"),
        "learning": metrics.get("learning"),
        "engagement": metrics.get("engagement"),
        "time_right": metrics.get("time_right"),
        "time_too_long": metrics.get("time_too_long"),
        "time_too_short": metrics.get("time_too_short"),
        "curriculum_fit": metrics.get("curriculum_fit"),
        "adaptation_helped": metrics.get("adaptation_helped"),
        "educator_count": metrics.get("educator_count"),
        "learner_count": metrics.get("learner_count"),
    }

    decision_rules = """
DECISION RULES v5 — check in this exact order, first match wins:
Definitions:
  gain = post% minus pre% on linked question (None if no quiz link)
  used = used_as_is + changed
  mostly_used = used > skipped
  mostly_skipped = skipped > used
  time_ok = time_right >= (time_too_long + time_too_short)

1. DROP: (gain is None or gain < 15) AND mostly_skipped.
   Stop here. Do not apply any later rule, even if engagement or other signals look like Adapt.
2. REUSE: gain >= 30 AND learning >= 4 AND mostly_used AND time_ok.
3. ADAPT — any of:
   a. (gain >= 30 or learning >= 4) AND (changed > used_as_is or not time_ok or engagement < 3.5)
   b. engagement >= 4 AND (gain < 15 or learning < 3)
   c. else "mixed signals"

If more than one rule could match, use the first one in this list.
"""

    user_prompt = f"""Component: {component['title']} ({component['status']})
Description: {component['description']}

METRICS:
{json.dumps(metrics_summary, indent=2)}

DECISION RULES (apply them yourself to the metrics):
{decision_rules}

RETRIEVED COMMENTS (id, who, text):
{evidence_text if evidence_text else "(none)"}

Fill in the decision_card tool with your analysis."""

    for attempt in range(len(_RETRY_WAITS) + 1):
        t0 = time.monotonic()
        try:
            response = client.messages.create(
                model=AI_MODEL,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                tools=[_CARD_TOOL],
                tool_choice={"type": "tool", "name": "decision_card"},
                messages=[{"role": "user", "content": user_prompt}],
            )
            latency_ms = int((time.monotonic() - t0) * 1000)

            # Iterate blocks — a thinking-capable model may prepend thinking blocks
            # before the tool_use block, so never assume content[0] is the tool.
            tool_block = next((b for b in response.content if b.type == "tool_use"), None)
            if tool_block is None:
                raise RuntimeError("no tool_use block in response")

            result = dict(tool_block.input)
            if result.get("recommendation") not in ("Reuse", "Adapt", "Drop"):
                raise ValueError(f"invalid recommendation: {result.get('recommendation')!r}")

            return result, _make_usage(response, latency_ms, AI_MODEL)

        except _RETRYABLE as e:
            if attempt < len(_RETRY_WAITS):
                print(f"[llm] {component.get('id')} attempt {attempt + 1} retryable error, retrying in {_RETRY_WAITS[attempt]}s: {str(e)[:120]}")
                time.sleep(_RETRY_WAITS[attempt])
                continue
            raise

    raise RuntimeError("LLM call failed after retries")  # unreachable


def validate_and_fix_quotes(result: dict, evidence: list[dict], keywords: list[str] | None = None) -> dict:
    """
    Check every quote appears verbatim in provided comments.
    Drop any that do not. Returns fixed result.
    """
    valid_quotes = []
    evidence_texts = [e["content"] for e in evidence]

    for quote in result.get("quotes", []):
        text = quote.get("text", "")
        if not text or not any(text in et for et in evidence_texts):
            continue
        # Learner quotes must name this component (attribution guardrail)
        if keywords and quote.get("who") == "Learner" and not any(k.lower() in text.lower() for k in keywords):
            continue
        valid_quotes.append(quote)

    result["quotes"] = valid_quotes[:2]
    return result


def generate_card(component: dict, metrics: dict, evidence: list[dict]) -> dict:
    """
    Generate a single decision card with validation and retry.
    Returns the card dict with an extra '_usage' key for usage stats.
    Caller must pop '_usage' before inserting into the database.
    """
    for attempt in range(2):  # one retry on validation errors
        try:
            result, usage = call_llm(component, metrics, evidence)
            result = validate_and_fix_quotes(result, evidence, component.get("keywords"))
            result["_usage"] = usage
            return result
        except (ValueError, KeyError):
            if attempt == 0:
                continue
            raise
        except Exception:
            raise

    raise RuntimeError("Failed to generate valid card after retry")  # unreachable


def call_override_why(comp: dict, metrics: dict, override_rec: str) -> str:
    """
    Generate a brief factual justification for an override recommendation.
    Returns the 'why' string, or empty string if all attempts fail.
    """
    override_prompt = f"""Component: {comp['title']} ({comp['status']})
Description: {comp['description']}

METRICS (TRUE FACTS):
{json.dumps({k: v for k, v in metrics.items() if k not in ('question', 'status')}, indent=2)}

Write a brief justification (1-2 sentences, under 45 words) for recommending '{override_rec}' for this component.
Use ONLY the true metrics above. Do not invent numbers."""

    for attempt in range(len(_RETRY_WAITS) + 1):
        try:
            response = client.messages.create(
                model=AI_MODEL,
                max_tokens=200,
                system="You write short, factual justifications using only the provided data.",
                tools=[_WHY_TOOL],
                tool_choice={"type": "tool", "name": "justification"},
                messages=[{"role": "user", "content": override_prompt}],
            )
            tool_block = next((b for b in response.content if b.type == "tool_use"), None)
            if tool_block:
                return tool_block.input.get("why", "")
            return ""
        except _RETRYABLE as e:
            if attempt < len(_RETRY_WAITS):
                print(f"[llm] override why attempt {attempt + 1} failed, retrying in {_RETRY_WAITS[attempt]}s: {str(e)[:120]}")
                time.sleep(_RETRY_WAITS[attempt])
                continue
            break
        except Exception:
            break

    return ""
