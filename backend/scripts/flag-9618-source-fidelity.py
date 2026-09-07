#!/usr/bin/env python3
"""Flag source-required structures across the entire official 9618 corpus."""
from __future__ import annotations

import json
import runpy
from pathlib import Path

BASE = runpy.run_path(
    "backend/scripts/full-9618-2026-corpus-backfill-v2.py",
    run_name="flag_9618_source_fidelity_lib",
)
RUNNER = BASE["BASE"]["runner"]


def main() -> int:
    rows = []
    for year in range(2021, 2027):
        result = RUNNER(
            "flag_fidelity", {"syllabus_code": "9618", "year": year}, timeout=180
        ).get("result")
        rows.append(result)
        print(json.dumps({"event":"fidelity_flagged","year":year,"result":result}, separators=(",",":")), flush=True)
    report = {"version":"9618-source-fidelity-sweep-v1","years":rows}
    Path("9618-source-fidelity-sweep.json").write_text(
        json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
