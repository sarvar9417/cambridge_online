#!/usr/bin/env python3
"""Build deterministic source-backed question dependencies for 9618 2026."""
from __future__ import annotations

import json
import runpy
from pathlib import Path

BASE = runpy.run_path(
    "backend/scripts/full-9618-2026-corpus-backfill-v2.py",
    run_name="reconcile_9618_2026_dependencies_lib",
)
RUNNER = BASE["BASE"]["runner"]


def main() -> int:
    result = RUNNER(
        "reconcile_dependencies", {"syllabus_code":"9618","year":2026}, timeout=180
    ).get("result") or {}
    Path("9618-2026-dependency-report.json").write_text(
        json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8"
    )
    print(json.dumps(result,ensure_ascii=False,separators=(",",":")))
    if int(result.get("unresolvedAnswerDependencies",-1)) != 0:
        return 2
    if int(result.get("unresolvedPracticalDependencies",-1)) != 0:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
