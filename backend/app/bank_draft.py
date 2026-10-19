"""
Question bank drafting (Phase B1).

AI drafts only — do NOT run until source files in app/sources/{component_id}.md
are filled with OceanX text (min 100 words, no PASTE SOURCE TEXT HERE marker).
"""
import json
import time
from pathlib import Path

from app.llm import client, _RETRY_WAITS, _RETRYABLE, _make_usage, AI_MODEL
from app.bank_rules import run_auto_checks

_COMPONENTS_PATH = Path(__file__).parent / "components.json"
_COMPONENTS: list[dict] = json.loads(_COMPONENTS_PATH.read_text(encoding="utf-8"))

# Components that have a quiz_question_id (i.e. linked to a learner quiz question)
DRAFTABLE_COMPONENTS: list[str] = [
    c["id"] for c in _COMPONENTS if c.get("quiz_question_id")
]

SOURCES_DIR = Path(__file__).parent / "sources"
_MIN_SOURCE_WORDS = 100
_PLACEHOLDER = "PASTE SOURCE TEXT HERE"

# Hardcoded existing quiz stems — do not draft duplicates
_EXISTING_QUIZ_QUESTIONS: dict[str, str] = {
    "video-nada": 'What is "blue carbon"?',
    "video-changi-point": "Why did seagrass cover at Changi Point decline?",
    "further-reading-unep": "Since the late 1800s, roughly what share of the world known seagrass area has been lost?",
    "game": "Seagrass meadows store carbon at roughly what rate compared to terrestrial forests?",
    "create-activity": 'In the causal chain activity, what does one decision "ripple through"?',
}

_DRAFT_SYSTEM = (
    "You are a quiz question writer for OceanX Education. "
    "Generate questions ONLY from the source text provided. "
    "Do not use outside knowledge or invented facts. "
    "Every source_excerpt must be copied word-for-word from the source text."
)

_QUESTION_TOOL = {
    "name": "draft_question_bank",
    "description": (
        "Draft question bank items using ONLY the provided source text. "
        "Return exactly 9 items: MCQ easy×2, MCQ medium×2, MCQ hard×2, "
        "short easy×1, short medium×1, short hard×1."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "qtype": {
                            "type": "string",
                            "enum": ["mcq", "short"],
                        },
                        "difficulty": {
                            "type": "string",
                            "enum": ["easy", "medium", "hard"],
                        },
                        "question": {"type": "string"},
                        "options": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": (
                                "Exactly 4 options. Required for mcq; omit for short."
                            ),
                        },
                        "correct_index": {
                            "type": "integer",
                            "minimum": 0,
                            "maximum": 3,
                            "description": (
                                "0-based index of the correct option. Required for mcq."
                            ),
                        },
                        "answer": {
                            "type": "string",
                            "description": (
                                "Model answer, 1-3 sentences. Required for short."
                            ),
                        },
                        "key_points": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": (
                                "2-3 key marking points. Required for short."
                            ),
                        },
                        "source_excerpt": {
                            "type": "string",
                            "description": (
                                "Verbatim phrase from the source text (10-50 words) "
                                "that directly supports this question. "
                                "Copy it exactly — do not paraphrase."
                            ),
                        },
                        "explanation": {
                            "type": "string",
                            "description": "Brief explanation of why the correct answer is correct.",
                        },
                    },
                    "required": ["qtype", "difficulty", "question", "source_excerpt"],
                },
            }
        },
        "required": ["items"],
    },
}


def load_source(component_id: str) -> str:
    """
    Load and validate a source file.
    Raises FileNotFoundError if the file is missing.
    Raises ValueError if the placeholder is still present or the file is too short.
    """
    path = SOURCES_DIR / f"{component_id}.md"
    if not path.exists():
        raise FileNotFoundError(
            f"Source file missing: {path}. "
            f"Create it and paste OceanX text (min {_MIN_SOURCE_WORDS} words)."
        )
    text = path.read_text(encoding="utf-8")
    if _PLACEHOLDER in text:
        raise ValueError(
            f"Source file {path.name} still contains the placeholder. "
            "Replace it with OceanX content before drafting."
        )
    word_count = len(text.split())
    if word_count < _MIN_SOURCE_WORDS:
        raise ValueError(
            f"Source file {path.name} is too short ({word_count} words). "
            f"Minimum is {_MIN_SOURCE_WORDS} words."
        )
    return text


def _call_draft_llm(component: dict, source_text: str) -> tuple[list[dict], dict]:
    """Call the LLM to draft 9 items for one component. Returns (items, usage)."""
    existing_q = _EXISTING_QUIZ_QUESTIONS.get(component["id"], "(none)")
    prompt = (
        f"Component: {component['title']}\n"
        f"Description: {component.get('description', '')}\n\n"
        f"SOURCE TEXT (use ONLY this — no outside facts):\n"
        f"---\n{source_text}\n---\n\n"
        f"EXISTING QUIZ QUESTION (do not duplicate this or its stem):\n"
        f"{existing_q}\n\n"
        "Draft exactly 9 question bank items:\n"
        "  MCQ easy: 2 items\n"
        "  MCQ medium: 2 items\n"
        "  MCQ hard: 2 items\n"
        "  Short easy: 1 item\n"
        "  Short medium: 1 item\n"
        "  Short hard: 1 item\n\n"
        "Rules:\n"
        "1. Base every question solely on the source text.\n"
        "2. source_excerpt: copy a verbatim phrase (10-50 words) that directly supports the question.\n"
        "3. Do not duplicate the existing quiz question.\n"
        "4. MCQ: 4 plausible options, exactly one correct. "
        "Distractors must be clearly wrong to someone who read the source.\n"
        "5. Short: include a model answer (1-3 sentences) and 2-3 key marking points.\n"
        "6. Difficulty: easy = recall/recognition, medium = application/understanding, "
        "hard = analysis/evaluation."
    )

    for attempt in range(len(_RETRY_WAITS) + 1):
        t0 = time.monotonic()
        try:
            response = client.messages.create(
                model=AI_MODEL,
                max_tokens=4096,
                system=_DRAFT_SYSTEM,
                tools=[_QUESTION_TOOL],
                tool_choice={"type": "tool", "name": "draft_question_bank"},
                messages=[{"role": "user", "content": prompt}],
            )
            latency_ms = int((time.monotonic() - t0) * 1000)
            tool_block = next(
                (b for b in response.content if b.type == "tool_use"), None
            )
            if tool_block is None:
                raise RuntimeError("no tool_use block in response")
            items = tool_block.input.get("items", [])
            usage = _make_usage(response, latency_ms, AI_MODEL)
            return items, usage
        except _RETRYABLE as e:
            if attempt < len(_RETRY_WAITS):
                print(
                    f"[bank_draft] {component['id']} attempt {attempt + 1} retrying: "
                    f"{str(e)[:80]}"
                )
                time.sleep(_RETRY_WAITS[attempt])
                continue
            raise

    raise RuntimeError("LLM draft call failed after retries")  # unreachable


def draft_for_component(component: dict, supabase) -> dict:
    """
    Draft 9 question bank items for one component and insert them into the DB.
    Returns: {component_id, drafted, flagged, errors, cost_usd, latency_ms}.
    Raises FileNotFoundError / ValueError if source file is missing or invalid.
    """
    component_id = component["id"]
    source_text = load_source(component_id)  # raises if missing/placeholder/short

    raw_items, usage = _call_draft_llm(component, source_text)

    # Existing questions in this component for duplicate-stem check
    existing_rows = (
        supabase.table("question_bank")
        .select("question")
        .eq("component_id", component_id)
        .execute()
    )
    existing_questions: list[str] = [
        r["question"] for r in (existing_rows.data or [])
    ]

    n = max(len(raw_items), 1)
    per_cost = round(usage["cost_usd"] / n, 6)
    per_in = usage["input_tokens"] // n
    per_out = usage["output_tokens"] // n

    drafted = 0
    flagged = 0
    errors: list[dict] = []

    for item in raw_items:
        try:
            options = item.get("options")
            if isinstance(options, list) and len(options) != 4:
                options = None

            row = {
                "component_id": component_id,
                "qtype": item.get("qtype", "mcq"),
                "difficulty": item.get("difficulty", "medium"),
                "question": item.get("question", ""),
                "options": options,
                "correct_index": item.get("correct_index"),
                "answer": item.get("answer"),
                "key_points": item.get("key_points"),
                "source_excerpt": item.get("source_excerpt", ""),
                "explanation": item.get("explanation"),
                "status": "draft",
                "model": AI_MODEL,
                "input_tokens": per_in,
                "output_tokens": per_out,
                "cost_usd": per_cost,
            }

            passed, notes = run_auto_checks(row, source_text, existing_questions)
            row["auto_check_passed"] = passed
            row["auto_check_notes"] = notes

            supabase.table("question_bank").insert(row).execute()
            existing_questions.append(row["question"])  # avoid within-batch duplicates
            drafted += 1
            if not passed:
                flagged += 1
        except Exception as exc:
            errors.append({
                "question": item.get("question", "")[:60],
                "error": str(exc)[:120],
            })

    return {
        "component_id": component_id,
        "drafted": drafted,
        "flagged": flagged,
        "errors": errors,
        "cost_usd": usage["cost_usd"],
        "latency_ms": usage["latency_ms"],
    }


def draft_components(component_ids: list[str] | None, supabase) -> dict:
    """
    Draft for the specified components, or all draftable ones if None.
    Returns aggregated summary.
    """
    if component_ids is None:
        component_ids = DRAFTABLE_COMPONENTS

    comp_map = {c["id"]: c for c in _COMPONENTS}
    results = []
    total_drafted = 0
    total_flagged = 0
    errors: list[dict] = []

    for cid in component_ids:
        if cid not in comp_map:
            errors.append({"component_id": cid, "error": "unknown component"})
            continue
        try:
            r = draft_for_component(comp_map[cid], supabase)
            results.append(r)
            total_drafted += r["drafted"]
            total_flagged += r["flagged"]
            if r["errors"]:
                errors.extend(r["errors"])
        except (FileNotFoundError, ValueError) as exc:
            errors.append({"component_id": cid, "error": str(exc)})
        except Exception as exc:
            errors.append({"component_id": cid, "error": str(exc)})

    return {
        "drafted": total_drafted,
        "flagged": total_flagged,
        "results": results,
        "errors": errors,
    }
