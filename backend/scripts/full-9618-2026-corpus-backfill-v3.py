#!/usr/bin/env python3
"""Column-aware 2026 mark-scheme fallback.

V2 correctly fails closed when the Edge and local source parsers disagree. The
local generic parser can mistake a number in Cambridge's Guidance column for
the printed allocation. This wrapper keeps V2's source-SHA and exact-total
gates, but overrides local marks only from the printed Marks column.
"""
from __future__ import annotations

import runpy
import subprocess
from pathlib import Path
from typing import Any

V2 = runpy.run_path(
    "backend/scripts/full-9618-2026-corpus-backfill-v2.py",
    run_name="full_9618_2026_corpus_backfill_v2_lib",
)
COLUMN = runpy.run_path(
    "backend/scripts/ms_column_marks.py",
    run_name="9618_ms_column_marks_lib",
)
ORIGINAL_LOCAL_MS_ROWS = V2["local_ms_rows"]
printed_mark_columns = COLUMN["printed_mark_columns"]


def source_column_marks(ms_pdf: Path) -> dict[str, int]:
    proc = subprocess.run(
        ["pdftotext", "-layout", "-enc", "UTF-8", str(ms_pdf), "-"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=120,
    )
    return printed_mark_columns(proc.stdout)


def local_ms_rows(ms_pdf: Path, work: Path) -> list[dict[str, Any]]:
    rows = list(ORIGINAL_LOCAL_MS_ROWS(ms_pdf, work))
    column_marks = source_column_marks(ms_pdf)
    corrected: list[dict[str, Any]] = []
    for row in rows:
        path = str(row.get("path") or "")
        if path in column_marks:
            row = {**row, "marks": column_marks[path]}
        corrected.append(row)
    return corrected


V2["main"].__globals__["local_ms_rows"] = local_ms_rows

if __name__ == "__main__":
    raise SystemExit(V2["main"]())
