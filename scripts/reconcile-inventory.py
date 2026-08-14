#!/usr/bin/env python3
"""Compare source-paper inventory with the live database inventory.

Inputs:
  scripts/inventory-papers.py ... --json-out source.json
  npm run db:inventory -w backend -- --json-out db.json

Public statuses intentionally match Phase A product terminology:
  COMPLETE, PARTIAL, MISSING, DUPLICATE, CONFLICT

`detail_state` preserves the more precise machine-readable reason.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def load_json(path: str) -> dict[str, Any]:
    source = Path(path).expanduser().resolve()
    if not source.is_file():
        raise SystemExit(f"Not a file: {source}")
    return json.loads(source.read_text(encoding="utf-8"))


def paper_map(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = row.get("paper_key")
        if key:
            result[str(key)] = row
    return result


def classify(
    source: dict[str, Any] | None,
    database: dict[str, Any] | None,
) -> tuple[str, str, list[str]]:
    reasons: list[str] = []

    if source is None and database is not None:
        reasons.append("database paper has no canonical source entry in the supplied inventory")
        return "CONFLICT", "DB_ONLY", reasons

    if source is not None and source.get("has_canonical_duplicates"):
        kinds = ", ".join(source.get("canonical_duplicate_kinds") or [])
        reasons.append(f"multiple canonical source files detected for kind(s): {kinds}")
        return "DUPLICATE", "SOURCE_DUPLICATE", reasons

    if source is not None and database is None:
        if not source.get("canonical_pair_complete"):
            reasons.append("source corpus itself is missing canonical QP or MS")
            return "MISSING", "SOURCE_INCOMPLETE", reasons
        reasons.append("canonical QP/MS exists in source corpus but paper is absent from database")
        return "MISSING", "SOURCE_ONLY", reasons

    assert source is not None and database is not None

    if not source.get("canonical_pair_complete"):
        reasons.append("source corpus is missing canonical QP or MS")
        return "MISSING", "SOURCE_INCOMPLETE", reasons

    if not database.get("qp_present") or not database.get("ms_present"):
        if not database.get("qp_present"):
            reasons.append("database is missing QP source_paper")
        if not database.get("ms_present"):
            reasons.append("database is missing MS source_paper")
        return "MISSING", "DB_SOURCE_MISSING", reasons

    leaf_questions = int(database.get("leaf_questions") or 0)
    expected_marks = int(database.get("expected_marks") or 0)
    actual_marks = int(database.get("actual_leaf_marks") or 0)
    tagged = int(database.get("tagged_leaf_questions") or 0)
    leaves_with_ms = int(database.get("leaves_with_mark_scheme") or 0)
    approved_leaves = int(database.get("approved_leaf_questions") or 0)
    approved_ms = int(database.get("leaves_with_approved_mark_scheme") or 0)

    if leaf_questions <= 0:
        reasons.append("no extracted leaf questions")
        return "PARTIAL", "NO_LEAVES", reasons

    if expected_marks and actual_marks != expected_marks:
        reasons.append(f"leaf mark total mismatch: {actual_marks}/{expected_marks}")
        return "CONFLICT", "MARK_TOTAL_MISMATCH", reasons

    if tagged != leaf_questions:
        reasons.append(f"topic tagging incomplete: {tagged}/{leaf_questions}")
    if leaves_with_ms != leaf_questions:
        reasons.append(f"mark-scheme leaf coverage incomplete: {leaves_with_ms}/{leaf_questions}")

    if reasons:
        return "PARTIAL", "EXTRACTION_INCOMPLETE", reasons

    if approved_leaves != leaf_questions:
        reasons.append(f"question review incomplete: {approved_leaves}/{leaf_questions}")
    if approved_ms != leaf_questions:
        reasons.append(f"mark-scheme review incomplete: {approved_ms}/{leaf_questions}")

    if reasons:
        return "PARTIAL", "NEEDS_REVIEW", reasons

    if database.get("review_complete"):
        return "COMPLETE", "COMPLETE", []

    reasons.append("database completion flags are inconsistent with measured coverage")
    return "CONFLICT", "COMPLETION_FLAG_CONFLICT", reasons


def main() -> None:
    parser = argparse.ArgumentParser(description="Reconcile source-paper and database inventories")
    parser.add_argument("source_json", help="JSON from scripts/inventory-papers.py")
    parser.add_argument("db_json", help="JSON from backend db:inventory")
    parser.add_argument("--json-out", help="Optional path for reconciliation JSON")
    args = parser.parse_args()

    source_report = load_json(args.source_json)
    db_report = load_json(args.db_json)

    source = paper_map(source_report.get("coverage", []))
    database = paper_map(db_report.get("papers", []))
    all_keys = sorted(set(source) | set(database))

    rows: list[dict[str, Any]] = []
    for key in all_keys:
        source_row = source.get(key)
        db_row = database.get(key)
        status, detail_state, reasons = classify(source_row, db_row)
        rows.append(
            {
                "paper_key": key,
                "status": status,
                "detail_state": detail_state,
                "reasons": reasons,
                "source": source_row,
                "database": db_row,
            }
        )

    statuses: dict[str, int] = {}
    detail_states: dict[str, int] = {}
    for row in rows:
        statuses[row["status"]] = statuses.get(row["status"], 0) + 1
        detail_states[row["detail_state"]] = detail_states.get(row["detail_state"], 0) + 1

    report = {
        "source_filters": source_report.get("filters"),
        "database_generated_at": db_report.get("generated_at"),
        "summary": {
            "paper_keys": len(rows),
            "statuses": dict(sorted(statuses.items())),
            "detail_states": dict(sorted(detail_states.items())),
            "copy_suffix_candidates": len(source_report.get("copy_suffix_candidates", [])),
        },
        "source_diagnostics": {
            "copy_suffix_candidates": source_report.get("copy_suffix_candidates", []),
            "unparsed_source_files": source_report.get("unparsed_source_files", []),
        },
        "schema_gaps": db_report.get("gaps", {}),
        "detection_limits": [
            "incorrect QP/MS attachment cannot be proven without source hashes or provider IDs in both inventories",
            "copy-suffix files are diagnostics and are not promoted to canonical source records automatically",
        ],
        "rows": rows,
    }

    print(f"paper_keys={len(rows)}")
    for status, count in sorted(statuses.items()):
        print(f"{status}={count}")

    print("\nPaper reconciliation:")
    for row in rows:
        reason = "; ".join(row["reasons"]) if row["reasons"] else "all gates satisfied"
        print(
            f"{row['status'].ljust(10)} {row['detail_state'].ljust(24)} "
            f"{row['paper_key']} - {reason}"
        )

    if report["schema_gaps"]:
        print("\nSchema gaps:")
        for key, value in report["schema_gaps"].items():
            print(f"  {key}: {value}")

    if args.json_out:
        destination = Path(args.json_out).expanduser().resolve()
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"\nJSON report written to {destination}")


if __name__ == "__main__":
    main()
