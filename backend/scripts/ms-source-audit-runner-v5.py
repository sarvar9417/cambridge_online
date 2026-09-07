#!/usr/bin/env python3
"""Source-safe matcher v5 for historical Cambridge 9618 mark schemes.

V5 keeps matcher-v4 source identity, mark, PDF and deterministic text gates. It
only removes two false-negative classes that are internal canonical metadata,
not published Cambridge grading prose:
* mark-scheme group labels; for capped any_n_from_m pools the printed cap must
  still be proved by the official source and every mark point is still checked;
* `requires` entries that exactly reference another canonical point code in the
  same scheme; dangling or prose requirements remain source-authoritative.
"""
from __future__ import annotations

import runpy
from typing import Any

V4 = runpy.run_path(
    "backend/scripts/ms-source-audit-runner-v4.py",
    run_name="ms_source_audit_v5_base",
)
NORMALIZED = V4["NORMALIZED"]
V4_AUDIT_SCHEME = V4["audit_scheme_v4"]
V4_AUDIT_SOURCE = V4["audit_source_v4"]
V4_MAIN = V4["main"]
SOURCE_HAS_CAP = V4["_source_has_cap"]
MATCHER_VERSION = "9618-ms-source-matcher-v5"


def _group_is_internal(scheme: dict[str, Any], source_text: str, detail: str) -> bool:
    if not detail.startswith("group:"):
        return False
    label_key = NORMALIZED(detail.split(":", 1)[1])
    group = next(
        (item for item in (scheme.get("groups") or []) if NORMALIZED(item.get("label")) == label_key),
        None,
    )
    if group is None:
        return False

    if str(scheme.get("schemeType")) == "any_n_from_m":
        required = int(group.get("nRequired") or 0)
        max_marks = int(group.get("maxMarks") or 0)
        group_points = [
            point for point in (scheme.get("points") or [])
            if str(point.get("groupId")) == str(group.get("id"))
        ]
        if required <= 0 or max_marks <= 0:
            return False
        if group_points and required < len(group_points):
            return SOURCE_HAS_CAP(source_text, required, max_marks)
    return True


def _requires_is_internal(scheme: dict[str, Any], detail: str) -> bool:
    if not detail.startswith("requires:"):
        return False
    parts = detail.split(":", 2)
    if len(parts) != 3:
        return False
    requirement = NORMALIZED(parts[2])
    if not requirement:
        return False
    point_codes = {
        NORMALIZED(point.get("code"))
        for point in (scheme.get("points") or [])
        if point.get("code")
    }
    return requirement in point_codes


def _recalculate_v5(result: dict[str, Any], recovered: int) -> dict[str, Any]:
    evidence = result["evidence"]
    if recovered:
        evidence["rubricPhrasesChecked"] = max(
            0, int(evidence.get("rubricPhrasesChecked") or 0) - recovered
        )
    reasons = list(evidence.get("reasons") or [])
    checked = int(evidence.get("rubricPhrasesChecked") or 0)
    matched = int(evidence.get("rubricPhrasesMatched") or 0)
    non_confidence = [reason for reason in reasons if reason.get("code") != "low_extract_confidence"]
    confidence_only = any(reason.get("code") == "low_extract_confidence" for reason in reasons)
    if confidence_only and not non_confidence and checked > 0 and checked == matched:
        reasons = []
        evidence["legacyConfidenceSuperseded"] = True
    elif "legacyConfidenceSuperseded" not in evidence:
        evidence["legacyConfidenceSuperseded"] = False

    evidence["reasons"] = reasons
    evidence["matcherVersion"] = MATCHER_VERSION
    strict = not reasons and checked > 0 and checked == matched
    evidence["strict"] = strict
    result["result"] = "verified" if strict else "needs_review"
    return result


def audit_scheme_v5(
    scheme: dict[str, Any], section: dict[str, Any] | None, source: dict[str, Any]
) -> dict[str, Any]:
    result = V4_AUDIT_SCHEME(scheme, section, source)
    evidence = result["evidence"]
    source_text = str(section.get("text") if section else "")

    recovered_groups = 0
    recovered_requires = 0
    kept: list[dict[str, str]] = []
    for reason in list(evidence.get("reasons") or []):
        if reason.get("code") == "rubric_source_text_mismatch":
            detail = str(reason.get("detail") or "")
            if _group_is_internal(scheme, source_text, detail):
                recovered_groups += 1
                continue
            if _requires_is_internal(scheme, detail):
                recovered_requires += 1
                continue
        kept.append(reason)

    evidence["reasons"] = kept
    evidence["recoveredInternalGroupLabelsV5"] = recovered_groups
    evidence["recoveredInternalRequiresV5"] = recovered_requires
    return _recalculate_v5(result, recovered_groups + recovered_requires)


def audit_source_v5(source: dict[str, Any], root):
    V4_AUDIT_SOURCE.__globals__["audit_scheme_v4"] = audit_scheme_v5
    return V4_AUDIT_SOURCE(source, root)


# Reuse v4's paginated, count-reconciled production runner while substituting
# only the matcher function/version. All DB write gates remain unchanged.
V4_MAIN.__globals__["MATCHER_VERSION"] = MATCHER_VERSION
V4_MAIN.__globals__["audit_source_v4"] = audit_source_v5
V4_MAIN.__globals__["_source_failure_rows"].__globals__["MATCHER_VERSION"] = MATCHER_VERSION


def main() -> int:
    return V4_MAIN()


if __name__ == "__main__":
    raise SystemExit(main())
