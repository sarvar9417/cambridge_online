#!/usr/bin/env python3
"""Ingest the official Cambridge 9618 May/June 2026 QP/MS corpus.

The Drive folder is treated as an inventory, not as trusted database content.
Every canonical QP/MS filename is paired, staged through the OIDC corpus runner
(which validates PDF bytes and SHA-256), parsed from the original sources, and
inserted transactionally as needs_review. Source-fidelity repair and canonical
structured-content promotion happen in later workflow gates.
"""
from __future__ import annotations

import collections
import hashlib
import json
import os
import re
import runpy
import sys
import tempfile
import time
import urllib.request
from pathlib import Path
from typing import Any

import gdown
import numpy as np

AUDIENCE = "cambridge-corpus"
RUNNER_URL = os.environ.get(
    "CORPUS_RUNNER_URL",
    "https://mphmganorvhsnwvhcxyj.supabase.co/functions/v1/corpus-runner",
)
FOLDER_ID = "141iqgYmqGw3u6PT11cu82afuUlxPyNHO"
CANON = re.compile(r"^9618_s26_(qp|ms)_(11|12|13|21|22|23|31|32|33|41|42|43)\.pdf$", re.I)
EXPECTED_NAMES = {
    f"9618_s26_{kind}_{paper}.pdf"
    for kind in ("qp", "ms")
    for paper in ("11", "12", "13", "21", "22", "23", "31", "32", "33", "41", "42", "43")
}

CLASSIFIER = runpy.run_path(
    "backend/scripts/full-corpus-backfill.py",
    run_name="full_corpus_classifier_lib",
)
QP = runpy.run_path(
    "backend/scripts/qp-source-repair-v3.py",
    run_name="qp_source_repair_v3_for_2026_ingest",
)
PSEUDOCODE_HEADS = QP["PSEUDOCODE_HEADS"]


def main_candidate_2026(raw: str, expected_number: int):
    """Accept audited 2026 template indentation without accepting data rows."""
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
    if not re.match(r"^(?:\([a-z]\)|[A-Za-z])", rest, re.I):
        return None
    if indent <= 12:
        pass
    elif 24 <= indent <= 42:
        if len(rest) < 18 or len(rest.split()) < 4:
            return None
    else:
        return None
    first = re.match(r"[A-Za-z]+", rest)
    if first and first.group(0).upper() in PSEUDOCODE_HEADS and first.group(0).isupper():
        return None
    return indent, number, rest


# qp-source-repair-v3 first tries its legacy parser and uses detect_events only as
# a fallback. Patch that fallback with the already-audited 2026 geometry.
QP["detect_events"].__globals__["main_candidate"] = main_candidate_2026


def oidc_token() -> str:
    base = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL")
    request_token = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
    if not base or not request_token:
        raise RuntimeError("GitHub Actions OIDC environment is unavailable")
    sep = "&" if "?" in base else "?"
    req = urllib.request.Request(
        base + sep + "audience=" + AUDIENCE,
        headers={"Authorization": "bearer " + request_token},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)["value"]


def runner(action: str, payload: dict[str, Any] | None = None, timeout: int = 180) -> dict[str, Any]:
    req = urllib.request.Request(
        RUNNER_URL,
        data=json.dumps({"action": action, **(payload or {})}, ensure_ascii=False).encode(),
        method="POST",
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + oidc_token()},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            body = json.load(response)
    except Exception as exc:
        detail = ""
        if hasattr(exc, "read"):
            try:
                detail = exc.read().decode(errors="ignore")[:2500]
            except Exception:
                pass
        raise RuntimeError(f"runner_{action}_failed:{type(exc).__name__}:{detail}") from exc
    if not body.get("ok"):
        raise RuntimeError(f"runner_{action}_error:{body.get('error')}")
    return body


def batches(values: list[Any], size: int):
    for index in range(0, len(values), size):
        yield values[index:index + size]


def discover_manifest() -> list[dict[str, Any]]:
    entries = gdown.download_folder(
        url=f"https://drive.google.com/drive/folders/{FOLDER_ID}",
        skip_download=True,
        quiet=True,
        remaining_ok=True,
    ) or []
    found: dict[str, dict[str, Any]] = {}
    for entry in entries:
        name = Path(str(entry.path)).name.lower()
        match = CANON.fullmatch(name)
        if not match:
            continue
        if name in found:
            raise RuntimeError(f"duplicate_canonical_source:{name}")
        kind, paper = match.groups()
        found[name] = {
            "syllabus_code": "9618",
            "year": 2026,
            "series": "MJ",
            "component": int(paper[0]),
            "variant": int(paper[1]),
            "kind": kind.upper(),
            "filename": name,
            "source_url": f"https://drive.google.com/file/d/{entry.id}/view?usp=sharing",
        }
    missing = sorted(EXPECTED_NAMES - set(found))
    unexpected = sorted(set(found) - EXPECTED_NAMES)
    if missing or unexpected or len(found) != 24:
        raise RuntimeError(f"2026_manifest_gate:found={len(found)} missing={missing} unexpected={unexpected}")
    return sorted(
        found.values(),
        key=lambda row: (row["component"], row["variant"], row["kind"]),
    )


def audit_pairs(items: list[dict[str, Any]]) -> None:
    grouped: dict[tuple[int, int], set[str]] = collections.defaultdict(set)
    for item in items:
        grouped[(int(item["component"]), int(item["variant"]))].add(str(item["kind"]))
    bad = {str(key): sorted(value) for key, value in grouped.items() if value != {"QP", "MS"}}
    if len(grouped) != 12 or bad:
        raise RuntimeError(f"2026_pair_gate:pairs={len(grouped)} bad={bad}")


def drive_id(url: str) -> str:
    match = re.search(r"/d/([^/]+)", url or "") or re.search(r"[?&]id=([^&]+)", url or "")
    if not match:
        raise ValueError("bad_drive_url")
    return match.group(1)


def download(url: str, path: Path) -> None:
    direct = f"https://drive.usercontent.google.com/download?id={drive_id(url)}&export=download&confirm=t"
    req = urllib.request.Request(direct, headers={"User-Agent": "CamPath9618Corpus/2026"})
    with urllib.request.urlopen(req, timeout=90) as response, path.open("wb") as handle:
        while chunk := response.read(1024 * 1024):
            handle.write(chunk)
    if path.stat().st_size < 1000 or path.read_bytes()[:5] != b"%PDF-":
        raise RuntimeError("downloaded_source_is_not_pdf")


def build_models(bootstrap: dict[str, Any]):
    sub_training: dict[int, list[tuple[str, str]]] = collections.defaultdict(list)
    sub_counts: dict[int, collections.Counter] = collections.defaultdict(collections.Counter)
    for row in bootstrap.get("training_subtopics") or []:
        component = int(row["component"])
        text = f"PATH {row.get('path','')} {row.get('stem','')} {row.get('guidance','')}"
        label = str(row["subtopic"])
        sub_training[component].append((text, label))
        sub_counts[component][label] += 1
    sub_models = {component: CLASSIFIER["fit_model"](rows) for component, rows in sub_training.items()}

    lo_training: dict[str, list[tuple[str, str]]] = collections.defaultdict(list)
    lo_counts: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for row in bootstrap.get("training_los") or []:
        subtopic = str(row["subtopic"])
        text = f"PATH {row.get('path','')} {row.get('stem','')} {row.get('guidance','')}"
        label = str(row["lo"])
        lo_training[subtopic].append((text, label))
        lo_counts[subtopic][label] += 1
    lo_models = {subtopic: CLASSIFIER["fit_model"](rows) for subtopic, rows in lo_training.items()}
    return sub_models, sub_counts, lo_models, lo_counts


def component_rule(component: int, text: str, allowed: set[str]) -> tuple[str | None, float]:
    if component != 2:
        return CLASSIFIER["strong_subtopic_rule"](component, text, allowed)
    tail = re.sub(r"\s+", " ", text).lower()[-700:]
    rules = [
        (r"apply the process of stepwise refinement|using stepwise refinement|outline, using stepwise refinement", "9.2", .99),
        (r"program flowchart.{0,500}write (?:the )?(?:equivalent )?pseudocode|write pseudocode.{0,300}flowchart", "9.2", .99),
        (r"draw (?:a |the )?program flowchart|draw .{0,120}flowchart", "9.2", .98),
        (r"decomposition will be used.{0,350}(?:module|sub-problem)|decompose .{0,250}(?:problem|sub-problem)", "9.1", .98),
        (r"explain (?:the process of |the purpose of |why )?abstraction", "9.1", .97),
        (r"complete (?:the )?trace table|dry running|dry run", "12.3", .98),
        (r"black[- ]box|integration testing|test plan|test data sequence|identify this method of testing|describe (?:a )?testing method", "12.3", .98),
        (r"give the appropriate data types|state (?:the )?data type|give (?:the )?data type", "10.1", .98),
        (r"state the error in the record declaration|benefits of using the single array of the user-defined data type", "10.1", .98),
        (r"write pseudocode to declare the array|write the declaration for the single array|declare a 1d array|declare a 2d array", "10.2", .98),
        (r"write pseudocode statements to declare .{0,180} assign", "11.1", .99),
    ]
    for pattern, code, confidence in rules:
        if code in allowed and re.search(pattern, tail, re.I):
            return code, confidence
    return CLASSIFIER["strong_subtopic_rule"](component, tail, allowed)


def classify_rows(
    source: dict[str, Any],
    extracted: list[dict[str, Any]],
    source_rows: dict[str, dict[str, Any]],
    coverage: dict[str, Any],
    models: tuple[Any, Any, Any, Any],
) -> tuple[list[dict[str, Any]], list[list[Any]]]:
    sub_models, sub_counts, lo_models, lo_counts = models
    component = int(source["component"])
    allowed_subtopics = {str(item["code"]) for item in coverage.get("subtopics") or []}
    allowed_los_by_sub: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    for lo in coverage.get("los") or []:
        allowed_los_by_sub[str(lo["subtopic"])].append(lo)
    if not allowed_subtopics:
        raise RuntimeError("coverage_without_subtopics")

    result: list[dict[str, Any]] = []
    low: list[list[Any]] = []
    for ms_row in extracted:
        path = str(ms_row["path"])
        source_row = source_rows.get(path)
        if not source_row:
            raise RuntimeError(f"source_qp_path_missing:{path}")
        stem = str(source_row.get("stem") or "").strip()
        context = str(source_row.get("context") or "").strip()
        guidance = str(ms_row.get("guidance") or "").strip()
        if not stem:
            raise RuntimeError(f"source_qp_stem_empty:{path}")
        text = f"PATH {path} {context} {stem} {guidance}"

        subtopic, sub_conf = CLASSIFIER["choose_model"](sub_models.get(component), text, allowed_subtopics)
        rule_sub, rule_conf = component_rule(component, text, allowed_subtopics)
        if rule_sub and (subtopic is None or sub_conf < .56 or rule_conf >= sub_conf + .18):
            subtopic, sub_conf = rule_sub, rule_conf
        if subtopic is None:
            for candidate, _count in sub_counts[component].most_common():
                if candidate in allowed_subtopics:
                    subtopic, sub_conf = candidate, .50
                    break
        if subtopic is None:
            raise RuntimeError(f"no_allowed_subtopic:{path}")

        allowed_los = allowed_los_by_sub.get(str(subtopic), [])
        allowed_lo_codes = {str(item["code"]) for item in allowed_los}
        lo, lo_conf = CLASSIFIER["choose_model"](lo_models.get(str(subtopic)), text, allowed_lo_codes)
        if lo is None:
            lo, lo_conf = CLASSIFIER["choose_lo_fallback"](text, allowed_los, lo_counts[str(subtopic)])

        row = {
            "path": path,
            "marks": int(ms_row["marks"]),
            "stem": stem,
            "context": context or None,
            "guidance": guidance,
            "subtopic": str(subtopic),
            "lo": str(lo),
            "answer_kind": CLASSIFIER["answer_kind"](component, f"{context}\n{stem}"),
            "confidence": round(max(.45, min(.99, float(sub_conf))), 4),
            "lo_confidence": round(max(.40, min(.99, float(lo_conf))), 4),
            "method": "tfidf-logreg+2026-source+component-coverage-v1",
        }
        result.append(row)
        if row["confidence"] < .62 or row["lo_confidence"] < .52:
            low.append([path, row["subtopic"], row["confidence"], row["lo"], row["lo_confidence"]])
    return result, low


def source_key(source: dict[str, Any]) -> str:
    return f"{source['year']}-{source['series']}-{source['component']}{source['variant']}"


def main() -> int:
    report: dict[str, Any] = {"started_at": time.time(), "papers": [], "failures": []}
    manifest = discover_manifest()
    audit_pairs(manifest)
    report["manifest"] = {"sources": len(manifest), "paperPairs": 12, "folderId": FOLDER_ID}
    print(json.dumps({"event": "manifest_ok", **report["manifest"]}, separators=(",", ":")), flush=True)

    staged: list[dict[str, Any]] = []
    for batch_no, batch in enumerate(batches(manifest, 12), start=1):
        response = runner("stage", {"syllabus_code": "9618", "sources": batch}, timeout=300)
        staged.extend(response.get("results") or [])
        print(json.dumps({"event": "stage_ok", "batch": batch_no, "count": len(batch)}, separators=(",", ":")), flush=True)
    if len(staged) != 24:
        raise RuntimeError(f"staging_count_mismatch:{len(staged)}")
    sha_by_identity = {
        (int(row["component"]), int(row["variant"]), str(row["kind"])): str(row["sha256"]).lower()
        for row in staged
    }

    bootstrap = runner("bootstrap", {"syllabus_code": "9618", "year_from": 2021, "year_to": 2026}, timeout=180)["data"]
    models = build_models(bootstrap)
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
                extracted = runner(
                    "extract",
                    {"qp_url": source["qp_url"], "ms_url": source["ms_url"]},
                    timeout=300,
                )
                ms_rows = list(extracted.get("rows") or [])
                actual_marks = int(extracted.get("total") or 0)
                if not ms_rows or actual_marks != expected_marks:
                    raise RuntimeError(f"ms_extract_gate:rows={len(ms_rows)} marks={actual_marks}/{expected_marks}")

                qp_pdf = root / f"{key}-qp.pdf"
                download(str(source["qp_url"]), qp_pdf)
                actual_sha = hashlib.sha256(qp_pdf.read_bytes()).hexdigest()
                expected_sha = sha_by_identity[(int(source["component"]), int(source["variant"]), "QP")]
                if actual_sha != expected_sha:
                    raise RuntimeError(f"qp_sha_mismatch:{actual_sha}:{expected_sha}")

                expected_paths = {str(row["path"]): int(row["marks"]) for row in ms_rows}
                qp_text = QP["BASE"]["pdftotext_layout"](qp_pdf)
                source_rows, _events = QP["parse_text"](qp_text, expected_paths)
                QP["quality_gate"](source_rows)
                if set(source_rows) != set(expected_paths):
                    raise RuntimeError("qp_path_set_mismatch")

                coverage = coverage_by_key.get((str(source["syllabus_id"]), str(source["component_id"])))
                if not coverage:
                    raise RuntimeError("coverage_missing_for_source")
                out_rows, low = classify_rows(source, ms_rows, source_rows, coverage, models)
                if sum(int(row["marks"]) for row in out_rows) != expected_marks:
                    raise RuntimeError("classified_mark_gate_failed")

                applied = runner(
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
                    "status": "applied", "leaves": len(out_rows), "marks": expected_marks,
                    "lowConfidence": low[:20], "result": applied,
                })
                print(json.dumps({"event": "paper_ok", "index": index, "total": len(remaining), **row_report}, separators=(",", ":"), default=str), flush=True)
            except Exception as exc:
                row_report.update({"status": "failed", "error": str(exc)[:2500]})
                report["failures"].append({"paper": key, "error": str(exc)[:2500]})
                print(json.dumps({"event": "paper_failed", **row_report}, separators=(",", ":")), file=sys.stderr, flush=True)
            report["papers"].append(row_report)

    report["applied"] = sum(1 for row in report["papers"] if row.get("status") == "applied")
    report["failed"] = len(report["failures"])
    if not report["failures"]:
        post = runner("bootstrap", {"syllabus_code": "9618", "year_from": 2026, "year_to": 2026}, timeout=180)["data"]
        still_remaining = list(post.get("sources") or [])
        report["remainingAfterApply"] = [source_key(source) for source in still_remaining]
        if still_remaining:
            report["failures"].append({"paper": "scope", "error": f"un_ingested_after_apply:{report['remainingAfterApply']}"})
            report["failed"] = len(report["failures"])
        else:
            report["fidelity"] = runner(
                "flag_fidelity", {"syllabus_code": "9618", "year": 2026}, timeout=180
            ).get("result")

    report["finished_at"] = time.time()
    Path("9618-2026-backfill-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({
        "event": "final", "manifest": report["manifest"], "applied": report["applied"],
        "failed": report["failed"], "fidelity": report.get("fidelity"),
    }, ensure_ascii=False, separators=(",", ":")), flush=True)
    return 2 if report["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
