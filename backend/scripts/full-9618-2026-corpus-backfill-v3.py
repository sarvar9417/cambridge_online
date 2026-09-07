#!/usr/bin/env python3
"""Final source-safe wrapper for the 9618 May/June 2026 corpus backfill.

v2 correctly added a SHA-verified local MS fallback for PDFs whose Edge text
layout omits a mark row. It was, however, comparing that coarse local parser
against every Edge row even when Edge already had the complete 75-mark paper.
A guidance sentence ending in a digit can then be mistaken for the Marks column
by the legacy local parser (for example 9618/11 Q4(c)(ii): official mark = 3,
guidance says "maximum of 2").

v3 treats the Edge extraction as authoritative for paths it already extracted
and invokes the local SHA-verified fallback only to supply paths absent from an
incomplete Edge extraction. The merged paper must still total the exact expected
marks, so the fallback cannot silently change an existing Edge mark or create an
under/over-marked paper.
"""
from __future__ import annotations

import runpy
from typing import Any

V2 = runpy.run_path(
    "backend/scripts/full-9618-2026-corpus-backfill-v2.py",
    run_name="full_9618_2026_corpus_backfill_v2_lib",
)


def reconcile_ms_rows_v3(
    edge_rows: list[dict[str, Any]],
    fallback_rows: list[dict[str, Any]],
    expected_marks: int,
) -> tuple[list[dict[str, Any]], list[str]]:
    """Use fallback only for genuinely missing Edge paths; require exact total."""
    merged: dict[str, dict[str, Any]] = {}
    order: list[str] = []

    for row in edge_rows:
        path = str(row.get("path") or "")
        if not path:
            raise RuntimeError("edge_ms_row_without_path")
        marks = int(row.get("marks") or 0)
        if not 1 <= marks <= 20:
            raise RuntimeError(f"edge_ms_invalid_mark:{path}:{marks}")
        if path in merged:
            if int(merged[path]["marks"]) != marks:
                raise RuntimeError(f"edge_ms_duplicate_mark_conflict:{path}")
            continue
        merged[path] = row
        order.append(path)

    edge_total = sum(int(merged[path]["marks"]) for path in order)
    if edge_total > expected_marks:
        raise RuntimeError(
            f"edge_ms_total_exceeds_expected:{edge_total}:{expected_marks}"
        )

    # If Edge already extracted the complete paper, the local fallback is not
    # evidence we need. Avoid allowing its column-agnostic regex to manufacture
    # a false source disagreement from numeric Guidance text.
    if edge_total == expected_marks:
        return [merged[path] for path in order], []

    fallback_by_path: dict[str, dict[str, Any]] = {}
    for row in fallback_rows:
        path = str(row.get("path") or "")
        if not path:
            continue
        marks = int(row.get("marks") or 0)
        if not 1 <= marks <= 20:
            continue
        previous = fallback_by_path.get(path)
        if previous is not None and int(previous.get("marks") or 0) != marks:
            raise RuntimeError(f"local_ms_duplicate_mark_conflict:{path}")
        fallback_by_path[path] = row

    added: list[str] = []
    for path, row in fallback_by_path.items():
        if path in merged:
            # Edge is the structured extraction for this path. A disagreement
            # here is local parser ambiguity, not permission to alter Edge data.
            continue
        marks = int(row["marks"])
        merged[path] = {
            "path": path,
            "marks": marks,
            "guidance": str(row.get("guidance") or ""),
        }
        order.append(path)
        added.append(path)

    rows = [merged[path] for path in order]
    total = sum(int(row["marks"]) for row in rows)
    if total != expected_marks:
        fallback_total = sum(int(row.get("marks") or 0) for row in fallback_rows)
        raise RuntimeError(
            "ms_extract_gate_after_fallback_v3:"
            f"edge={len(edge_rows)}/{edge_total} "
            f"local={len(fallback_rows)}/{fallback_total} "
            f"merged={len(rows)}/{total} expected={expected_marks} added={added}"
        )
    return rows, added


V2["main"].__globals__["reconcile_ms_rows"] = reconcile_ms_rows_v3


if __name__ == "__main__":
    raise SystemExit(V2["main"]())
