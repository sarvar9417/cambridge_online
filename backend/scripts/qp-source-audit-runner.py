#!/usr/bin/env python3
"""Read-only full-corpus source-fidelity audit for Cambridge 9618 Question Papers.

The runner obtains a database snapshot through an OIDC-protected Supabase Edge
Function, downloads every source-ready official QP, verifies its SHA-256, parses
it with qp-source-repair-v2 and compares source-derived leaves with the database.

It never writes question data. A JSON report is always produced when the runner
can reach the bootstrap endpoint. Hard source/parse/reference failures return a
non-zero exit code; text mismatches are reported for review and can be made
strict with SOURCE_AUDIT_STRICT=1.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import runpy
import tempfile
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

AUDIENCE = "cambridge-corpus"
AUDIT_VERSION = "9618-source-audit-v1"
EXPECTED_PAPERS = 118
EXPECTED_LEAVES = 2985
EXPECTED_MARKS = 8850
PARSER = runpy.run_path("backend/scripts/qp-source-repair.py", run_name="qp_source_repair_audit_impl")


def oidc_token() -> str:
    base = os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]
    sep = "&" if "?" in base else "?"
    req = urllib.request.Request(
        base + sep + "audience=" + AUDIENCE,
        headers={"Authorization": "bearer " + os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)["value"]


def runner(action: str, timeout: int = 180) -> dict[str, Any]:
    url = os.environ["CORPUS_AUDIT_RUNNER_URL"]
    req = urllib.request.Request(
        url,
        data=json.dumps({"action": action}).encode(),
        method="POST",
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + oidc_token()},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            data = json.load(response)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="ignore")[:3000]
        raise RuntimeError(f"runner_http_{exc.code}:{detail}") from exc
    if not data.get("ok"):
        raise RuntimeError("runner_error:" + str(data.get("error")))
    return data


def drive_id(url: str) -> str:
    match = re.search(r"/d/([^/]+)", url or "") or re.search(r"[?&]id=([^&]+)", url or "")
    if not match:
        raise ValueError("bad_drive_url")
    return match.group(1)


def download(url: str, path: Path) -> None:
    direct = f"https://drive.usercontent.google.com/download?id={drive_id(url)}&export=download&confirm=t"
    req = urllib.request.Request(direct, headers={"User-Agent": "CamPathQpSourceAudit/1.0"})
    with urllib.request.urlopen(req, timeout=90) as response, path.open("wb") as handle:
        while chunk := response.read(1024 * 1024):
            handle.write(chunk)
    if path.stat().st_size < 1000:
        raise RuntimeError("download_too_small")


def normalized_text(value: object) -> str:
    text = unicodedata.normalize("NFKC", str(value or ""))
    text = text.replace("\u00a0", " ")
    text = text.replace("\u2010", "-").replace("\u2011", "-").replace("\u2012", "-").replace("\u2013", "-")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s*\n\s*", "\n", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def comparison(source: object, stored: object) -> dict[str, bool]:
    source_text = "" if source is None else str(source)
    stored_text = "" if stored is None else str(stored)
    return {
        "exact": source_text == stored_text,
        "normalized": normalized_text(source_text) == normalized_text(stored_text),
    }


def short(value: object, limit: int = 500) -> str | None:
    if value is None:
        return None
    text = str(value)
    return text if len(text) <= limit else text[: limit - 1] + "…"


def audit_paper(source: dict[str, Any], root: Path) -> dict[str, Any]:
    key = f"{source['year']}-{source['series']}-{source['component']}{source['variant']}"
    pdf = root / f"9618-{key}.pdf"
    download(str(source["sourceUrl"]), pdf)
    actual_sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
    if actual_sha != source["sourceSha256"]:
        raise RuntimeError(f"source_sha_mismatch:{actual_sha}:{source['sourceSha256']}")

    leaves = list(source.get("leaves") or [])
    expected = {str(leaf["path"]): int(leaf["marks"]) for leaf in leaves}
    manifest = {
        "sourcePaperId": source["sourcePaperId"],
        "syllabusCode": source["syllabusCode"],
        "component": source["component"],
        "variant": source["variant"],
        "series": source["series"],
        "year": source["year"],
        "expectedMarks": source["expectedMarks"],
        "leaves": [{"path": leaf["path"], "marks": leaf["marks"]} for leaf in leaves],
        "_expected": expected,
    }
    parsed = PARSER["build_repair"](pdf, manifest)
    if parsed["sourceSha256"] != source["sourceSha256"]:
        raise RuntimeError("parser_source_sha_mismatch")
    if int(parsed["marks"]) != 75 or int(parsed["leaves"]) != len(leaves):
        raise RuntimeError("parser_count_or_mark_gate_failed")

    parsed_by_path = {str(row["path"]): row for row in parsed["rows"]}
    mismatches: list[dict[str, Any]] = []
    exact_stems = normalized_stems = exact_contexts = normalized_contexts = exact_refs = 0

    for leaf in leaves:
        path = str(leaf["path"])
        row = parsed_by_path[path]
        stem_cmp = comparison(row.get("stem"), leaf.get("stemMd"))
        context_cmp = comparison(row.get("context"), leaf.get("contextMd"))
        ref_equal = str(row.get("displayRef") or "") == str(leaf.get("displayRef") or "")
        exact_stems += int(stem_cmp["exact"])
        normalized_stems += int(stem_cmp["normalized"])
        exact_contexts += int(context_cmp["exact"])
        normalized_contexts += int(context_cmp["normalized"])
        exact_refs += int(ref_equal)

        if not (stem_cmp["normalized"] and context_cmp["normalized"] and ref_equal):
            mismatches.append({
                "questionId": leaf.get("questionId"),
                "path": path,
                "displayRef": leaf.get("displayRef"),
                "status": leaf.get("status"),
                "promptVersion": leaf.get("promptVersion"),
                "stem": stem_cmp,
                "context": context_cmp,
                "displayRefExact": ref_equal,
                "sourceStem": short(row.get("stem")),
                "storedStem": short(leaf.get("stemMd")),
                "sourceContext": short(row.get("context")),
                "storedContext": short(leaf.get("contextMd")),
                "sourceDisplayRef": row.get("displayRef"),
            })

    return {
        "paper": key,
        "sourcePaperId": source["sourcePaperId"],
        "leaves": len(leaves),
        "marks": parsed["marks"],
        "exactStemMatches": exact_stems,
        "normalizedStemMatches": normalized_stems,
        "exactContextMatches": exact_contexts,
        "normalizedContextMatches": normalized_contexts,
        "exactDisplayRefMatches": exact_refs,
        "mismatchCount": len(mismatches),
        "mismatches": mismatches,
    }


def main() -> int:
    output_path = Path(os.getenv("SOURCE_AUDIT_REPORT", "source-audit-report.json"))
    strict = os.getenv("SOURCE_AUDIT_STRICT", "").strip().lower() in {"1", "true", "yes"}
    bootstrap = runner("source_audit_bootstrap", timeout=180)["data"]

    if bootstrap.get("parserVersion") != PARSER["PARSER_VERSION"]:
        raise RuntimeError("bootstrap_parser_version_mismatch")
    if bootstrap.get("auditVersion") != AUDIT_VERSION:
        raise RuntimeError("bootstrap_audit_version_mismatch")
    if (
        int(bootstrap.get("paperCount", -1)) != EXPECTED_PAPERS
        or int(bootstrap.get("leafCount", -1)) != EXPECTED_LEAVES
        or int(bootstrap.get("marks", -1)) != EXPECTED_MARKS
    ):
        raise RuntimeError("bootstrap_corpus_baseline_mismatch")

    sources = list(bootstrap.get("sources") or [])
    only = os.getenv("SOURCE_AUDIT_ONLY", "").strip()
    if only:
        sources = [source for source in sources if only in {
            str(source["sourcePaperId"]),
            f"{source['year']}-{source['series']}-{source['component']}{source['variant']}",
        }]
        if not sources:
            raise RuntimeError("source_audit_only_not_found")

    succeeded: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        for index, source in enumerate(sources, start=1):
            key = f"{source['year']}-{source['series']}-{source['component']}{source['variant']}"
            try:
                result = audit_paper(source, root)
                succeeded.append(result)
                print(json.dumps({
                    "event": "paper_audited",
                    "index": index,
                    "total": len(sources),
                    "paper": key,
                    "leaves": result["leaves"],
                    "mismatches": result["mismatchCount"],
                }, separators=(",", ":")))
            except Exception as exc:
                failure = {"paper": key, "sourcePaperId": source.get("sourcePaperId"), "error": str(exc)[:3000]}
                failed.append(failure)
                print(json.dumps({"event": "paper_failed", **failure}, ensure_ascii=False, separators=(",", ":")))

    summary = {
        "event": "final",
        "auditVersion": AUDIT_VERSION,
        "selectedPapers": len(sources),
        "succeededPapers": len(succeeded),
        "failedPapers": len(failed),
        "auditedLeaves": sum(int(item["leaves"]) for item in succeeded),
        "mismatchLeaves": sum(int(item["mismatchCount"]) for item in succeeded),
        "exactStemMatches": sum(int(item["exactStemMatches"]) for item in succeeded),
        "normalizedStemMatches": sum(int(item["normalizedStemMatches"]) for item in succeeded),
        "exactContextMatches": sum(int(item["exactContextMatches"]) for item in succeeded),
        "normalizedContextMatches": sum(int(item["normalizedContextMatches"]) for item in succeeded),
        "exactDisplayRefMatches": sum(int(item["exactDisplayRefMatches"]) for item in succeeded),
        "strict": strict,
    }
    report = {"summary": summary, "failed": failed, "papers": succeeded}
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, separators=(",", ":")))

    hard_ref_failures = any(
        int(item["exactDisplayRefMatches"]) != int(item["leaves"])
        for item in succeeded
    )
    semantic_mismatches = int(summary["mismatchLeaves"]) > 0
    return 1 if failed or hard_ref_failures or (strict and semantic_mismatches) else 0


if __name__ == "__main__":
    raise SystemExit(main())
