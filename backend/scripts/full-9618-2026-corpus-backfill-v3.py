#!/usr/bin/env python3
"""Column-aware 2026 mark-scheme fallback.

V2 correctly fails closed when the Edge and local source parsers disagree.  The
local generic parser, however, can mistake a number in Cambridge's Guidance
column for the printed mark allocation.  This wrapper keeps V2's SHA and total
mark gates, but overrides local row marks only when a value is found inside the
actual printed Marks column identified from that page's table header.
"""
from __future__ import annotations

import re
import runpy
import subprocess
from pathlib import Path
from typing import Any

V2 = runpy.run_path(
    "backend/scripts/full-9618-2026-corpus-backfill-v2.py",
    run_name="full_9618_2026_corpus_backfill_v2_lib",
)
ORIGINAL_LOCAL_MS_ROWS = V2["local_ms_rows"]

PATH_RE = re.compile(r"^\s*(\d{1,2}(?:\([a-z]\))?(?:\([ivx]+\))?)", re.I)
MARK_RE = re.compile(r"(?<!\d)(\d{1,2})(?!\d)")


def norm_path(raw: str) -> str:
    match = re.match(r"^(\d+)(.*)$", raw)
    if not match:
        return raw
    return ".".join([match.group(1), *re.findall(r"\(([^)]+)\)", match.group(2))])


def printed_mark_columns(text: str) -> dict[str, int]:
    """Return path->marks proven from each page's printed Marks column."""
    result: dict[str, int] = {}
    for page in text.split("\f"):
        lines = page.splitlines()
        header = next((
            line for line in lines
            if all(label in line for label in ("Question", "Answer", "Marks", "Guidance"))
        ), None)
        if header is None:
            continue
        marks_start = header.index("Marks")
        guidance_start = header.index("Guidance")
        if guidance_start <= marks_start:
            continue

        for line in lines:
            path_match = PATH_RE.match(line)
            if not path_match or path_match.start(1) >= marks_start:
                continue
            path = norm_path(path_match.group(1))
            # Cambridge centres/right-aligns the mark under the Marks heading.
            # Allow a narrow left tolerance, but never inspect Guidance.
            mark_area = line[max(0, marks_start - 6):guidance_start]
            candidates = [
                int(match.group(1))
                for match in MARK_RE.finditer(mark_area)
                if 1 <= int(match.group(1)) <= 20
            ]
            if len(candidates) != 1:
                continue
            mark = candidates[0]
            previous = result.get(path)
            if previous is not None and previous != mark:
                raise RuntimeError(f"printed_mark_column_conflict:{path}:{previous}:{mark}")
            result[path] = mark
    return result


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
