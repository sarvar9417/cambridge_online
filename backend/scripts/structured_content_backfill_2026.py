#!/usr/bin/env python3
"""Run the source-authoritative structured-content v4 planner for 2026 only."""
from __future__ import annotations

import runpy

V4 = runpy.run_path(
    "backend/scripts/structured_content_backfill_v4.py",
    run_name="structured_content_backfill_2026_impl",
)
MAIN = V4["V2"]["V1"]["main"]
ORIGINAL_RUNNER = MAIN.__globals__["runner"]


def scoped_runner(action: str, payload=None, timeout: int = 300):
    body = dict(payload or {})
    if action == "structured_content_bootstrap":
        body["year_from"] = 2026
        body["year_to"] = 2026
    return ORIGINAL_RUNNER(action, body, timeout=timeout)


MAIN.__globals__["runner"] = scoped_runner

if __name__ == "__main__":
    raise SystemExit(MAIN())
