#!/usr/bin/env python3
"""Source-verified 9618 May/June 2026 corpus resume v3.

v2 correctly recovered the 9618/23 short QP heading and the missing 9618/42
mark-scheme row, but its local MS fallback inherited a legacy text regex that
uses the last integer on a pdftotext line as the mark. In a modern Cambridge
horizontal mark-scheme table the Guidance column may itself end with a number.
For example, published 9618/11 Q4(c)(ii) has mark 3 in the Marks column while
its guidance says "maximum of 2". The legacy fallback therefore reported 2.

This wrapper keeps every v2 source/SHA/fail-closed gate. It corrects local
fallback mark allocations from the explicit published Marks column. When the
Edge parser already supplies the exact expected total, local parsing is used as
an overlap cross-check only and can never add an extra fallback row. Local-only
rows are considered only when the Edge total is incomplete.
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
ORIGINAL_RECONCILE_MS_ROWS = V2["reconcile_ms_rows"]
NORM_PATH = V2["CLASSIFIER"]["norm_path"]

QUESTION_PATH = re.compile(r"^\s*(\d+(?:\([a-z]\))?(?:\([ivx]+\))?)\s+", re.I)
INTEGER_MARK = re.compile(r"(?<!\d)(\d{1,2})(?!\d)")


def published_marks_from_layout(text_path: Path) -> dict[str, int]:
    """Read question marks only from the table's published Marks column.

    pdftotext -layout preserves the horizontal table columns. Each page header
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


def reconcile_ms_rows_v3(
    edge_rows: list[dict[str, Any]],
    local_rows: list[dict[str, Any]],
    expected_marks: int,
) -> tuple[list[dict[str, Any]], list[str]]:
    """Keep a complete Edge extraction closed against local-only false positives.

    If Edge already totals exactly the paper mark, the fallback has no missing
    marks to recover. It may still validate overlapping paths; any overlapping
    mark disagreement remains a hard error. Sparse/local-only rows are ignored in
    this complete-Edge case. If Edge is short, defer to v2's source reconciliation
    so a SHA-pinned local row can recover the missing mark(s), as for 9618/42.
    """
    edge_total = sum(int(row.get("marks") or 0) for row in edge_rows)
    if edge_total != expected_marks:
        return ORIGINAL_RECONCILE_MS_ROWS(edge_rows, local_rows, expected_marks)

    local_by_path = {str(row.get("path") or ""): row for row in local_rows}
    for edge in edge_rows:
        path = str(edge.get("path") or "")
        local = local_by_path.get(path)
        if local is None:
            continue
        edge_mark = int(edge.get("marks") or 0)
        local_mark = int(local.get("marks") or 0)
        if edge_mark != local_mark:
            raise RuntimeError(f"ms_source_disagreement:{path}:edge={edge_mark}:local={local_mark}")

    return list(edge_rows), []


def main() -> int:
    # v2's main resolves these helpers through its globals at runtime. Replace
    # only the local fallback and reconciliation policy; all source download,
    # SHA, classification, exact-total and transactional apply gates remain v2.
    V2["main"].__globals__["local_ms_rows"] = local_ms_rows_v3
    V2["main"].__globals__["reconcile_ms_rows"] = reconcile_ms_rows_v3
    return int(V2["main"]())


if __name__ == "__main__":
    raise SystemExit(main())
