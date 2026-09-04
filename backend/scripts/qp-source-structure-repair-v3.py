#!/usr/bin/env python3
"""Two-phase source-fidelity repair orchestrator.

Phase 1 downloads and SHA-verifies every selected original QP, parses all
unresolved structured/visual targets and builds an in-memory repair manifest.
No database writes occur unless every selected source paper completes parsing
without provenance or parser failures.

Phase 2 applies the already-verified per-paper manifests through the guarded
service-role RPC. Ambiguous targets are deliberately skipped and remain
needs_review; they are never guessed or auto-approved.
"""
from __future__ import annotations

import hashlib
import json
import os
import runpy
import tempfile
from pathlib import Path
from typing import Any

BASE = runpy.run_path(
    "backend/scripts/qp-source-structure-repair-v2.py",
    run_name="source_structure_repair_v2_lib",
)


def source_key(source: dict[str, Any]) -> str:
    return BASE["source_key"](source)


def write_report(summary: dict[str, Any]) -> None:
    Path("source-structure-repair-plan.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    bootstrap = BASE["runner"]("source_structure_bootstrap_v2", timeout=180)["data"]
    if bootstrap.get("version") != "source-structure-repair-bootstrap-v2":
        raise RuntimeError("bootstrap_version_mismatch")

    sources = list(bootstrap.get("sources") or [])
    only = os.getenv("SOURCE_STRUCTURE_ONLY", "").strip()
    if only:
        sources = [
            source
            for source in sources
            if only
            in {
                str(source["sourcePaperId"]),
                source_key(source),
                str(source["syllabusCode"]),
            }
        ]
        if not sources:
            raise RuntimeError("source_structure_only_not_found")

    plan_only = os.getenv("SOURCE_STRUCTURE_APPLY", "").strip().upper() != "YES"
    plan_rows: list[dict[str, Any]] = []
    verified_manifests: list[tuple[str, dict[str, Any]]] = []
    paper_failures: list[dict[str, Any]] = []
    integrity_failures: list[dict[str, Any]] = []

    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        for source in sources:
            key = source_key(source)
            try:
                pdf = root / f"{key}.pdf"
                BASE["download"](str(source["sourceUrl"]), pdf)
                actual_sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
                expected_sha = str(source["sourceSha256"]).lower()
                if actual_sha != expected_sha:
                    integrity_failures.append(
                        {
                            "paper": key,
                            "sourcePaperId": source["sourcePaperId"],
                            "error": f"source_sha_mismatch:{actual_sha}:{expected_sha}",
                        }
                    )
                    continue

                paper_work = root / ("work-" + str(source["sourcePaperId"]))
                paper_work.mkdir(parents=True, exist_ok=True)
                rows, paper_plan = BASE["build_rows"](pdf, source, paper_work)
                plan_rows.extend({"paper": key, **item} for item in paper_plan)
                if rows:
                    verified_manifests.append(
                        (
                            key,
                            {
                                "version": "source-structure-repair-v2",
                                "sourcePaperId": source["sourcePaperId"],
                                "sourceSha256": expected_sha,
                                "rows": rows,
                            },
                        )
                    )
                print(
                    json.dumps(
                        {
                            "event": "paper_verified",
                            "paper": key,
                            "targets": len(source.get("targets") or []),
                            "planned": len(rows),
                        },
                        ensure_ascii=False,
                        separators=(",", ":"),
                    )
                )
            except Exception as exc:
                failure = {
                    "paper": key,
                    "sourcePaperId": source.get("sourcePaperId"),
                    "error": str(exc)[:3000],
                }
                paper_failures.append(failure)
                print(
                    json.dumps(
                        {"event": "paper_failed", **failure},
                        ensure_ascii=False,
                        separators=(",", ":"),
                    )
                )

        status_counts: dict[str, int] = {}
        for row in plan_rows:
            status = str(row.get("status") or "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1

        preflight = {
            "version": "source-structure-repair-v3",
            "mode": "plan" if plan_only else "apply",
            "bootstrapQuestions": bootstrap.get("questionCount"),
            "bootstrapPapers": bootstrap.get("paperCount"),
            "selectedPapers": len(sources),
            "verifiedPapers": len(sources) - len(paper_failures) - len(integrity_failures),
            "manifestPapers": len(verified_manifests),
            "statusCounts": status_counts,
            "paperFailures": paper_failures,
            "integrityFailures": integrity_failures,
            "rows": plan_rows,
        }

        # Hard fail before any write. This fixes v2's unsafe behavior where a
        # parser failure in a later paper could coexist with earlier writes.
        if paper_failures or integrity_failures:
            preflight["databaseWritesAttempted"] = False
            write_report(preflight)
            print(
                json.dumps(
                    {key: value for key, value in preflight.items() if key != "rows"},
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
            )
            return 1

        if plan_only:
            preflight["databaseWritesAttempted"] = False
            write_report(preflight)
            print(
                json.dumps(
                    {key: value for key, value in preflight.items() if key != "rows"},
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
            )
            return 0

        applied: list[dict[str, Any]] = []
        apply_failures: list[dict[str, Any]] = []
        for index, (key, manifest) in enumerate(verified_manifests, start=1):
            try:
                result = BASE["runner"](
                    "source_structure_apply_v2",
                    {"manifest": manifest},
                    timeout=300,
                )["result"]
                applied.append({"paper": key, "rows": len(manifest["rows"]), "result": result})
                print(
                    json.dumps(
                        {
                            "event": "apply_ok",
                            "index": index,
                            "total": len(verified_manifests),
                            "paper": key,
                            "rows": len(manifest["rows"]),
                        },
                        ensure_ascii=False,
                        separators=(",", ":"),
                    )
                )
            except Exception as exc:
                failure = {"paper": key, "error": str(exc)[:3000]}
                apply_failures.append(failure)
                print(
                    json.dumps(
                        {"event": "apply_failed", **failure},
                        ensure_ascii=False,
                        separators=(",", ":"),
                    )
                )

        summary = {
            **preflight,
            "databaseWritesAttempted": True,
            "appliedPapers": len(applied),
            "appliedRows": sum(int(item["rows"]) for item in applied),
            "applyFailures": apply_failures,
        }
        write_report(summary)
        print(
            json.dumps(
                {key: value for key, value in summary.items() if key != "rows"},
                ensure_ascii=False,
                separators=(",", ":"),
            )
        )
        return 1 if apply_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
