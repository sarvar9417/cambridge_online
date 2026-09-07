#!/usr/bin/env python3
"""Source-verified 9618 May/June 2026 corpus resume v3.

v2 correctly recovered the 9618/23 short QP heading and the missing 9618/42
mark-scheme row, but its local MS fallback inherited a legacy text regex that
uses the last integer on a pdftotext line as the mark.  In a modern Cambridge
horizontal mark-scheme table the Guidance column may itself end with a number.
For example, published 9618/11 Q4(c)(ii) has mark 3 in the Marks column while
its guidance says "maximum of 2".  The legacy fallback therefore reported 2.

This wrapper keeps every v2 source/SHA/fail-closed gate and only corrects local
fallback mark allocations from the explicit published Marks column discovered
from each page header.  It never changes Edge rows and never invents a mark.
"""
from __future__ import annotations

import json
import re
import runpy
from pathlib import Path
from typing import Any

V2 = runpy.run_path(
    "backend/scripts/full-9618-2026-corpus-backfill-v2.py",
    run_name="full_9618_2026_corpus_backfill_v3_lib",
)
ORIGINAL_LOCAL_MS_ROWS = V2["local_ms_rows"]
NORM_PATH = V2["CLASSIFIER"]["norm_path"]

QUESTION_PATH = re.compile(r"^\s*(\d+(?:\([a-z]\))?(?:\([ivx]+\))?)\s+", re.I)
INTEGER_MARK = re.compile(r"(?<!\d)(\d{1,2})(?!\d)")


def published_marks_from_layout(text_path: Path) -> dict[str, int]:
    """Read question marks only from the table's published Marks column.

    pdftotext -layout preserves the horizontal table columns.  Each page header
    gives the start of ``Marks`` and ``Guidance``; a valid allocation must be a
    single 1..20 integer between those two columns on a question-start row.
    Ambiguous/no-number windows are ignored so the fallback remains fail-closed.
    """
    allocations: dict[str, int] = {}
    marks_x: int | None = None
    guidance_x: int | None = None

    for line in text_path.read_text(errors="ignore").splitlines():
        if all(label in line for label in ("Question", "Answer", "Marks", "Guidance")):
            marks_x = line.find("Marks")
            guidance_x = line.find("Guidance")
            if marks_x < 0 or guidance_x <= marks_x:
                marks_x = guidance_x = None
            continue

        if marks_x is None or guidance_x is None:
            continue
        match = QUESTION_PATH.match(line)
        if not match:
            continue

        candidates = [
            int(token)
            for token in INTEGER_MARK.findall(line[marks_x:guidance_x])
            if 1 <= int(token) <= 20
        ]
        if len(candidates) != 1:
            continue

        path = NORM_PATH(match.group(1))
        mark = candidates[0]
        previous = allocations.get(path)
        if previous is not None and previous != mark:
            raise RuntimeError(f"published_marks_column_conflict:{path}:{previous}:{mark}")
        allocations[path] = mark

    return allocations


def local_ms_rows_v3(ms_pdf: Path, work: Path) -> list[dict[str, Any]]:
    rows = list(ORIGINAL_LOCAL_MS_ROWS(ms_pdf, work))
    text_path = work / f"{ms_pdf.stem}.txt"
    allocations = published_marks_from_layout(text_path)

    corrected: list[dict[str, Any]] = []
    for original in rows:
        row = dict(original)
        path = str(row.get("path") or "")
        published = allocations.get(path)
        if published is not None and int(row.get("marks") or 0) != published:
            old = int(row.get("marks") or 0)
            row["marks"] = published
            print(json.dumps({
                "event": "local_ms_mark_column_corrected",
                "source": ms_pdf.name,
                "path": path,
                "legacyMark": old,
                "publishedMark": published,
            }, separators=(",", ":")), flush=True)
        corrected.append(row)
    return corrected


def main() -> int:
    # v2's main resolves local_ms_rows through its globals at runtime.  Replace
    # only that local fallback; all source download, SHA, reconciliation,
    # classification and transactional apply gates remain the v2 implementation.
    V2["main"].__globals__["local_ms_rows"] = local_ms_rows_v3
    return int(V2["main"]())


if __name__ == "__main__":
    raise SystemExit(main())
