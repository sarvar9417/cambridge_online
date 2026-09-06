#!/usr/bin/env python3
"""Attach newly repaired source visuals to existing canonical 9618 content."""
from __future__ import annotations

import json
import runpy
from pathlib import Path

BASE = runpy.run_path(
    "backend/scripts/full-9618-2026-corpus-backfill-v2.py",
    run_name="sync_9618_repaired_assets_lib",
)
RUNNER = BASE["BASE"]["runner"]


def main() -> int:
    result = RUNNER(
        "sync_structured_assets",
        {"syllabus_code":"9618","year_from":2021,"year_to":2026},
        timeout=180,
    ).get("result") or {}
    Path("9618-source-asset-sync.json").write_text(
        json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8"
    )
    print(json.dumps(result,ensure_ascii=False,separators=(",",":")))
    return 0 if int(result.get("remainingUnreferencedVisualAssets",-1)) == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
