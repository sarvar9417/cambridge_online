#!/usr/bin/env python3
"""Page-aware mark-scheme adapter for missing 9618 source ingestion.

The v1 ingestion contract is retained unchanged. This adapter hardens only the
mark-scheme leaf detector: a trailing integer is accepted as a question mark
value only when it is aligned with the printed ``Marks`` column on that PDF
page. This prevents continuation code such as ``NumberRecords += 1`` from being
misread as a second mark value for a repeated question label.
"""
from __future__ import annotations

import re
import runpy
from pathlib import Path
from typing import Any

BASE = runpy.run_path(
    "backend/scripts/qp-source-missing-ingest-v1.py",
    run_name="qp_source_missing_ingest_v1_impl",
)
MS_ROW = BASE["MS_ROW"]


def _page_aware_lines(text: str) -> tuple[list[str], list[int | None]]:
    lines: list[str] = []
    marks_columns: list[int | None] = []
    for page in text.split("\f"):
        page_lines = page.splitlines()
        marks_column: int | None = None
        for line in page_lines:
            if "Question" in line and "Answer" in line and "Marks" in line:
                marks_column = line.rfind("Marks")
                break
        for line in page_lines:
            lines.append(line)
            marks_columns.append(marks_column)
        # Keep page boundaries in guidance segmentation without letting a header
        # position leak into the next page.
        lines.append("")
        marks_columns.append(None)
    return lines, marks_columns


def extract_ms_leaves(ms_pdf: Path, expected_marks: int) -> tuple[list[dict[str, Any]], dict[str, int]]:
    lines, marks_columns = _page_aware_lines(BASE["pdftotext_layout"](ms_pdf))
    hits: list[tuple[int, str, str, int]] = []
    seen: dict[str, int] = {}

    for index, line in enumerate(lines):
        match = MS_ROW.match(line)
        if not match or len(match.group(1)) > 6:
            continue
        marks_column = marks_columns[index]
        if marks_column is None:
            # Fail closed: a numeric suffix is not a trusted mark unless the
            # page exposes the Cambridge Marks-column anchor.
            continue
        marks = int(match.group(3))
        if not (1 <= marks <= 20):
            continue
        mark_position = line.rfind(match.group(3))
        # In audited Cambridge layouts the mark digit is at/just to the right of
        # the Marks heading. A generous +20 character window tolerates layout
        # variation while rejecting answer/code numbers far inside the page.
        if mark_position < marks_column or mark_position > marks_column + 20:
            continue

        token = match.group(2)
        path = BASE["path_from_token"](token)
        if path in seen:
            if seen[path] != marks:
                raise ValueError(f"ms_conflicting_marks:{path}:{seen[path]}:{marks}")
            continue
        seen[path] = marks
        hits.append((index, token, path, marks))

    if not hits:
        raise ValueError("ms_no_marked_leaves")
    total = sum(item[3] for item in hits)
    if total != expected_marks:
        raise ValueError(
            f"ms_total_mark_gate_failed:{total}:{expected_marks}:"
            + ",".join(f"{item[2]}={item[3]}" for item in hits)
        )

    leaves: list[dict[str, Any]] = []
    for pos, (start, token, path, marks) in enumerate(hits):
        end = hits[pos + 1][0] if pos + 1 < len(hits) else len(lines)
        guidance = BASE["clean_guidance"](lines[start:end], token, marks)
        leaves.append({"path": path, "marks": marks, "msGuidance": guidance})
    return leaves, {item["path"]: int(item["marks"]) for item in leaves}


# build_manifest is defined in the v1 module and resolves extract_ms_leaves from
# its globals at call time. Replace only that dependency; every SHA, all-paper,
# QP parser and guarded-apply gate remains the proven v1 implementation.
BASE["build_manifest"].__globals__["extract_ms_leaves"] = extract_ms_leaves
MAIN = BASE["main"]

if __name__ == "__main__":
    raise SystemExit(MAIN())
