#!/usr/bin/env python3
"""Source-safe compatibility wrapper for the Cambridge 9618 mark-scheme audit.

V2 correctly fail-closes source disagreements, but it also treated generated
rubric structure (for example group label ``main`` and point-code dependency
``M1``) as if that literal text had to appear in the published Cambridge mark
scheme. V3 keeps every source/marks/confidence/finding gate and every real
mark-point/accept/reject/prose-requirement proof, while separating internal
structure from source phrases.

The persisted audit version intentionally remains ``9618-ms-source-audit-v2``
because the database RPC contract is unchanged. Evidence records
``matcherVersion=9618-ms-source-matcher-v3`` so reruns are provenance-visible.
"""
from __future__ import annotations

import json
import os
import re
import runpy
from pathlib import Path
from typing import Any

BASE = runpy.run_path(
    "backend/scripts/ms-source-audit-runner.py",
    run_name="ms_source_audit_v3_base",
)
MATCHER_VERSION = "9618-ms-source-matcher-v3"
NORMALIZED = BASE["normalized"]
ORIGINAL_SUPPORTED = BASE["supported"]
ORIGINAL_AUDIT_SCHEME = BASE["audit_scheme"]

_INTERNAL_GROUP_RE = re.compile(r"^(?:main|group\s+\d+)$", re.I)
_POINT_CODE_RE = re.compile(r"^(?:m|mp)\d+$", re.I)
_PATH_PREFIX_RE = re.compile(r"^\d{1,2}(?:\s+[a-z])?(?:\s+[ivx]+)?\s+(.+)$", re.I)


def _whole_token_contains(source: str, candidate: str) -> bool:
    return f" {candidate} " in f" {source} "


def _variants(key: str) -> list[str]:
    variants = [key]
    match = _PATH_PREFIX_RE.match(key)
    if match:
        rest = match.group(1).strip()
        variants.append(rest)
        # Legacy extractor rows can preserve the printed Marks-column value at
        # the end of an otherwise source-faithful answer row.
        trimmed = re.sub(r"\s+\d{1,2}$", "", rest).strip()
        if trimmed and trimmed != rest:
            variants.append(trimmed)

    # Some legacy rows interleave the one-mark column immediately after
    # "1 mark for". The Cambridge answer text is otherwise unchanged.
    for value in list(variants):
        deduped = re.sub(r"\b(\d+)\s+mark\s+for\s+\1\b", r"\1 mark for", value)
        if deduped != value:
            variants.append(deduped)

    out: list[str] = []
    for value in variants:
        value = re.sub(r"\s+", " ", value).strip()
        if value and value not in out:
            out.append(value)
    return out


def supported_v3(phrase: object, source_text: str) -> tuple[bool, str]:
    key = NORMALIZED(phrase)
    if not key:
        return True, key

    # Generated grouping labels and point-code references describe the canonical
    # rubric graph; they are not Cambridge prose and therefore are not source
    # phrases. Their integrity is checked structurally below.
    if _INTERNAL_GROUP_RE.fullmatch(key) or _POINT_CODE_RE.fullmatch(key):
        return True, ""

    # Preserve V2's hard short-fragment guard before allowing any ordinary exact
    # substring match. This prevents incidental values such as "1" from becoming
    # source proof merely because the same digit appears somewhere in the section.
    key_compact = re.sub(r"[^a-z0-9]", "", key)
    if len(key_compact) < 4:
        return ORIGINAL_SUPPORTED(phrase, source_text)

    source_key = NORMALIZED(source_text)
    if key in source_key:
        return True, key

    variants = _variants(key)
    for candidate in variants[1:]:
        compact = re.sub(r"[^a-z0-9]", "", candidate)
        # A short numeric/hex answer is only admissible when it came from an
        # explicit question-path-prefixed legacy row and matches as a whole token
        # inside the exact source section.
        short_exact = bool(_PATH_PREFIX_RE.match(key)) and bool(
            re.fullmatch(r"-?\d{2,}|[0-9a-f]{2,}", candidate, re.I)
        )
        if (len(compact) >= 4 or short_exact) and _whole_token_contains(source_key, candidate):
            return True, candidate

    return ORIGINAL_SUPPORTED(phrase, source_text)


def audit_scheme_v3(
    scheme: dict[str, Any],
    section: dict[str, Any] | None,
    source: dict[str, Any],
) -> dict[str, Any]:
    result = ORIGINAL_AUDIT_SCHEME(scheme, section, source)
    evidence = result["evidence"]
    evidence["matcherVersion"] = MATCHER_VERSION

    point_codes = {
        NORMALIZED(point.get("code"))
        for point in (scheme.get("points") or [])
        if point.get("code")
    }
    internal_checked = 0
    internal_valid = 0
    for point in scheme.get("points") or []:
        for requirement in point.get("requires") or []:
            code = NORMALIZED(requirement)
            if not _POINT_CODE_RE.fullmatch(code):
                continue
            internal_checked += 1
            if code in point_codes:
                internal_valid += 1
            else:
                evidence["reasons"].append({
                    "code": "requires_point_missing",
                    "detail": f"{point.get('code')} requires unknown point {requirement}",
                })

    evidence["internalRequiresChecked"] = internal_checked
    evidence["internalRequiresValid"] = internal_valid
    if evidence["reasons"]:
        result["result"] = "needs_review"
        evidence["strict"] = False
    return result


# The original functions resolve helpers through their globals dictionaries.
ORIGINAL_AUDIT_SCHEME.__globals__["supported"] = supported_v3
BASE["audit_source"].__globals__["audit_scheme"] = audit_scheme_v3
BASE["main"].__globals__["audit_source"] = BASE["audit_source"]


def main() -> int:
    rc = BASE["main"]()
    promotion: dict[str, Any] | None = None
    if os.getenv("SOURCE_AUDIT_RECORD", "").strip().lower() in {"1", "true", "yes"}:
        promotion = BASE["edge"]("promote_verified", timeout=180).get("data")
        output = Path(os.getenv("SOURCE_AUDIT_REPORT", "ms-source-audit-report.json"))
        if output.exists():
            report = json.loads(output.read_text(encoding="utf-8"))
            report["matcherVersion"] = MATCHER_VERSION
            report["promotion"] = promotion
            output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(json.dumps({"promotion": promotion}, separators=(",", ":")))
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
