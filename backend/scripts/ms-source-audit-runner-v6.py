#!/usr/bin/env python3
"""Source-safe matcher v6 for historical Cambridge 9618 mark schemes.

V6 keeps matcher-v5's exact source identity, SHA, marks, rubric, dependency,
findings and usage gates. It only recovers two deterministic PDF/extraction
false-negative classes:

* short literal answers (for example LAN, HUB, F2, a compact arithmetic/operator
  expression) when that *exact normalized literal* occurs exactly once in the
  resolved official source section; leading/trailing extractor ellipses may be
  removed before the same exact proof;
* a printed question path whose parentheses are malformed in the official PDF
  text extraction (for example ``3(b(iii)``). The relaxed path fallback only
  accepts the exact canonical path token sequence and independently proves the
  section's mark allocation.

No fuzzy similarity, stemming, synonym expansion, semantic paraphrasing or
manual-only promotion is introduced.
"""
from __future__ import annotations

import re
import runpy
from typing import Any

V5 = runpy.run_path(
    "backend/scripts/ms-source-audit-runner-v5.py",
    run_name="ms_source_audit_v6_base",
)
V4 = V5["V4"]
V3 = V4["V3"]
NORMALIZED = V5["NORMALIZED"]
V4_SUPPORTED = V4["supported_v4"]
V5_AUDIT_SCHEME = V5["audit_scheme_v5"]
V4_AUDIT_SOURCE = V5["V4_AUDIT_SOURCE"]
V4_MAIN = V5["V4_MAIN"]
V4_RESOLVE_SECTION = V4["resolve_section_v4"]
CLEAN_SECTION_LINES = V4["_clean_section_lines"]
ORIGINAL_AUDIT_SCHEME = V3["ORIGINAL_AUDIT_SCHEME"]
MATCHER_VERSION = "9618-ms-source-matcher-v6"

_SHORT_TOKEN_RE = re.compile(r"^[a-z][a-z0-9]{1,2}$", re.I)
_NUMERIC_EXPRESSION_RE = re.compile(r"^-?\d+(?:\s*[+\-*/]\s*-?\d+)+$")
_OPERATOR_LIST_RE = re.compile(r"^(?:[+\-*/]\s*){2,}$")
_RELAXED_PRINTED_PATH_RE = re.compile(r"^\s*(\d{1,2})")


def _exact_occurrence_count(candidate: str, source_text: str) -> int:
    key = NORMALIZED(candidate)
    source = NORMALIZED(source_text)
    if not key:
        return 0
    pattern = re.compile(rf"(?<![a-z0-9]){re.escape(key)}(?![a-z0-9])")
    return len(pattern.findall(source))


def _unique_short_literal_proof(candidate: str, source_text: str) -> bool:
    key = NORMALIZED(candidate)
    if not key:
        return False

    # Two/three-character words, identifiers and acronyms are only safe when
    # unique in the exact source section. This deliberately leaves generic short
    # words such as "or" unresolved when they occur more than once.
    if _SHORT_TOKEN_RE.fullmatch(key):
        return _exact_occurrence_count(key, source_text) == 1

    # Short arithmetic expressions / operator lists are source literals rather
    # than prose. Again require exact uniqueness inside the section.
    if _NUMERIC_EXPRESSION_RE.fullmatch(key) or _OPERATOR_LIST_RE.fullmatch(key):
        return _exact_occurrence_count(key, source_text) == 1

    return False


def supported_v6(phrase: object, source_text: str) -> tuple[bool, str]:
    ok, key = V4_SUPPORTED(phrase, source_text)
    if ok or not key:
        return ok, key

    # Legacy extraction can attach visual ellipses to a literal ("XOR...",
    # "... 255"). Only trim edge dots; no internal text is altered.
    trimmed = key.strip(". ")
    if trimmed and trimmed != key:
        ok_trimmed, proved = V4_SUPPORTED(trimmed, source_text)
        if ok_trimmed:
            return True, proved or trimmed
        if _unique_short_literal_proof(trimmed, source_text):
            return True, trimmed

    if _unique_short_literal_proof(key, source_text):
        return True, key

    return False, key


def _path_tokens(path: object) -> list[str]:
    return [part.lower() for part in str(path or "").split(".") if part]


def _relaxed_printed_path(raw: str) -> str | None:
    """Read a path from malformed parenthesis punctuation, never prose.

    This is intentionally used only as a fallback after v4 failed. It requires a
    line to start with a plausible Cambridge question number and to contain an
    opening parenthesis near the start. Page headers such as 9618/42 are excluded.
    """
    if "(" not in raw[:18]:
        return None
    top_match = _RELAXED_PRINTED_PATH_RE.match(raw)
    if not top_match:
        return None
    top = int(top_match.group(1))
    if top < 1 or top > 30:
        return None

    tokens = re.findall(r"[A-Za-z0-9]+", raw[:28])
    if not tokens or tokens[0] != str(top):
        return None
    parts = [tokens[0]]
    if len(tokens) >= 2 and re.fullmatch(r"[A-Za-z]", tokens[1]):
        parts.append(tokens[1].lower())
    if len(tokens) >= 3 and re.fullmatch(r"[ivx]+", tokens[2], re.I):
        parts.append(tokens[2].lower())
    return ".".join(parts) if len(parts) >= 2 else None


def _source_mark_proved(block: list[str], expected: int) -> bool:
    for line in block:
        match = re.search(rf"\b{expected}\s*$", line.rstrip())
        if match and match.start() >= 50:
            return True
    # Some malformed extracted rows merge the marks column with the page footer.
    # For one-mark rows, the official rubric phrase itself is an independent mark
    # allocation proof and is less ambiguous than guessing a column coordinate.
    if expected == 1:
        head = NORMALIZED(" ".join(block[:3]))
        return bool(re.search(r"\bone mark\b|\b1 mark\b", head))
    return False


def resolve_section_v6(
    scheme: dict[str, Any], pages: list[list[str]], parsed: dict[str, dict[str, Any]]
) -> dict[str, Any] | None:
    current = V4_RESOLVE_SECTION(scheme, pages, parsed)
    expected = int(scheme.get("maxMarks") or 0)
    if current is not None and int(current.get("marks") or -1) == expected:
        return current

    path = str(scheme.get("path") or "")
    expected_tokens = _path_tokens(path)
    if len(expected_tokens) < 2:
        return current

    for page_no, page in enumerate(pages, 1):
        for start, raw in enumerate(page):
            if _relaxed_printed_path(raw) != path:
                continue
            block = [raw]
            for line in page[start + 1 :]:
                next_path = _relaxed_printed_path(line)
                if next_path and next_path != path:
                    break
                block.append(line)
            if not _source_mark_proved(block, expected):
                continue
            return {
                "page": page_no,
                "marks": expected,
                "text": CLEAN_SECTION_LINES(block),
                "parserFallback": True,
                "parserFallbackV6": True,
            }
    return current


def audit_scheme_v6(
    scheme: dict[str, Any], section: dict[str, Any] | None, source: dict[str, Any]
) -> dict[str, Any]:
    result = V5_AUDIT_SCHEME(scheme, section, source)
    result["evidence"]["matcherVersion"] = MATCHER_VERSION
    return result


def audit_source_v6(source: dict[str, Any], root):
    # v4's source runner resolves these helpers through its globals dictionary.
    # Substitute only the v6 section resolver and rubric matcher wrapper.
    V4_AUDIT_SOURCE.__globals__["resolve_section_v4"] = resolve_section_v6
    V4_AUDIT_SOURCE.__globals__["audit_scheme_v4"] = audit_scheme_v6
    return V4_AUDIT_SOURCE(source, root)


# The original audit primitive also resolves `supported` dynamically.
ORIGINAL_AUDIT_SCHEME.__globals__["supported"] = supported_v6

# Reuse v4's paginated, count-reconciled production runner and all write gates.
V4_MAIN.__globals__["MATCHER_VERSION"] = MATCHER_VERSION
V4_MAIN.__globals__["audit_source_v4"] = audit_source_v6
V4_MAIN.__globals__["_source_failure_rows"].__globals__["MATCHER_VERSION"] = MATCHER_VERSION


def main() -> int:
    return V4_MAIN()


if __name__ == "__main__":
    raise SystemExit(main())
