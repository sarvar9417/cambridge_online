#!/usr/bin/env python3
"""Two-phase full-corpus Cambridge 9618 QP source repair runner.

Phase 1 downloads and SHA-verifies every selected official QP and parses every
marked leaf using qp-source-repair-v3. No database writes are attempted unless
all selected papers pass source, parser, leaf-count and 75-mark gates.

Phase 2 sends the already-verified manifests to the service-role-only repair RPC.
The database gate records old/new values in question_source_repair_history and is
replay-safe, so a transient apply failure can be rerun without losing provenance.
"""

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
PARSER = runpy.run_path("backend/scripts/qp-source-repair-v3.py", run_name="qp_source_repair_v3_impl")


def oidc_token() -> str:
    base = os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]
    sep = "&" if "?" in base else "?"
    req = urllib.request.Request(
        base + sep + "audience=" + AUDIENCE,
        headers={"Authorization": "bearer " + os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)["value"]


def runner(action: str, payload: dict[str, Any] | None = None, timeout: int = 240) -> dict[str, Any]:
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
            req = urllib.request.Request(direct, headers={"User-Agent": "CamPathQpSourceRepair/3.0"})
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


def main() -> int:
    output_path = Path(os.getenv("SOURCE_REPAIR_REPORT", "source-repair-v3-report.json"))
    bootstrap = runner("source_repair_bootstrap_v3", timeout=180)["data"]
    if bootstrap.get("parserVersion") != PARSER["PARSER_VERSION"]:
        raise RuntimeError("bootstrap_parser_version_mismatch")
    if (
        int(bootstrap.get("paperCount", -1)) != EXPECTED_PAPERS
        or int(bootstrap.get("leafCount", -1)) != EXPECTED_LEAVES
        or int(bootstrap.get("marks", -1)) != EXPECTED_MARKS
    ):
        raise RuntimeError("bootstrap_corpus_baseline_mismatch")

    all_sources = list(bootstrap.get("sources") or [])
    if len(all_sources) != EXPECTED_PAPERS:
        raise RuntimeError(f"expected_{EXPECTED_PAPERS}_sources:{len(all_sources)}")

    only = os.getenv("SOURCE_REPAIR_ONLY", "").strip()
    sources = all_sources
    if only:
        sources = [source for source in all_sources if only in {str(source["sourcePaperId"]), source_key(source)}]
        if not sources:
            raise RuntimeError("source_repair_only_not_found")

    manifests: list[dict[str, Any]] = []
    parse_failures: list[dict[str, Any]] = []
    parse_leaves = 0
    parse_marks = 0

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

                source_manifest: dict[str, Any] = {
                    "sourcePaperId": source["sourcePaperId"],
                    "syllabusCode": source["syllabusCode"],
                    "component": source["component"],
                    "variant": source["variant"],
                    "series": source["series"],
                    "year": source["year"],
                    "expectedMarks": source["expectedMarks"],
                    "aliases": source.get("aliases") or {},
                    "leaves": source["leaves"],
                    "_expected": {str(leaf["path"]): int(leaf["marks"]) for leaf in source["leaves"]},
                }
                manifest = PARSER["build_repair"](pdf, source_manifest)
                if manifest["sourceSha256"] != source["sourceSha256"]:
                    raise RuntimeError("parser_source_sha_mismatch")
                if int(manifest["marks"]) != 75 or int(manifest["leaves"]) != len(source["leaves"]):
                    raise RuntimeError("parser_count_or_mark_gate_failed")
                manifests.append(manifest)
                parse_leaves += int(manifest["leaves"])
                parse_marks += int(manifest["marks"])
                print(json.dumps({
                    "event": "parse_ok",
                    "index": index,
                    "total": len(sources),
                    "paper": key,
                    "leaves": manifest["leaves"],
                    "marks": manifest["marks"],
                }, separators=(",", ":")))
            except Exception as exc:
                failure = {"paper": key, "sourcePaperId": source.get("sourcePaperId"), "error": str(exc)[:3000]}
                parse_failures.append(failure)
                print(json.dumps({"event": "parse_failed", **failure}, ensure_ascii=False, separators=(",", ":")))

    if parse_failures:
        report = {
            "phase": "parse",
            "selectedPapers": len(sources),
            "parsedPapers": len(manifests),
            "parseFailures": parse_failures,
            "databaseWritesAttempted": False,
        }
        output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"event": "final", **report}, ensure_ascii=False, separators=(",", ":")))
        return 1

    if not only and (len(manifests) != EXPECTED_PAPERS or parse_leaves != EXPECTED_LEAVES or parse_marks != EXPECTED_MARKS):
        raise RuntimeError(f"parsed_corpus_baseline_mismatch:{len(manifests)}:{parse_leaves}:{parse_marks}")

    print(json.dumps({
        "event": "parse_gate_passed",
        "papers": len(manifests),
        "leaves": parse_leaves,
        "marks": parse_marks,
        "databaseWritesAttempted": True,
    }, separators=(",", ":")))

    applied: list[dict[str, Any]] = []
    apply_failures: list[dict[str, Any]] = []
    for index, manifest in enumerate(manifests, start=1):
        key = f"{manifest['year']}-{manifest['series']}-{manifest['component']}{manifest['variant']}"
        try:
            result = runner("source_text_repair_v3", {"manifest": manifest}, timeout=300)["result"]
            item = {"paper": key, "result": result}
            applied.append(item)
            print(json.dumps({"event": "apply_ok", "index": index, "total": len(manifests), **item}, ensure_ascii=False, separators=(",", ":")))
        except Exception as exc:
            failure = {"paper": key, "sourcePaperId": manifest.get("sourcePaperId"), "error": str(exc)[:3000]}
            apply_failures.append(failure)
            print(json.dumps({"event": "apply_failed", **failure}, ensure_ascii=False, separators=(",", ":")))

    updated = sum(int(item["result"].get("updated", 0)) for item in applied)
    unchanged = sum(int(item["result"].get("unchanged", 0)) for item in applied)
    report = {
        "phase": "apply",
        "selectedPapers": len(sources),
        "parsedPapers": len(manifests),
        "parsedLeaves": parse_leaves,
        "parsedMarks": parse_marks,
        "appliedPapers": len(applied),
        "applyFailures": apply_failures,
        "updatedLeaves": updated,
        "unchangedLeaves": unchanged,
    }
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"event": "final", **report}, ensure_ascii=False, separators=(",", ":")))
    return 1 if apply_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
