#!/usr/bin/env python3
"""Exact post-repair verification for the complete source-ready 9618 QP corpus."""

from __future__ import annotations

import hashlib
import json
import os
import re
import runpy
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

AUDIENCE = "cambridge-corpus"
EXPECTED_PAPERS = 118
EXPECTED_LEAVES = 2985
EXPECTED_MARKS = 8850
PARSER = runpy.run_path("backend/scripts/qp-source-repair-v3.py", run_name="qp_source_verify_v3_impl")


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
    req = urllib.request.Request(
        os.environ["CORPUS_AUDIT_RUNNER_URL"],
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


def download(url: str, path: Path, attempts: int = 3) -> None:
    direct = f"https://drive.usercontent.google.com/download?id={drive_id(url)}&export=download&confirm=t"
    error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            req = urllib.request.Request(direct, headers={"User-Agent": "CamPathQpSourceVerify/3.0"})
            with urllib.request.urlopen(req, timeout=90) as response, path.open("wb") as handle:
                while chunk := response.read(1024 * 1024):
                    handle.write(chunk)
            if path.stat().st_size < 1000:
                raise RuntimeError("download_too_small")
            return
        except Exception as exc:
            error = exc
            path.unlink(missing_ok=True)
            if attempt < attempts:
                time.sleep(attempt * 2)
    raise RuntimeError(f"download_failed:{error}")


def source_key(source: dict[str, Any]) -> str:
    return f"{source['year']}-{source['series']}-{source['component']}{source['variant']}"


def aliases_for(source: dict[str, Any]) -> dict[str, str]:
    if (
        int(source["year"]) == 2023
        and str(source["series"]) == "MJ"
        and int(source["component"]) == 1
        and int(source["variant"]) == 1
    ):
        return {"6.a": "6"}
    return {}


def main() -> int:
    report_path = Path(os.getenv("SOURCE_VERIFY_REPORT", "source-verify-v3-report.json"))
    bootstrap = runner("source_audit_bootstrap", timeout=180)["data"]
    if (
        int(bootstrap.get("paperCount", -1)) != EXPECTED_PAPERS
        or int(bootstrap.get("leafCount", -1)) != EXPECTED_LEAVES
        or int(bootstrap.get("marks", -1)) != EXPECTED_MARKS
    ):
        raise RuntimeError("verification_corpus_baseline_mismatch")

    sources = list(bootstrap.get("sources") or [])
    if len(sources) != EXPECTED_PAPERS:
        raise RuntimeError(f"expected_{EXPECTED_PAPERS}_sources:{len(sources)}")

    only = os.getenv("SOURCE_VERIFY_ONLY", "").strip()
    if only:
        sources = [source for source in sources if only in {str(source["sourcePaperId"]), source_key(source)}]
        if not sources:
            raise RuntimeError("source_verify_only_not_found")

    failures: list[dict[str, Any]] = []
    mismatches: list[dict[str, Any]] = []
    verified_papers = 0
    verified_leaves = 0
    verified_marks = 0

    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        for index, source in enumerate(sources, start=1):
            key = source_key(source)
            try:
                pdf = root / f"9618-{key}.pdf"
                download(str(source["sourceUrl"]), pdf)
                actual_sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
                if actual_sha != source["sourceSha256"]:
                    raise RuntimeError(f"source_sha_mismatch:{actual_sha}:{source['sourceSha256']}")

                leaves = list(source.get("leaves") or [])
                manifest: dict[str, Any] = {
                    "sourcePaperId": source["sourcePaperId"],
                    "syllabusCode": source["syllabusCode"],
                    "component": source["component"],
                    "variant": source["variant"],
                    "series": source["series"],
                    "year": source["year"],
                    "expectedMarks": 75,
                    "aliases": aliases_for(source),
                    "leaves": [{"path": leaf["path"], "marks": leaf["marks"]} for leaf in leaves],
                    "_expected": {str(leaf["path"]): int(leaf["marks"]) for leaf in leaves},
                }
                parsed = PARSER["build_repair"](pdf, manifest)
                parsed_by_path = {str(row["path"]): row for row in parsed["rows"]}
                paper_mismatches = 0
                for leaf in leaves:
                    path = str(leaf["path"])
                    row = parsed_by_path[path]
                    fields = {
                        "stemMd": (row.get("stem"), leaf.get("stemMd")),
                        "contextMd": (row.get("context"), leaf.get("contextMd")),
                        "displayRef": (row.get("displayRef"), leaf.get("displayRef")),
                    }
                    different = [name for name, values in fields.items() if values[0] != values[1]]
                    if different:
                        paper_mismatches += 1
                        mismatches.append({
                            "paper": key,
                            "questionId": leaf.get("questionId"),
                            "path": path,
                            "displayRef": leaf.get("displayRef"),
                            "differentFields": different,
                            "sourceStem": row.get("stem"),
                            "storedStem": leaf.get("stemMd"),
                            "sourceContext": row.get("context"),
                            "storedContext": leaf.get("contextMd"),
                            "sourceDisplayRef": row.get("displayRef"),
                        })
                verified_papers += 1
                verified_leaves += len(leaves)
                verified_marks += int(parsed["marks"])
                print(json.dumps({
                    "event": "paper_verified",
                    "index": index,
                    "total": len(sources),
                    "paper": key,
                    "leaves": len(leaves),
                    "mismatches": paper_mismatches,
                }, separators=(",", ":")))
            except Exception as exc:
                failure = {"paper": key, "sourcePaperId": source.get("sourcePaperId"), "error": str(exc)[:3000]}
                failures.append(failure)
                print(json.dumps({"event": "paper_failed", **failure}, ensure_ascii=False, separators=(",", ":")))

    summary = {
        "event": "final",
        "parserVersion": PARSER["PARSER_VERSION"],
        "selectedPapers": len(sources),
        "verifiedPapers": verified_papers,
        "failedPapers": len(failures),
        "verifiedLeaves": verified_leaves,
        "verifiedMarks": verified_marks,
        "exactMismatchLeaves": len(mismatches),
    }
    report_path.write_text(json.dumps({"summary": summary, "failures": failures, "mismatches": mismatches}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, separators=(",", ":")))

    if not only and (verified_papers != EXPECTED_PAPERS or verified_leaves != EXPECTED_LEAVES or verified_marks != EXPECTED_MARKS):
        return 1
    return 1 if failures or mismatches else 0


if __name__ == "__main__":
    raise SystemExit(main())
