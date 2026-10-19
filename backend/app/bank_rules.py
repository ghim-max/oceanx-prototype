"""
Auto-check rules for the question bank (Phase B1).
Pure functions — no imports from other app modules.
"""
import re

SENSITIVE_KEYWORDS = [
    "religion", "religious", "islam", "christian", "muslim", "hindu",
    "buddhist", "atheist", "race", "racial", "racist", "racism",
    "sex", "sexual", "gender identity", "lgbtq", "queer",
    "politics", "political party", "election", "government policy",
    "drugs", "drug use", "alcohol", "tobacco",
    "violence", "violent", "weapon",
    "suicide", "self-harm",
]


def _norm(text: str) -> str:
    """Collapse all whitespace (including newlines) to single spaces."""
    return re.sub(r'\s+', ' ', text).strip()


def check_source_excerpt(excerpt: str, source_text: str | None) -> tuple[bool, str]:
    if not excerpt or not excerpt.strip():
        return False, "source_excerpt is empty"
    if source_text is None:
        return True, ""  # source not available; skip verbatim check
    # Normalize whitespace in both so line-wrapped source files still match
    if _norm(excerpt) not in _norm(source_text):
        return False, "source_excerpt not found verbatim in source text"
    return True, ""


def check_sensitive(question: str, options: list | None, answer: str | None) -> tuple[bool, str]:
    corpus = question.lower()
    if options:
        corpus += " " + " ".join(o.lower() for o in options if isinstance(o, str))
    if answer:
        corpus += " " + answer.lower()
    for kw in SENSITIVE_KEYWORDS:
        # Word-boundary match to avoid false positives like "race" in "interface"
        if re.search(r'\b' + re.escape(kw) + r'\b', corpus):
            return False, f"sensitive keyword: '{kw}'"
    return True, ""


def check_duplicate_stems(question: str, existing_questions: list[str]) -> tuple[bool, str]:
    stem = question.lower().strip()[:60]
    for eq in existing_questions:
        if eq.lower().strip()[:60] == stem:
            return False, f"duplicate stem: '{stem[:40]}'"
    return True, ""


def check_mcq_completeness(item: dict) -> tuple[bool, str]:
    if item.get("qtype") != "mcq":
        return True, ""
    options = item.get("options")
    if not options or not isinstance(options, list) or len(options) != 4:
        return False, "MCQ must have exactly 4 options"
    if not all(isinstance(o, str) and o.strip() for o in options):
        return False, "MCQ options must be non-empty strings"
    ci = item.get("correct_index")
    if ci is None or not isinstance(ci, int) or not (0 <= ci <= 3):
        return False, "MCQ correct_index must be 0, 1, 2, or 3"
    return True, ""


def check_short_completeness(item: dict) -> tuple[bool, str]:
    if item.get("qtype") != "short":
        return True, ""
    if not item.get("answer") or not str(item["answer"]).strip():
        return False, "short question missing answer"
    kp = item.get("key_points")
    if not kp or not isinstance(kp, list) or len(kp) < 2:
        return False, "short question needs 2-3 key_points"
    return True, ""


def run_auto_checks(
    item: dict,
    source_text: str | None,
    existing_questions: list[str],
) -> tuple[bool, str]:
    """Run all checks. Returns (passed, notes). notes is 'ok' when all pass."""
    failures = []

    ok, msg = check_source_excerpt(item.get("source_excerpt", ""), source_text)
    if not ok:
        failures.append(msg)

    ok, msg = check_sensitive(
        item.get("question", ""),
        item.get("options"),
        item.get("answer"),
    )
    if not ok:
        failures.append(msg)

    ok, msg = check_duplicate_stems(item.get("question", ""), existing_questions)
    if not ok:
        failures.append(msg)

    ok, msg = check_mcq_completeness(item)
    if not ok:
        failures.append(msg)

    ok, msg = check_short_completeness(item)
    if not ok:
        failures.append(msg)

    if failures:
        return False, "; ".join(failures)
    return True, "ok"
