#!/usr/bin/env python3
"""Canonical source backfill v4.

v3 correctly rejected zero-padded pseudocode line numbers and accepted audited
Cambridge indentation bands, but it still rejected a genuine 2026 9618 heading:
"Study the pseudocode." because the deep-indented prose threshold required four
words. The detector already requires the exact next question number and an
alphabetic task phrase, so two meaningful words are sufficient without allowing
numeric table/trace rows to advance question state.
"""
from __future__ import annotations

import re
import runpy

V3 = runpy.run_path(
    "backend/scripts/structured_content_backfill_v3.py",
    run_name="structured_content_backfill_v3_impl_for_v4",
)
V2 = V3["V2"]
QP = V2["QP"]
PSEUDOCODE_HEADS = V3["PSEUDOCODE_HEADS"]


def main_candidate_v4(raw: str, expected_number: int):
    match = re.match(r"^(\s*)(\d{1,2})\s+(.+)$", raw)
    if not match:
        return None
    token = match.group(2)
    if len(token) > 1 and token.startswith("0"):
        return None
    indent = len(match.group(1))
    number = int(token)
    rest = match.group(3).strip()
    if number != expected_number or re.match(r"^hours?\b", rest, re.IGNORECASE):
        return None
    if not re.match(r"^(?:\([a-z]\)|[A-Za-z])", rest, re.IGNORECASE):
        return None

    if indent <= 12:
        pass
    elif 24 <= indent <= 42:
        if len(rest) < 8 or len(rest.split()) < 2:
            return None
    else:
        return None

    first = re.match(r"[A-Za-z]+", rest)
    if first and first.group(0).upper() in PSEUDOCODE_HEADS and first.group(0).isupper():
        return None
    return indent, number, rest


QP["main_candidate"] = main_candidate_v4
QP["detect_events"].__globals__["main_candidate"] = main_candidate_v4

if __name__ == "__main__":
    raise SystemExit(V2["V1"]["main"]())
