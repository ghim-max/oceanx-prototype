"""RAG stage 3: generate the decision card from facts + retrieved feedback.

The model gets the metrics, the decision rules text and the retrieved
comments, and decides Reuse / Adapt / Drop on its own. It is NOT told the
rule-based answer; pipeline.py compares the two afterwards (guardrail).
"""
import json
import time
from typing import Optional
from openai import OpenAI
from app.config import OPENROUTER_API_KEY, OPENROUTER_MODEL, OPENROUTER_FALLBACK_MODELS

# OpenRouter via OpenAI client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY or "not-set",  # hosted read-only backend has no key
)

SYSTEM_PROMPT = """You are an analyst for OceanX Education content managers.
Use only the facts given. Never invent numbers or quotes.
Quotes must be copied exactly from the provided comments.
Only use a comment if it is clearly about THIS component. Never mention or describe comments about other activities.
For Fixed content, "Adapt" means change how it is used (guiding question, timing, position), not edit the asset.
Return only valid JSON matching the schema."""

def call_llm(component: dict, metrics: dict, evidence: list[dict]) -> dict:
    """
    Call LLM with component facts, metrics, rules, and retrieved comments.
    Returns parsed JSON with recommendation, why, evidence, quotes, suggested_action.
    Retries on 429 up to 3 times with 5s wait.
    Validates JSON and quotes. Retries once on invalid JSON.
    """
    # Prepare the user prompt
    evidence_text = "\n".join([
        f"[{i+1}] {e['who']}: {e['content'][:500]}"
        for i, e in enumerate(evidence)
    ])
    
    # Build metrics summary for the prompt
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
DECISION RULES v5:
- gain = post % minus pre % on linked question (None if no question)
- used = used_as_is + changed; mostly_used = used > skipped; mostly_skipped = skipped > used
- time_ok = time_right >= (time_too_long + time_too_short)
- REUSE: gain >= 30 and learning >= 4 and mostly_used and time_ok
- ADAPT if either:
    (gain >= 30 or learning >= 4) and (changed > used_as_is or not time_ok or engagement < 3.5)
    engagement >= 4 and ((gain is not None and gain < 15) or (learning is not None and learning < 3))
- DROP: (gain is None or gain < 15) and mostly_skipped
- else: Adapt with reason "mixed signals"
"""

    user_prompt = f"""Component: {component['title']} ({component['status']})
Description: {component['description']}

METRICS:
{json.dumps(metrics_summary, indent=2)}

DECISION RULES (apply them yourself to the metrics):
{decision_rules}

RETRIEVED COMMENTS (id, who, text):
{evidence_text if evidence_text else "(none)"}

Return JSON only:
{{
  "recommendation": "Reuse" | "Adapt" | "Drop",
  "why": "one or two plain sentences under 45 words",
  "evidence": ["3-4 short strings each with a real number from the facts"],
  "quotes": [{{"text": "exact quote from comments", "who": "Learner" | "Educator"}}] (max 2),
  "suggested_action": "one short sentence"
}}"""

    models = [OPENROUTER_MODEL] + OPENROUTER_FALLBACK_MODELS
    extra_body = {"models": models}

    waits = [10, 20, 40]  # seconds, used on HTTP 429 from free models
    for attempt in range(len(waits) + 1):
        try:
            response = client.chat.completions.create(
                model=OPENROUTER_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                extra_body=extra_body,
                temperature=0.2,
            )
            # Free models sometimes return an empty reply (no choices / no content)
            if not getattr(response, "choices", None) or not response.choices[0].message.content:
                raise RuntimeError("empty reply from model")
            content = response.choices[0].message.content.strip()
            first, last = content.find("{"), content.rfind("}")
            if first != -1 and last > first:
                content = content[first:last + 1]
            result = json.loads(content)
            return result
        except Exception as e:
            msg = str(e).lower()
            temporary = ("429" in msg or "rate limit" in msg or "empty reply" in msg
                         or "nonetype" in msg or "expecting value" in msg or "503" in msg)
            if temporary and attempt < len(waits):
                print(f"[llm] {component.get('id')} attempt {attempt + 1} failed, retrying: {str(e)[:150]}")
                time.sleep(waits[attempt])
                continue
            raise

    raise RuntimeError("LLM call failed after retries")

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
    """
    for attempt in range(2):  # One retry on invalid JSON
        try:
            result = call_llm(component, metrics, evidence)
            result = validate_and_fix_quotes(result, evidence, component.get("keywords"))
            return result
        except json.JSONDecodeError:
            if attempt == 0:
                continue
            raise
        except Exception:
            raise
    
    raise RuntimeError("Failed to generate valid JSON after retry")