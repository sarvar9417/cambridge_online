#!/usr/bin/env python3
"""Source-safe matcher v4 for historical Cambridge 9618 mark schemes.

V4 only recovers deterministic false negatives that can be proved against the
exact official MS PDF already pinned by SHA-256:
* generated rubric-group labels are treated as internal structure; any_n_from_m
  still requires an explicit source cap and any thematic label tokens;
* punctuation/layout-only differences can match as an exact contiguous token run;
* short numeric and binary answers can match exactly inside the exact question
  section;
* parser-missed sections can be recovered from the printed question path only
  when the expected mark is visible in the right-hand marks column.

No fuzzy or semantic paraphrase matching is used. Accept/reject/prose requirements
remain source-authoritative. Legacy extract confidence below 0.95 is superseded
only when every other source/structure gate is clean and every grading phrase is
proved by the official source.
"""
from __future__ import annotations

import json
import os
import re
import runpy
from pathlib import Path
from typing import Any

V3 = runpy.run_path(
    "backend/scripts/ms-source-audit-runner-v3.py",
    run_name="ms_source_audit_v4_base",
)
BASE = V3["BASE"]
NORMALIZED = V3["NORMALIZED"]
V3_SUPPORTED = V3["supported_v3"]
V3_AUDIT_SCHEME = V3["audit_scheme_v3"]
ORIGINAL_AUDIT_SCHEME = V3["ORIGINAL_AUDIT_SCHEME"]
MATCHER_VERSION = "9618-ms-source-matcher-v4"

_TOKEN_RE = re.compile(r"[a-z0-9]+", re.I)
_SHORT_NUMBER_RE = re.compile(r"^-?\d{2,}$")
_BINARY_RE = re.compile(r"^[01]{4,}$")
_PRINTED_PATH_RE = re.compile(
    r"^\s*(\d{1,2})(?:\s*\(([a-z])\))?(?:\s*\(([ivx]+)\))?\b",
    re.I,
)
_GENERIC_GROUP_WORDS = {
    "main", "group", "any", "from", "published", "mark", "marks", "point", "points",
    "independent", "completed", "line", "lines", "graduated", "threshold", "thresholds",
    "correct", "answer", "answers", "description", "descriptions", "example", "examples",
    "alternative", "alternatives", "justification", "justifications", "drawback", "drawbacks",
    "benefit", "benefits", "advantage", "advantages", "disadvantage", "disadvantages",
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
}
_NUMBER_WORDS = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
    6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
}


def _tokens(value: object) -> list[str]:
    return [token.lower() for token in _TOKEN_RE.findall(str(value or ""))]


def _contiguous_token_proof(candidate: str, source_text: str) -> bool:
    wanted = _tokens(candidate)
    source = _tokens(source_text)
    if len(wanted) < 4 or len(source) < len(wanted):
        return False
    width = len(wanted)
    return any(source[start : start + width] == wanted for start in range(0, len(source) - width + 1))


def _binary_source_proof(candidate: str, source_text: str) -> bool:
    if not _BINARY_RE.fullmatch(candidate):
        return False
    # Only collapse whitespace between binary digits; punctuation/letters stop a run.
    collapsed = re.sub(r"(?<=[01])\s+(?=[01])", "", str(source_text))
    return re.search(rf"(?<![01]){re.escape(candidate)}(?![01])", collapsed) is not None


def supported_v4(phrase: object, source_text: str) -> tuple[bool, str]:
    ok, key = V3_SUPPORTED(phrase, source_text)
    if ok or not key:
        return ok, key

    if _SHORT_NUMBER_RE.fullmatch(key):
        source_key = NORMALIZED(source_text)
        if re.search(rf"(?<!\d){re.escape(key)}(?!\d)", source_key):
            return True, key

    if _binary_source_proof(key, source_text):
        return True, key

    # Exact lexical order after punctuation/layout removal. This is not fuzzy:
    # every alphanumeric token must be identical and contiguous in the source.
    if _contiguous_token_proof(key, source_text):
        return True, key

    return False, key


def _source_has_cap(source_text: str, required: int, max_marks: int) -> bool:
    source = NORMALIZED(source_text)
    values = {required, max_marks}
    for value in sorted(v for v in values if v > 0):
        word = _NUMBER_WORDS.get(value)
        n = re.escape(str(value))
        patterns = [
            rf"\bmax(?:imum)?\s*{n}\b",
            rf"\bto\s+max(?:imum)?\s*{n}\b",
            rf"\bup\s+to\s+{n}\b",
            rf"\bany\s+{n}\b",
            rf"\b{n}\s+from\b",
        ]
        if word:
            w = re.escape(word)
            patterns.extend([
                rf"\bmax(?:imum)?\s*{w}\b",
                rf"\bto\s+max(?:imum)?\s*{w}\b",
                rf"\bup\s+to\s+{w}\b",
                rf"\bany\s+{w}\b",
                rf"\b{w}\s+from\b",
            ])
        if any(re.search(pattern, source) for pattern in patterns):
            return True
    return False


def _meaningful_group_tokens(label: str) -> list[str]:
    return [token for token in _tokens(label) if token not in _GENERIC_GROUP_WORDS and not token.isdigit()]


def _group_reason_is_internal(scheme: dict[str, Any], source_text: str, detail: str) -> bool:
    if not detail.startswith("group:"):
        return False
    label_key = NORMALIZED(detail.split(":", 1)[1])
    group = next(
        (item for item in (scheme.get("groups") or []) if NORMALIZED(item.get("label")) == label_key),
        None,
    )
    if group is None:
        return False

    # Group labels are canonical graph metadata, not Cambridge grading prose.
    # For a capped pool, however, the cap itself must still be printed in source.
    if str(scheme.get("schemeType")) == "any_n_from_m":
        required = int(group.get("nRequired") or 0)
        max_marks = int(group.get("maxMarks") or 0)
        group_points = [
            point for point in (scheme.get("points") or [])
            if str(point.get("groupId")) == str(group.get("id"))
        ]
        if required <= 0 or max_marks <= 0:
            return False
        if group_points and required < len(group_points) and not _source_has_cap(source_text, required, max_marks):
            return False

        source_tokens = set(_tokens(source_text))
        significant = _meaningful_group_tokens(str(group.get("label") or ""))
        if significant and not all(token in source_tokens for token in significant):
            return False

    return True


def _recalculate_result(result: dict[str, Any], recovered_group_count: int) -> dict[str, Any]:
    evidence = result["evidence"]
    if recovered_group_count:
        evidence["rubricPhrasesChecked"] = max(
            0, int(evidence.get("rubricPhrasesChecked") or 0) - recovered_group_count
        )
    reasons = list(evidence.get("reasons") or [])

    # A legacy confidence heuristic can be superseded only by a fresh exact-source
    # audit in which all grading phrases and every other gate are clean.
    non_confidence = [reason for reason in reasons if reason.get("code") != "low_extract_confidence"]
    checked = int(evidence.get("rubricPhrasesChecked") or 0)
    matched = int(evidence.get("rubricPhrasesMatched") or 0)
    confidence_reasons = [reason for reason in reasons if reason.get("code") == "low_extract_confidence"]
    if confidence_reasons and not non_confidence and checked > 0 and checked == matched:
        reasons = []
        evidence["legacyConfidenceSuperseded"] = True
    else:
        evidence["legacyConfidenceSuperseded"] = False

    evidence["reasons"] = reasons
    evidence["matcherVersion"] = MATCHER_VERSION
    strict = not reasons and checked > 0 and checked == matched
    evidence["strict"] = strict
    result["result"] = "verified" if strict else "needs_review"
    return result


def audit_scheme_v4(
    scheme: dict[str, Any],
    section: dict[str, Any] | None,
    source: dict[str, Any],
) -> dict[str, Any]:
    result = V3_AUDIT_SCHEME(scheme, section, source)
    evidence = result["evidence"]
    source_text = str(section.get("text") if section else "")

    recovered = 0
    kept: list[dict[str, str]] = []
    for reason in list(evidence.get("reasons") or []):
        if reason.get("code") == "rubric_source_text_mismatch" and _group_reason_is_internal(
            scheme, source_text, str(reason.get("detail") or "")
        ):
            recovered += 1
            continue
        kept.append(reason)
    evidence["reasons"] = kept
    evidence["recoveredInternalGroupLabels"] = recovered
    return _recalculate_result(result, recovered)


def _path_from_prefix(match: re.Match[str]) -> str:
    bits = [match.group(1)]
    if match.group(2):
        bits.append(match.group(2).lower())
    if match.group(3):
        bits.append(match.group(3).lower())
    return ".".join(bits)


def _clean_section_lines(lines: list[str]) -> str:
    return "\n".join(
        line for line in lines
        if line.strip()
        and "Cambridge International AS & A Level" not in line
        and not line.lstrip().startswith("©")
    ).strip()


def resolve_section_v4(
    scheme: dict[str, Any],
    pages: list[list[str]],
    parsed: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    path = str(scheme.get("path") or "")
    expected = int(scheme.get("maxMarks") or 0)
    current = parsed.get(path)
    if current is not None and int(current.get("marks") or -1) == expected:
        return current

    for page_no, page in enumerate(pages, 1):
        for start, raw in enumerate(page):
            match = _PRINTED_PATH_RE.match(raw)
            if not match or _path_from_prefix(match) != path:
                continue

            block = [raw]
            for line in page[start + 1 :]:
                next_match = _PRINTED_PATH_RE.match(line)
                if next_match and _path_from_prefix(next_match) != path:
                    break
                block.append(line)

            # The Cambridge Marks column is right-aligned. Do not infer marks from
            # arbitrary digits in prose/code; require the expected value at EOL in
            # the right-hand column of at least one raw layout line.
            mark_proved = False
            for line in block:
                stripped = line.rstrip()
                mark_match = re.search(rf"\b{expected}\s*$", stripped)
                if mark_match and mark_match.start() >= 60:
                    mark_proved = True
                    break
            if not mark_proved:
                continue

            return {
                "page": page_no,
                "marks": expected,
                "text": _clean_section_lines(block),
                "parserFallback": True,
            }
    return current


def audit_source_v4(source: dict[str, Any], root: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    key = f"{source['year']}-{source['series']}-{source['component']}{source['variant']}"
    pdf = root / f"9618-ms-{key}.pdf"
    BASE["download"](str(source["sourceUrl"]), pdf)
    import hashlib
    actual_sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
    if actual_sha != str(source["sourceSha256"]):
        raise RuntimeError(f"source_sha_mismatch:{actual_sha}:{source['sourceSha256']}")

    pages = BASE["pdf_pages"](pdf)
    parsed = BASE["parse_sections"](pages)
    audits: list[dict[str, Any]] = []
    fallback_count = 0
    for scheme in source.get("schemes") or []:
        section = resolve_section_v4(scheme, pages, parsed)
        if section and section.get("parserFallback"):
            fallback_count += 1
        audits.append(audit_scheme_v4(scheme, section, source))

    return audits, {
        "key": key,
        "schemes": len(audits),
        "verified": sum(1 for item in audits if item["result"] == "verified"),
        "needsReview": sum(1 for item in audits if item["result"] != "verified"),
        "parsedSections": len(parsed),
        "parserFallbacks": fallback_count,
    }


# V3 ultimately delegates source audit/main bookkeeping into the V2 globals.
# Patch only deterministic source matching and section resolution; DB recording
# and target-count reconciliation remain unchanged.
ORIGINAL_AUDIT_SCHEME.__globals__["supported"] = supported_v4
BASE["audit_source"] = audit_source_v4
BASE["main"].__globals__["audit_source"] = audit_source_v4


def main() -> int:
    rc = BASE["main"]()
    if os.getenv("SOURCE_AUDIT_RECORD", "").strip().lower() in {"1", "true", "yes"}:
        promotion = BASE["edge"]("promote_verified", timeout=180).get("data")
        question_promotion = BASE["edge"]("promote_questions", timeout=180).get("data")
        output = Path(os.getenv("SOURCE_AUDIT_REPORT", "ms-source-audit-report.json"))
        if output.exists():
            report = json.loads(output.read_text(encoding="utf-8"))
            report["matcherVersion"] = MATCHER_VERSION
            report["promotion"] = promotion
            report["questionPromotion"] = question_promotion
            output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(json.dumps({"promotion": promotion, "questionPromotion": question_promotion}, separators=(",", ":")))
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
