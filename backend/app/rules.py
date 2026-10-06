"""Guardrail: rule-based check of the AI recommendation (decision rules v5).

Never sent to the model. Used only to flag disagreements (guardrail_ok).
"""
from typing import Optional
from pydantic import BaseModel

class RuleResult(BaseModel):
    recommendation: str  # "Reuse" | "Adapt" | "Drop"
    reasons: list[str]

def decide_recommendation(
    gain_pts: Optional[float],
    learning: Optional[float],
    engagement: Optional[float],
    used_as_is: int,
    changed: int,
    skipped: int,
    time_right: int,
    time_too_long: int,
    time_too_short: int,
) -> RuleResult:
    """
    Decision rules v5. Thresholds are fixed.
    Returns recommendation and list of reason strings (for cross-check).
    """
    used = used_as_is + changed
    mostly_used = used > skipped
    mostly_skipped = skipped > used

    time_off = time_too_long + time_too_short
    time_ok = time_right >= time_off

    reasons = []

    # REUSE: gain >= 30 and learning >= 4 and mostly_used and time_ok
    if (
        gain_pts is not None
        and gain_pts >= 30
        and learning is not None
        and learning >= 4
        and mostly_used
        and time_ok
    ):
        reasons.append("gain >= 30")
        reasons.append("learning >= 4")
        reasons.append("mostly used")
        reasons.append("time ok")
        return RuleResult(recommendation="Reuse", reasons=reasons)

    # ADAPT condition 1: (gain >= 30 or learning >= 4) and (changed > used_as_is or not time_ok or engagement < 3.5)
    adapt_cond1 = False
    if (
        (gain_pts is not None and gain_pts >= 30)
        or (learning is not None and learning >= 4)
    ) and (
        changed > used_as_is
        or not time_ok
        or (engagement is not None and engagement < 3.5)
    ):
        adapt_cond1 = True
        if gain_pts is not None and gain_pts >= 30:
            reasons.append("gain >= 30")
        if learning is not None and learning >= 4:
            reasons.append("learning >= 4")
        if changed > used_as_is:
            reasons.append("changed > used_as_is")
        if not time_ok:
            reasons.append("time not ok")
        if engagement is not None and engagement < 3.5:
            reasons.append("engagement < 3.5")

    # ADAPT condition 2: engagement >= 4 and ((gain is not None and gain < 15) or (learning is not None and learning < 3))
    adapt_cond2 = False
    if engagement is not None and engagement >= 4:
        if (gain_pts is not None and gain_pts < 15) or (learning is not None and learning < 3):
            adapt_cond2 = True
            reasons.append("engagement >= 4")
            if gain_pts is not None and gain_pts < 15:
                reasons.append("gain < 15")
            if learning is not None and learning < 3:
                reasons.append("learning < 3")

    if adapt_cond1 or adapt_cond2:
        return RuleResult(recommendation="Adapt", reasons=reasons)

    # DROP: (gain is None or gain < 15) and mostly_skipped
    if (gain_pts is None or gain_pts < 15) and mostly_skipped:
        if gain_pts is None:
            reasons.append("no gain data")
        else:
            reasons.append("gain < 15")
        reasons.append("mostly skipped")
        return RuleResult(recommendation="Drop", reasons=reasons)

    # Else: Adapt with mixed signals
    reasons.append("mixed signals")
    return RuleResult(recommendation="Adapt", reasons=reasons)