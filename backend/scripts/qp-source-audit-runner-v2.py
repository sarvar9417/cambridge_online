#!/usr/bin/env python3
"""Dynamic wrapper for the full 9618 source-fidelity audit.

The original audit implementation remains the comparison engine. v2 replaces
its historical fixed corpus constants with the source-backed database baseline,
uses the production v3 source parser, and optionally narrows execution to one
exam year.
"""
from __future__ import annotations

import os
import re
import runpy

AUDIT = runpy.run_path(
    "backend/scripts/qp-source-audit-runner.py",
    run_name="qp_source_audit_v2_impl",
)
PARSER = runpy.run_path(
    "backend/scripts/qp-source-repair-v3.py",
    run_name="qp_source_repair_v3_for_dynamic_audit",
)

# qp-source-repair-v3 intentionally exposes parser transforms at its own module
# level while keeping the external pdftotext runner in its v2 BASE module.  The
# audit comparison engine predates that split and still calls
# PARSER["pdftotext_layout"].  Re-export the exact production helper instead of
# maintaining a second PDF extraction path in the audit wrapper.
if "pdftotext_layout" not in PARSER:
    PARSER["pdftotext_layout"] = PARSER["BASE"]["pdftotext_layout"]

PSEUDOCODE_HEADS = PARSER["PSEUDOCODE_HEADS"]


def main_candidate_current(raw: str, expected_number: int):
    match = re.match(r"^(\s*)(\d{1,2})\s+(.+)$", raw)
    if not match:
        return None
    token = match.group(2)
    if len(token) > 1 and token.startswith("0"):
        return None
    indent = len(match.group(1))
    number = int(token)
    rest = match.group(3).strip()
    if number != expected_number or re.match(r"^hours?\b", rest, re.I):
        return None
    if not re.match(r"^(?:\([a-z]\)|[A-Za-z])", rest, re.I):
        return None
    if indent <= 12:
        pass
    elif 24 <= indent <= 42:
        if len(rest) < 18 or len(rest.split()) < 4:
            return None
    else:
        return None
    first = re.match(r"[A-Za-z]+", rest)
    if first and first.group(0).upper() in PSEUDOCODE_HEADS and first.group(0).isupper():
        return None
    return indent, number, rest


PARSER["detect_events"].__globals__["main_candidate"] = main_candidate_current
MAIN = AUDIT["main"]
GLOBALS = MAIN.__globals__
ORIGINAL_RUNNER = GLOBALS["runner"]
GLOBALS["PARSER"] = PARSER
GLOBALS["AUDIT_VERSION"] = "9618-source-audit-v2"


def dynamic_runner(action: str, timeout: int = 180):
    response = ORIGINAL_RUNNER(action, timeout=timeout)
    if action != "source_audit_bootstrap":
        return response
    data = dict(response["data"])
    sources = list(data.get("sources") or [])
    year_filter = os.getenv("SOURCE_AUDIT_YEAR", "").strip()
    if year_filter:
        year = int(year_filter)
        sources = [source for source in sources if int(source["year"]) == year]
        if not sources:
            raise RuntimeError(f"source_audit_year_empty:{year}")
        data["sources"] = sources
        data["paperCount"] = len(sources)
        data["leafCount"] = sum(len(source.get("leaves") or []) for source in sources)
        data["marks"] = sum(
            sum(int(leaf["marks"]) for leaf in source.get("leaves") or [])
            for source in sources
        )
    GLOBALS["EXPECTED_PAPERS"] = int(data.get("paperCount", -1))
    GLOBALS["EXPECTED_LEAVES"] = int(data.get("leafCount", -1))
    GLOBALS["EXPECTED_MARKS"] = int(data.get("marks", -1))
    response = dict(response)
    response["data"] = data
    return response


GLOBALS["runner"] = dynamic_runner

if __name__ == "__main__":
    raise SystemExit(MAIN())
