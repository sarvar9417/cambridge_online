#!/usr/bin/env python3
"""Compare Drive/local paper inventory with the live database inventory.

Inputs are produced by:
  scripts/inventory-papers.py ... --json-out source.json
  npm run db:inventory -w backend -- --json-out db.json

The comparison is read-only and reports exactly where canonical paper files are
missing from the database, where DB extraction is incomplete, and where a DB
paper has no matching canonical source file in the supplied corpus.
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
        if not key:
            continue
        result[str(key)] = row
    return result


def classify(
    source: dict[str, Any] | None,
    database: dict[str, Any] | None,
) -> tuple[str, list[str]]:
    reasons: list[str] = []

    if source is None and database is not None:
        reasons.append("database paper has no canonical source entry in the supplied inventory")
        return "DB_ONLY", reasons

    if source is not None and database is None:
        if not source.get("canonical_pair_complete"):
            reasons.append("source corpus itself is missing QP or MS")
            return "SOURCE_INCOMPLETE", reasons
        reasons.append("canonical QP/MS exists in source corpus but paper is absent from database")
        return "SOURCE_ONLY", reasons

    assert source is not None and database is not None

    if not source.get("canonical_pair_complete"):
        reasons.append("source corpus is missing QP or MS")

    if not database.get("qp_present"):
        reasons.append("database is missing QP source_paper")
    if not database.get("ms_present"):
        reasons.append("database is missing MS source_paper")

    leaf_questions = int(database.get("leaf_questions") or 0)
    expected_marks = int(database.get("expected_marks") or 0)
    actual_marks = int(database.get("actual_leaf_marks") or 0)
    tagged = int(database.get("tagged_leaf_questions") or 0)
    leaves_with_ms = int(database.get("leaves_with_mark_scheme") or 0)
    approved_leaves = int(database.get("approved_leaf_questions") or 0)
    approved_ms = int(database.get("leaves_with_approved_mark_scheme") or 0)

    if leaf_questions <= 0:
        reasons.append("no extracted leaf questions")
    if expected_marks and actual_marks != expected_marks:
        reasons.append(f"leaf mark total mismatch: {actual_marks}/{expected_marks}")
    if leaf_questions and tagged != leaf_questions:
        reasons.append(f"topic tagging incomplete: {tagged}/{leaf_questions}")
    if leaf_questions and leaves_with_ms != leaf_questions:
        reasons.append(f"mark-scheme leaf coverage incomplete: {leaves_with_ms}/{leaf_questions}")
    if leaf_questions and approved_leaves != leaf_questions:
        reasons.append(f"question review incomplete: {approved_leaves}/{leaf_questions}")
    if leaf_questions and approved_ms != leaf_questions:
        reasons.append(f"mark-scheme review incomplete: {approved_ms}/{leaf_questions}")

    if source.get("canonical_pair_complete") and database.get("review_complete"):
        return "COMPLETE", []
    if source.get("canonical_pair_complete") and database.get("extraction_complete"):
        return "NEEDS_REVIEW", reasons
    return "DB_INCOMPLETE", reasons


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
        state, reasons = classify(source_row, db_row)
        rows.append(
            {
                "paper_key": key,
                "state": state,
                "reasons": reasons,
                "source": source_row,
                "database": db_row,
            }
        )

    states: dict[str, int] = {}
    for row in rows:
        states[row["state"]] = states.get(row["state"], 0) + 1

    report = {
        "source_filters": source_report.get("filters"),
        "database_generated_at": db_report.get("generated_at"),
        "summary": {
            "paper_keys": len(rows),
            "states": dict(sorted(states.items())),
        },
        "schema_gaps": db_report.get("gaps", {}),
        "rows": rows,
    }

    print(f"paper_keys={len(rows)}")
    for state, count in sorted(states.items()):
        print(f"{state}={count}")

    print("\nPaper reconciliation:")
    for row in rows:
        reason = "; ".join(row["reasons"]) if row["reasons"] else "all gates satisfied"
        print(f"{row['state'].ljust(17)} {row['paper_key']} - {reason}")

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
