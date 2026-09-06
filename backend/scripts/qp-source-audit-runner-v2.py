#!/usr/bin/env python3
"""Dynamic wrapper for the full 9618 source-fidelity audit.

The original audit implementation remains the comparison engine. v2 replaces
only its historical fixed corpus constants with the source-backed baseline
returned by the database and optionally narrows execution to one exam year.
"""
from __future__ import annotations

import os
import runpy

AUDIT = runpy.run_path(
    "backend/scripts/qp-source-audit-runner.py",
    run_name="qp_source_audit_v2_impl",
)
MAIN = AUDIT["main"]
GLOBALS = MAIN.__globals__
ORIGINAL_RUNNER = GLOBALS["runner"]
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
