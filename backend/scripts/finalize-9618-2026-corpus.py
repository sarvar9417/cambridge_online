#!/usr/bin/env python3
"""Promote only fully source-verified 9618 2026 leaves and assert release integrity."""
from __future__ import annotations

import json
import runpy
from pathlib import Path

INGEST = runpy.run_path(
    "backend/scripts/full-9618-2026-corpus-backfill-v2.py",
    run_name="full_9618_2026_finalize_lib",
)
RUNNER = INGEST["BASE"]["runner"]


def main() -> int:
    fidelity = RUNNER(
        "flag_fidelity", {"syllabus_code": "9618", "year": 2026}, timeout=180
    ).get("result")
    approval = RUNNER(
        "approve", {"syllabus_code": "9618", "year": 2026}, timeout=180
    ).get("result") or {}

    verified = None
    if int(approval.get("stillBlocked", -1)) == 0:
        verified = RUNNER(
            "assert_year", {"syllus_code":"9618","syllabus_code":"9618","year":2026}, timeout=180
        ).get("result")

    report = {"fidelity": fidelity, "approval": approval, "yearGate": verified}
    Path("9618-2026-finalization-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, separators=(",", ":")))
    if int(approval.get("stillBlocked", -1)) != 0:
        return 2
    if not isinstance(verified, dict) or verified.get("verified") is not True:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
