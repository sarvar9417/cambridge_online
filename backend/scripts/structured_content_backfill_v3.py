#!/usr/bin/env python3
"""Canonical source backfill v3.

This wrapper keeps v2's source-authoritative reconstruction and hardens only
question-number recognition for two audited Cambridge layouts:

* numbered pseudocode uses zero-padded line numbers (01, 02, 03...).  These can
  never be Cambridge question numbers and must not advance the question state;
* 2026 0478 PDFs indent real question starts by 8 or 38 columns because of the
  new margin/template geometry.

The detector still requires the next expected question number, meaningful prose
and rejects pseudocode opcodes, so widening the audited indentation bands does
not relax path/mark integrity.
"""
from __future__ import annotations

import re
import runpy

V2 = runpy.run_path(
    "backend/scripts/structured_content_backfill_v2.py",
    run_name="structured_content_backfill_v2_impl",
)
QP = V2["QP"]
PSEUDOCODE_HEADS = QP["PSEUDOCODE_HEADS"]


def main_candidate_v3(raw: str, expected_number: int):
    match = re.match(r"^(\s*)(\d{1,2})\s+(.+)$", raw)
    if not match:
        return None
    token = match.group(2)
    # Cambridge question labels are never zero padded; pseudocode line labels are.
    if len(token) > 1 and token.startswith("0"):
        return None
    indent = len(match.group(1))
    number = int(token)
    rest = match.group(3).strip()
    if number != expected_number:
        return None
    if re.match(r"^hours?\b", rest, re.IGNORECASE):
        return None
    if not re.match(r"^(?:\([a-z]\)|[A-Za-z])", rest, re.IGNORECASE):
        return None

    if indent <= 12:
        pass
    elif 24 <= indent <= 42:
        # New/legacy templates can place real question numbers deep in the page,
        # but short table/data rows must never become question starts.
        words = rest.split()
        if len(rest) < 18 or len(words) < 4:
            return None
    else:
        return None

    first = re.match(r"[A-Za-z]+", rest)
    if first and first.group(0).upper() in PSEUDOCODE_HEADS and first.group(0).isupper():
        return None
    return indent, number, rest


QP["main_candidate"] = main_candidate_v3
QP["detect_events"].__globals__["main_candidate"] = main_candidate_v3

if __name__ == "__main__":
    # Importing v2 has already wired its plan_source into v1's fail-closed
    # orchestration.  Execute that orchestration with the hardened detector.
    raise SystemExit(V2["V1"]["main"]())
