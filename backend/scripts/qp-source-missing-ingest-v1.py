#!/usr/bin/env python3
"""Fail-closed ingestion for SHA-registered 9618 QP/MS pairs with no leaves.

The runner performs an all-paper parse gate before any write:
  1. fetch eligible QP/MS source pairs from the service-role bootstrap;
  2. download both originals and verify both SHA-256 digests;
  3. derive marked leaf identity from the Cambridge mark-scheme question column;
  4. require the derived MS marks to sum to the component total (75);
  5. parse QP stems/context with the proven qp-source-repair-v3 parser;
  6. only when every selected paper passes, optionally apply guarded manifests.

Default mode is plan-only. Set SOURCE_MISSING_APPLY=YES for writes.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import runpy
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

AUDIENCE = "cambridge-corpus"
VERSION = "missing-qp-source-ingest-v1"
PARSER = runpy.run_path("backend/scripts/qp-source-repair-v3.py", run_name="qp_source_repair_v3_missing_ingest")
MS_ROW = re.compile(r"^(\s*)(\d{1,2}(?:\([a-z]\))?(?:\([ivx]+\))?)\s+.*?(\d{1,2})\s*$", re.IGNORECASE)


def oidc_token() -> str:
    base = os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]
    sep = "&" if "?" in base else "?"
    req = urllib.request.Request(
        base + sep + "audience=" + AUDIENCE,
        headers={"Authorization": "bearer " + os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)["value"]


def runner(action: str, payload: dict[str, Any] | None = None, timeout: int = 300) -> dict[str, Any]:
    url = os.environ["CORPUS_REPAIR_RUNNER_URL"]
    body = json.dumps({"action": action, **(payload or {})}, ensure_ascii=False).encode()
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + oidc_token()},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            data = json.load(response)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="ignore")[:4000]
        raise RuntimeError(f"runner_http_{exc.code}:{detail}") from exc
    if not data.get("ok"):
        raise RuntimeError("runner_error:" + str(data.get("error")))
    return data


def drive_id(url: str) -> str:
    match = re.search(r"/d/([^/]+)", url or "") or re.search(r"[?&]id=([^&]+)", url or "")
    if not match:
        raise ValueError("bad_drive_url")
    return match.group(1)


def download(url: str, path: Path, attempts: int = 3) -> None:
    direct = f"https://drive.usercontent.google.com/download?id={drive_id(url)}&export=download&confirm=t"
    last: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            req = urllib.request.Request(direct, headers={"User-Agent": "CamPathMissingSourceIngest/1.0"})
            with urllib.request.urlopen(req, timeout=120) as response, path.open("wb") as handle:
                while chunk := response.read(1024 * 1024):
                    handle.write(chunk)
            if path.stat().st_size < 1000:
                raise RuntimeError("download_too_small")
            return
        except Exception as exc:
            last = exc
            path.unlink(missing_ok=True)
            if attempt < attempts:
                time.sleep(attempt * 2)
    raise RuntimeError(f"download_failed:{last}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def pdftotext_layout(pdf: Path) -> str:
    proc = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], check=True, capture_output=True)
    return proc.stdout.decode("utf-8", errors="replace")


def path_from_token(token: str) -> str:
    main = re.match(r"^(\d{1,2})", token)
    if not main:
        raise ValueError(f"bad_ms_question_token:{token}")
    parts = [main.group(1)]
    parts.extend(value.lower() for value in re.findall(r"\(([a-z]+|[ivx]+)\)", token, re.IGNORECASE))
    return ".".join(parts)


def clean_guidance(segment: list[str], token: str, marks: int) -> str:
    if not segment:
        return ""
    first = re.sub(r"^\s*" + re.escape(token) + r"\s*", "", segment[0], count=1)
    first = re.sub(rf"\s+{marks}\s*$", "", first)
    lines = [first, *segment[1:]]
    kept: list[str] = []
    for raw in lines:
        line = raw.rstrip()
        compact = re.sub(r"\s+", " ", line).strip()
        if re.search(r"©\s*UCLES|Page\s+\d+\s+of\s+\d+|9618/\d+", compact, re.IGNORECASE):
            continue
        if compact in {"PUBLISHED", "Question Answer Marks", "Question Answer Mark"}:
            continue
        kept.append(line)
    text = "\n".join(kept).strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def extract_ms_leaves(ms_pdf: Path, expected_marks: int) -> tuple[list[dict[str, Any]], dict[str, int]]:
    lines = pdftotext_layout(ms_pdf).splitlines()
    hits: list[tuple[int, str, str, int]] = []
    seen: dict[str, int] = {}
    for index, line in enumerate(lines):
        match = MS_ROW.match(line)
        if not match or len(match.group(1)) > 6:
            continue
        token = match.group(2)
        marks = int(match.group(3))
        if not (1 <= marks <= 20):
            continue
        path = path_from_token(token)
        if path in seen:
            if seen[path] != marks:
                raise ValueError(f"ms_conflicting_marks:{path}:{seen[path]}:{marks}")
            continue
        seen[path] = marks
        hits.append((index, token, path, marks))

    if not hits:
        raise ValueError("ms_no_marked_leaves")
    if sum(item[3] for item in hits) != expected_marks:
        raise ValueError(
            f"ms_total_mark_gate_failed:{sum(item[3] for item in hits)}:{expected_marks}:"
            + ",".join(f"{item[2]}={item[3]}" for item in hits)
        )

    leaves: list[dict[str, Any]] = []
    for pos, (start, token, path, marks) in enumerate(hits):
        end = hits[pos + 1][0] if pos + 1 < len(hits) else len(lines)
        guidance = clean_guidance(lines[start:end], token, marks)
        leaves.append({"path": path, "marks": marks, "msGuidance": guidance})
    return leaves, {item["path"]: int(item["marks"]) for item in leaves}


def source_key(source: dict[str, Any]) -> str:
    return f"{source['year']}-{source['series']}-{source['component']}{source['variant']}"


def build_manifest(source: dict[str, Any], qp_pdf: Path, ms_pdf: Path) -> dict[str, Any]:
    expected_marks = int(source["expectedMarks"])
    ms_leaves, expected = extract_ms_leaves(ms_pdf, expected_marks)
    ms_by_path = {row["path"]: row for row in ms_leaves}
    parser_manifest: dict[str, Any] = {
        "sourcePaperId": source["sourcePaperId"],
        "syllabusCode": source["syllabusCode"],
        "component": int(source["component"]),
        "variant": int(source["variant"]),
        "series": source["series"],
        "year": int(source["year"]),
        "expectedMarks": expected_marks,
        "aliases": {},
        "leaves": [{"path": path, "marks": marks} for path, marks in expected.items()],
        "_expected": expected,
    }
    parsed = PARSER["build_repair"](qp_pdf, parser_manifest)
    if int(parsed["marks"]) != expected_marks or int(parsed["leaves"]) != len(expected):
        raise ValueError(f"qp_parse_count_mark_gate:{parsed['leaves']}:{parsed['marks']}")

    rows: list[dict[str, Any]] = []
    for row in parsed["rows"]:
        path = str(row["path"])
        rows.append({
            "path": path,
            "displayRef": row["displayRef"],
            "marks": int(row["marks"]),
            "stem": row["stem"],
            "context": row.get("context"),
            "msGuidance": ms_by_path[path]["msGuidance"],
        })
    return {
        "version": VERSION,
        "sourcePaperId": source["sourcePaperId"],
        "sourceSha256": source["sourceSha256"],
        "markSchemeSourcePaperId": source["markSchemeSourcePaperId"],
        "markSchemeSha256": source["markSchemeSha256"],
        "syllabusCode": source["syllabusCode"],
        "component": int(source["component"]),
        "variant": int(source["variant"]),
        "series": source["series"],
        "year": int(source["year"]),
        "expectedMarks": expected_marks,
        "rows": rows,
    }


def main() -> int:
    output = Path(os.getenv("SOURCE_MISSING_REPORT", "source-missing-ingest-report.json"))
    apply = os.getenv("SOURCE_MISSING_APPLY", "NO").strip().upper() == "YES"
    only = os.getenv("SOURCE_MISSING_ONLY", "").strip()
    bootstrap = runner("missing_source_ingest_bootstrap", timeout=180)["data"]
    if bootstrap.get("version") != VERSION:
        raise RuntimeError("missing_source_bootstrap_version_mismatch")
    all_sources = list(bootstrap.get("sources") or [])
    sources = all_sources
    if only:
        sources = [s for s in all_sources if only in {str(s["sourcePaperId"]), source_key(s)}]
        if not sources:
            raise RuntimeError("missing_source_only_not_found")

    manifests: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        for index, source in enumerate(sources, start=1):
            key = source_key(source)
            try:
                qp = root / f"{key}-qp.pdf"
                ms = root / f"{key}-ms.pdf"
                download(str(source["sourceUrl"]), qp)
                download(str(source["markSchemeSourceUrl"]), ms)
                qp_sha = sha256(qp)
                ms_sha = sha256(ms)
                if qp_sha != str(source["sourceSha256"]).lower():
                    raise RuntimeError(f"qp_sha_mismatch:{qp_sha}:{source['sourceSha256']}")
                if ms_sha != str(source["markSchemeSha256"]).lower():
                    raise RuntimeError(f"ms_sha_mismatch:{ms_sha}:{source['markSchemeSha256']}")
                manifest = build_manifest(source, qp, ms)
                manifests.append(manifest)
                print(json.dumps({
                    "event":"parse_ok","index":index,"total":len(sources),"paper":key,
                    "leaves":len(manifest["rows"]),"marks":sum(int(r["marks"]) for r in manifest["rows"]),
                }, separators=(",", ":")))
            except Exception as exc:
                failure = {"paper":key,"sourcePaperId":source.get("sourcePaperId"),"error":str(exc)[:4000]}
                failures.append(failure)
                print(json.dumps({"event":"parse_failed",**failure}, ensure_ascii=False, separators=(",", ":")))

    if failures:
        report = {
            "version":VERSION,"apply":apply,"selectedPapers":len(sources),"parsedPapers":len(manifests),
            "parseFailures":failures,"databaseWritesAttempted":False,
        }
        output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print(json.dumps({"event":"final",**report},ensure_ascii=False,separators=(",", ":")))
        return 1

    parsed_leaves = sum(len(m["rows"]) for m in manifests)
    parsed_marks = sum(sum(int(r["marks"]) for r in m["rows"]) for m in manifests)
    if not apply:
        report = {
            "version":VERSION,"apply":False,"selectedPapers":len(sources),"parsedPapers":len(manifests),
            "parsedLeaves":parsed_leaves,"parsedMarks":parsed_marks,"parseFailures":[],
            "databaseWritesAttempted":False,
        }
        output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print(json.dumps({"event":"final",**report},separators=(",", ":")))
        return 0

    applied: list[dict[str, Any]] = []
    apply_failures: list[dict[str, Any]] = []
    for index, manifest in enumerate(manifests, start=1):
        key = f"{manifest['year']}-{manifest['series']}-{manifest['component']}{manifest['variant']}"
        try:
            result = runner("missing_source_ingest_apply", {"manifest":manifest}, timeout=300)["result"]
            applied.append({"paper":key,"result":result})
            print(json.dumps({"event":"apply_ok","index":index,"total":len(manifests),"paper":key,"result":result},ensure_ascii=False,separators=(",", ":")))
        except Exception as exc:
            failure={"paper":key,"sourcePaperId":manifest.get("sourcePaperId"),"error":str(exc)[:4000]}
            apply_failures.append(failure)
            print(json.dumps({"event":"apply_failed",**failure},ensure_ascii=False,separators=(",", ":")))

    report = {
        "version":VERSION,"apply":True,"selectedPapers":len(sources),"parsedPapers":len(manifests),
        "parsedLeaves":parsed_leaves,"parsedMarks":parsed_marks,"parseFailures":[],
        "appliedPapers":len(applied),"applyFailures":apply_failures,
        "insertedQuestions":sum(int(x["result"].get("insertedQuestions",0)) for x in applied),
    }
    output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"event":"final",**report},ensure_ascii=False,separators=(",", ":")))
    return 1 if apply_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
