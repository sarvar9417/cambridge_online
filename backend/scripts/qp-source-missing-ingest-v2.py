#!/usr/bin/env python3
"""Page-aware mark-scheme adapter for missing 9618 source ingestion.

The v1 ingestion contract is retained unchanged. This adapter hardens only the
mark-scheme leaf detector: a trailing integer is normally accepted as a
question mark value only when it is aligned with the printed ``Marks`` column
on that PDF page. Some Cambridge continuation pages omit the Question/Answer/
Marks header even though a new scored question starts there; for those pages we
reuse the document's median printed Marks-column position, require a shallow
question-row indent, and keep a bounded right-side window. This preserves the
fail-closed rejection of answer/code numbers such as ``1 mark each to max 6``.
"""
from __future__ import annotations

import re
import runpy
from pathlib import Path
from statistics import median
from typing import Any

BASE = runpy.run_path(
    "backend/scripts/qp-source-missing-ingest-v1.py",
    run_name="qp_source_missing_ingest_v1_impl",
)
MS_ROW = BASE["MS_ROW"]
HEADER_MARK_WINDOW = 20
HEADERLESS_MARK_WINDOW = 32
HEADERLESS_MAX_INDENT = 8


def _page_aware_lines(text: str) -> tuple[list[str], list[int | None], list[bool]]:
    pages = text.split("\f")
    page_headers: list[int | None] = []
    trusted_columns: list[int] = []
    for page in pages:
        marks_column: int | None = None
        for line in page.splitlines():
            if "Question" in line and "Answer" in line and "Marks" in line:
                marks_column = line.rfind("Marks")
                trusted_columns.append(marks_column)
                break
        page_headers.append(marks_column)

    fallback_column = int(round(median(trusted_columns))) if trusted_columns else None
    lines: list[str] = []
    marks_columns: list[int | None] = []
    headerless_flags: list[bool] = []
    for page, page_header in zip(pages, page_headers, strict=True):
        effective_column = page_header if page_header is not None else fallback_column
        for line in page.splitlines():
            lines.append(line)
            marks_columns.append(effective_column)
            headerless_flags.append(page_header is None)
        # Keep page boundaries in guidance segmentation without letting content
        # from one page become part of the next scored row.
        lines.append("")
        marks_columns.append(None)
        headerless_flags.append(False)
    return lines, marks_columns, headerless_flags


def extract_ms_leaves(ms_pdf: Path, expected_marks: int) -> tuple[list[dict[str, Any]], dict[str, int]]:
    lines, marks_columns, headerless_flags = _page_aware_lines(BASE["pdftotext_layout"](ms_pdf))
    hits: list[tuple[int, str, str, int]] = []
    seen: dict[str, int] = {}

    for index, line in enumerate(lines):
        match = MS_ROW.match(line)
        if not match or len(match.group(1)) > 6:
            continue
        marks_column = marks_columns[index]
        if marks_column is None:
            # No trustworthy Marks-column anchor exists anywhere in the document.
            continue
        marks = int(match.group(3))
        if not (1 <= marks <= 20):
            continue
        mark_position = line.rfind(match.group(3))
        headerless = headerless_flags[index]
        window = HEADERLESS_MARK_WINDOW if headerless else HEADER_MARK_WINDOW
        # Headerless continuation pages get a wider but still right-side-bounded
        # window. They must also look like a real question row, not an indented
        # answer/guidance line that happens to begin with a number.
        if headerless and len(match.group(1)) > HEADERLESS_MAX_INDENT:
            continue
        if mark_position < marks_column or mark_position > marks_column + window:
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
