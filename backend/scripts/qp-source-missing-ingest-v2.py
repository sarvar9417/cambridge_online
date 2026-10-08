#!/usr/bin/env python3
"""Page-aware mark-scheme adapter for missing 9618 source ingestion.

The v1 ingestion contract is retained unchanged. This adapter hardens only the
mark-scheme leaf detector: a trailing integer is accepted as a question mark
value when it is aligned with the printed ``Marks`` column on that PDF page.
For the rare Cambridge page that omits the repeated Question/Answer/Marks
header, the row must instead contain an explicit ``mark``/``marks`` cue and the
number must still sit in the far-right mark zone. This prevents continuation
code such as ``NumberRecords += 1`` from becoming a false mark value.
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
HEADERLESS_MARK_ZONE_MIN = 80


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


def _is_trusted_mark_position(line: str, match: re.Match[str], marks_column: int | None) -> bool:
    mark_position = line.rfind(match.group(3))
    if marks_column is not None:
        # On normal Cambridge MS pages the printed digit is at/just to the right
        # of the Marks heading. The +20 window tolerates layout variation while
        # excluding answer/code numerals inside the page body.
        return marks_column <= mark_position <= marks_column + 20

    # Some Cambridge pages omit the repeated table header even though the first
    # question row still carries the actual mark total. Do not infer a column
    # from a neighbouring page: require direct semantic evidence on this row and
    # a far-right position. Code/data continuation rows therefore remain out.
    answer_fragment = line[match.end(2) : match.start(3)]
    return (
        mark_position >= HEADERLESS_MARK_ZONE_MIN
        and re.search(r"\bmarks?\b", answer_fragment, re.IGNORECASE) is not None
    )


def extract_ms_leaves(ms_pdf: Path, expected_marks: int) -> tuple[list[dict[str, Any]], dict[str, int]]:
    lines, marks_columns = _page_aware_lines(BASE["pdftotext_layout"](ms_pdf))
    hits: list[tuple[int, str, str, int]] = []
    seen: dict[str, int] = {}

    for index, line in enumerate(lines):
        match = MS_ROW.match(line)
        if not match or len(match.group(1)) > 6:
            continue
        marks = int(match.group(3))
        if not (1 <= marks <= 20):
            continue
        if not _is_trusted_mark_position(line, match, marks_columns[index]):
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
