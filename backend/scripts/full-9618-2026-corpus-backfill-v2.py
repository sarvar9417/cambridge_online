#!/usr/bin/env python3
"""Resume the source-verified 9618 May/June 2026 corpus after audit failures.

This wrapper keeps the original staged-source/classifier implementation but
hardens the two source extraction boundaries that failed in production:
- short, deeply-indented Cambridge main-question headings (9618/23)
- a mark-scheme row omitted by the Edge PDF text grouping (9618/42)

It remains fail-closed: local fallback rows are accepted only when they agree
with Edge rows on overlapping paths/marks and the merged source total is exactly
75 marks. QP and MS bytes are both SHA-checked against the staged source rows.
"""
from __future__ import annotations

import hashlib
import json
import re
import runpy
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

BASE = runpy.run_path(
    "backend/scripts/full-9618-2026-corpus-backfill.py",
    run_name="full_9618_2026_corpus_backfill_v1_lib",
)
CLASSIFIER = BASE["CLASSIFIER"]
QP = BASE["QP"]
PSEUDOCODE_HEADS = BASE["PSEUDOCODE_HEADS"]


def main_candidate_2026_v2(raw: str, expected_number: int):
    """Accept a genuine sequential Cambridge heading without accepting data rows."""
    match = re.match(r"^(\s*)(\d{1,2})\s+(.+)$", raw)
    if not match:
        return None
    token = match.group(2)
    if len(token) > 1 and token.startswith("0"):
        return None
    indent = len(match.group(1))
    number = int(token)
    rest = match.group(3).strip()
    if number != expected_number or re.match(r"^hours?\b", rest, re.I):
        return None
    # Numeric trace/table rows cannot advance question state.
    if not re.match(r"^(?:\([a-z]\)|[A-Za-z])", rest, re.I):
        return None
    if indent <= 12:
        pass
    elif 24 <= indent <= 42:
        # 9618/23 Q1 is genuinely "Study the pseudocode." (three words).
        # Require only a small alphabetic phrase here; the exact expected
        # question number plus this text gate still rejects indented data rows.
        if len(rest) < 8 or len(rest.split()) < 2:
            return None
    else:
        return None
    first = re.match(r"[A-Za-z]+", rest)
    if first and first.group(0).upper() in PSEUDOCODE_HEADS and first.group(0).isupper():
        return None
    return indent, number, rest


QP["detect_events"].__globals__["main_candidate"] = main_candidate_2026_v2


def local_ms_rows(ms_pdf: Path, work: Path) -> list[dict[str, Any]]:
    txt = work / f"{ms_pdf.stem}.txt"
    CLASSIFIER["extract_text"](ms_pdf, txt)
    return list(CLASSIFIER["parse_ms"](txt))


def reconcile_ms_rows(
    edge_rows: list[dict[str, Any]],
    fallback_rows: list[dict[str, Any]],
    expected_marks: int,
) -> tuple[list[dict[str, Any]], list[str]]:
    """Merge only source-agreeing fallback rows until the paper total is exact."""
    merged: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    for row in edge_rows:
        path = str(row.get("path") or "")
        if not path:
            raise RuntimeError("edge_ms_row_without_path")
        marks = int(row.get("marks") or 0)
        if path in merged:
            if int(merged[path]["marks"]) != marks:
                raise RuntimeError(f"edge_ms_duplicate_mark_conflict:{path}")
            continue
        merged[path] = row
        order.append(path)

    added: list[str] = []
    for row in fallback_rows:
        path = str(row.get("path") or "")
        if not path:
            continue
        marks = int(row.get("marks") or 0)
        if path in merged:
            if int(merged[path]["marks"]) != marks:
                raise RuntimeError(
                    f"ms_source_disagreement:{path}:edge={merged[path]['marks']}:local={marks}"
                )
            continue
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
        edge_total = sum(int(row.get("marks") or 0) for row in edge_rows)
        fallback_total = sum(int(row.get("marks") or 0) for row in fallback_rows)
        raise RuntimeError(
            "ms_extract_gate_after_fallback:"
            f"edge={len(edge_rows)}/{edge_total} local={len(fallback_rows)}/{fallback_total} "
            f"merged={len(rows)}/{total} expected={expected_marks} added={added}"
        )
    return rows, added


def source_key(source: dict[str, Any]) -> str:
    return BASE["source_key"](source)


def main() -> int:
    report: dict[str, Any] = {
        "version": "full-9618-2026-corpus-backfill-v2",
        "started_at": time.time(),
        "papers": [],
        "failures": [],
    }
    manifest = BASE["discover_manifest"]()
    BASE["audit_pairs"](manifest)
    report["manifest"] = {"sources": len(manifest), "paperPairs": 12, "folderId": BASE["FOLDER_ID"]}
    print(json.dumps({"event": "manifest_ok", **report["manifest"]}, separators=(",", ":")), flush=True)

    staged: list[dict[str, Any]] = []
    for batch_no, batch in enumerate(BASE["batches"](manifest, 12), start=1):
        response = BASE["runner"]("stage", {"syllabus_code": "9618", "sources": batch}, timeout=300)
        staged.extend(response.get("results") or [])
        print(json.dumps({"event": "stage_ok", "batch": batch_no, "count": len(batch)}, separators=(",", ":")), flush=True)
    if len(staged) != 24:
        raise RuntimeError(f"staging_count_mismatch:{len(staged)}")

    sha_by_identity = {
        (int(row["component"]), int(row["variant"]), str(row["kind"])): str(row["sha256"]).lower()
        for row in staged
    }

    bootstrap = BASE["runner"](
        "bootstrap", {"syllabus_code": "9618", "year_from": 2021, "year_to": 2026}, timeout=180
    )["data"]
    models = BASE["build_models"](bootstrap)
    coverage_by_key = {
        (str(row["syllabus_id"]), str(row["component_id"])): row
        for row in bootstrap.get("coverage") or []
    }
    remaining = [
        source for source in bootstrap.get("sources") or []
        if int(source["year"]) == 2026 and str(source["series"]) == "MJ"
    ]
    print(json.dumps({"event": "bootstrap", "remaining2026": len(remaining)}, separators=(",", ":")), flush=True)

    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        for index, source in enumerate(remaining, start=1):
            key = source_key(source)
            row_report: dict[str, Any] = {"paper": key, "status": "started"}
            try:
                expected_marks = int(source.get("expected_marks") or 0)
                if expected_marks <= 0:
                    raise RuntimeError("component_expected_marks_missing")

                extracted = BASE["runner"](
                    "extract", {"qp_url": source["qp_url"], "ms_url": source["ms_url"]}, timeout=300
                )
                edge_rows = list(extracted.get("rows") or [])
                edge_marks = int(extracted.get("total") or 0)

                qp_pdf = root / f"{key}-qp.pdf"
                ms_pdf = root / f"{key}-ms.pdf"
                BASE["download"](str(source["qp_url"]), qp_pdf)
                BASE["download"](str(source["ms_url"]), ms_pdf)

                qp_sha = hashlib.sha256(qp_pdf.read_bytes()).hexdigest()
                ms_sha = hashlib.sha256(ms_pdf.read_bytes()).hexdigest()
                expected_qp_sha = sha_by_identity[(int(source["component"]), int(source["variant"]), "QP")]
                expected_ms_sha = sha_by_identity[(int(source["component"]), int(source["variant"]), "MS")]
                if qp_sha != expected_qp_sha:
                    raise RuntimeError(f"qp_sha_mismatch:{qp_sha}:{expected_qp_sha}")
                if ms_sha != expected_ms_sha:
                    raise RuntimeError(f"ms_sha_mismatch:{ms_sha}:{expected_ms_sha}")

                fallback_rows = local_ms_rows(ms_pdf, root)
                ms_rows, fallback_added = reconcile_ms_rows(edge_rows, fallback_rows, expected_marks)

                expected_paths = {str(row["path"]): int(row["marks"]) for row in ms_rows}
                qp_text = QP["BASE"]["pdftotext_layout"](qp_pdf)
                source_rows, _events = QP["parse_text"](qp_text, expected_paths)
                QP["quality_gate"](source_rows)
                if set(source_rows) != set(expected_paths):
                    missing = sorted(set(expected_paths) - set(source_rows))
                    extra = sorted(set(source_rows) - set(expected_paths))
                    raise RuntimeError(f"qp_path_set_mismatch:missing={missing}:extra={extra}")

                coverage = coverage_by_key.get((str(source["syllabus_id"]), str(source["component_id"])))
                if not coverage:
                    raise RuntimeError("coverage_missing_for_source")
                out_rows, low = BASE["classify_rows"](source, ms_rows, source_rows, coverage, models)
                if sum(int(row["marks"]) for row in out_rows) != expected_marks:
                    raise RuntimeError("classified_mark_gate_failed")

                applied = BASE["runner"](
                    "apply",
                    {
                        "syllabus_code": "9618",
                        "qp_id": source["qp_id"],
                        "ms_id": source["ms_id"],
                        "rows": out_rows,
                    },
                    timeout=300,
                ).get("result")
                row_report.update({
                    "status": "applied",
                    "leaves": len(out_rows),
                    "marks": expected_marks,
                    "lowConfidence": low[:20],
                    "msExtraction": {
                        "edgeRows": len(edge_rows),
                        "edgeMarks": edge_marks,
                        "localRows": len(fallback_rows),
                        "fallbackAdded": fallback_added,
                        "finalRows": len(ms_rows),
                    },
                    "result": applied,
                })
                print(json.dumps({"event": "paper_ok", "index": index, "total": len(remaining), **row_report}, separators=(",", ":"), default=str), flush=True)
            except Exception as exc:
                row_report.update({"status": "failed", "error": str(exc)[:3500]})
                report["failures"].append({"paper": key, "error": str(exc)[:3500]})
                print(json.dumps({"event": "paper_failed", **row_report}, separators=(",", ":")), file=sys.stderr, flush=True)
            report["papers"].append(row_report)

    report["applied"] = sum(1 for row in report["papers"] if row.get("status") == "applied")
    report["failed"] = len(report["failures"])
    if not report["failures"]:
        post = BASE["runner"](
            "bootstrap", {"syllabus_code": "9618", "year_from": 2026, "year_to": 2026}, timeout=180
        )["data"]
        still_remaining = list(post.get("sources") or [])
        report["remainingAfterApply"] = [source_key(source) for source in still_remaining]
        if still_remaining:
            report["failures"].append({"paper": "scope", "error": f"un_ingested_after_apply:{report['remainingAfterApply']}"})
            report["failed"] = len(report["failures"])
        else:
            report["fidelity"] = BASE["runner"](
                "flag_fidelity", {"syllabus_code": "9618", "year": 2026}, timeout=180
            ).get("result")

    report["finished_at"] = time.time()
    Path("9618-2026-backfill-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "event": "final",
        "manifest": report["manifest"],
        "applied": report["applied"],
        "failed": report["failed"],
        "fidelity": report.get("fidelity"),
    }, ensure_ascii=False, separators=(",", ":")), flush=True)
    return 2 if report["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
