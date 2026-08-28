#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import runpy
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

AUDIENCE = "cambridge-corpus"
PARSER = runpy.run_path("backend/scripts/qp-source-repair.py", run_name="qp_source_repair_impl")


def oidc_token() -> str:
    base = os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]
    sep = "&" if "?" in base else "?"
    req = urllib.request.Request(
        base + sep + "audience=" + AUDIENCE,
        headers={"Authorization": "bearer " + os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)["value"]


def runner(action: str, payload: dict | None = None, timeout: int = 180) -> dict:
    url = os.environ["CORPUS_RUNNER_URL"]
    req = urllib.request.Request(
        url,
        data=json.dumps({"action": action, **(payload or {})}, ensure_ascii=False).encode(),
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
    req = urllib.request.Request(direct, headers={"User-Agent": "CamPathQpSourceRepair/2.0"})
    with urllib.request.urlopen(req, timeout=60) as response, path.open("wb") as handle:
        while chunk := response.read(1024 * 1024):
            handle.write(chunk)
    if path.stat().st_size < 1000:
        raise RuntimeError("download_too_small")


def main() -> int:
    bootstrap = runner("source_repair_bootstrap", timeout=120)["data"]
    if bootstrap.get("parserVersion") != PARSER["PARSER_VERSION"]:
        raise RuntimeError("bootstrap_parser_version_mismatch")
    sources = list(bootstrap.get("sources") or [])
    if len(sources) != 11:
        raise RuntimeError(f"expected_11_sources:{len(sources)}")

    only = os.getenv("SOURCE_REPAIR_ONLY", "").strip()
    if only:
        sources = [source for source in sources if only in {
            str(source["sourcePaperId"]),
            f"{source['year']}-{source['series']}-{source['component']}{source['variant']}",
        }]
        if not sources:
            raise RuntimeError("source_repair_only_not_found")

    succeeded: list[dict] = []
    failed: list[dict] = []
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        for source in sources:
            key = f"{source['year']}-{source['series']}-{source['component']}{source['variant']}"
            try:
                pdf = root / f"9618-{key}.pdf"
                download(str(source["sourceUrl"]), pdf)
                actual_sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
                if actual_sha != source["sourceSha256"]:
                    raise RuntimeError(f"source_sha_mismatch:{actual_sha}:{source['sourceSha256']}")

                source_manifest = {
                    "sourcePaperId": source["sourcePaperId"],
                    "syllabusCode": source["syllabusCode"],
                    "component": source["component"],
                    "variant": source["variant"],
                    "series": source["series"],
                    "year": source["year"],
                    "expectedMarks": source["expectedMarks"],
                    "leaves": source["leaves"],
                }
                source_manifest["_expected"] = {
                    str(leaf["path"]): int(leaf["marks"]) for leaf in source["leaves"]
                }
                manifest = PARSER["build_repair"](pdf, source_manifest)
                if manifest["sourceSha256"] != source["sourceSha256"]:
                    raise RuntimeError("parser_source_sha_mismatch")
                if manifest["marks"] != 75 or manifest["leaves"] != len(source["leaves"]):
                    raise RuntimeError("parser_count_or_mark_gate_failed")

                applied = runner("source_text_repair", {"manifest": manifest}, timeout=180)["result"]
                summary = {"paper": key, "leaves": manifest["leaves"], "marks": manifest["marks"], "result": applied}
                succeeded.append(summary)
                print(json.dumps({"event": "paper_ok", **summary}, ensure_ascii=False, separators=(",", ":")))
            except Exception as exc:
                failure = {"paper": key, "error": str(exc)[:2000]}
                failed.append(failure)
                print(json.dumps({"event": "paper_failed", **failure}, ensure_ascii=False, separators=(",", ":")))

    final = {"event": "final", "selected": len(sources), "succeeded": len(succeeded), "failed": len(failed), "failed_papers": failed}
    print(json.dumps(final, ensure_ascii=False, separators=(",", ":")))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
