#!/usr/bin/env python3
"""Plan/apply source-proved cleanup of historical Cambridge 9618 MS point text.

The repair is deliberately narrower than the source matcher. It only removes
legacy PDF-layout noise from a point whose canonical text starts with the exact
printed question path and where deleting at most two mark-column integers makes
the remaining full phrase an exact normalized substring of the exact official
MS section pinned by SHA-256.

No paraphrase, fuzzy similarity, semantic rewrite or manual_only mutation is
allowed. Production writes go through apply_ms_source_point_repair_v1 and the
mark scheme remains needs_review until a fresh matcher-v5 audit passes it.
"""
from __future__ import annotations

import hashlib
import itertools
import json
import os
import re
import runpy
import tempfile
from pathlib import Path
from typing import Any

V5 = runpy.run_path(
    "backend/scripts/ms-source-audit-runner-v5.py",
    run_name="ms_source_point_repair_v1_base",
)
V4 = V5["V4"]
BASE = V4["BASE"]
NORMALIZED = V5["NORMALIZED"]
AUDIT_SCHEME = V5["audit_scheme_v5"]
RESOLVE_SECTION = V4["resolve_section_v4"]
AUDIT_VERSION = "9618-ms-source-audit-v2"
MATCHER_VERSION = "9618-ms-source-matcher-v5"
BOOTSTRAP_VERSION = "9618-ms-source-audit-bootstrap-v4"
REPAIR_VERSION = "9618-ms-point-source-repair-v1"
PROOF_MODE = "exact_source_substring_after_path_mark_column_strip_v1"
_TOKEN_RE = re.compile(r"[A-Za-z0-9]+")


def _tokens_with_spans(text: str) -> list[tuple[str, int, int]]:
    return [(m.group(0), m.start(), m.end()) for m in _TOKEN_RE.finditer(text)]


def _path_tokens(path: object) -> list[str]:
    return [token.lower() for token in re.findall(r"[A-Za-z0-9]+", str(path or ""))]


def _strip_exact_printed_path(text: str, path: object) -> tuple[str, list[str]] | None:
    spans = _tokens_with_spans(text)
    expected = _path_tokens(path)
    if not expected or len(spans) <= len(expected):
        return None
    actual = [spans[i][0].lower() for i in range(len(expected))]
    if actual != expected:
        return None
    end = spans[len(expected) - 1][2]
    candidate = text[end:].lstrip(" \t\r\n.:;-–—()[]")
    if not candidate:
        return None
    return candidate, expected


def _clean_after_token_delete(text: str, spans: list[tuple[str, int, int]], deleted: tuple[int, ...]) -> str:
    cuts = set(deleted)
    parts: list[str] = []
    cursor = 0
    for idx, (_token, start, end) in enumerate(spans):
        if idx not in cuts:
            continue
        parts.append(text[cursor:start])
        cursor = end
    parts.append(text[cursor:])
    value = "".join(parts)
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\s+([,.;:])", r"\1", value)
    value = re.sub(r"\(\s*\)", "", value)
    return value.strip(" \t\r\n")


def _exact_source_substring(candidate: str, source_text: str) -> bool:
    key = NORMALIZED(candidate)
    source = NORMALIZED(source_text)
    compact = re.sub(r"[^a-z0-9]", "", key)
    if len(compact) < 4:
        return False
    return f" {key} " in f" {source} "


def derive_point_repair(
    old_text: str,
    path: object,
    point_marks: object,
    scheme_marks: object,
    source_text: str,
) -> dict[str, Any] | None:
    """Return one unique source-proved layout-noise repair, otherwise None."""
    stripped = _strip_exact_printed_path(old_text, path)
    if stripped is None:
        return None
    base, path_prefix = stripped

    # If path removal alone proves the point, it is still a valid repair. This
    # is intentionally exact-substring only, not the broader audit matcher.
    if _exact_source_substring(base, source_text):
        return {
            "newText": base,
            "deletedMarkTokens": [],
            "pathPrefixTokens": path_prefix,
        }

    spans = _tokens_with_spans(base)
    if not spans:
        return None
    allowed_marks = {
        int(value)
        for value in (point_marks, scheme_marks)
        if str(value or "").isdigit() and 0 < int(value) <= 20
    }
    if not allowed_marks:
        return None

    eligible: list[int] = []
    for idx, (token, _start, _end) in enumerate(spans):
        if not token.isdigit() or int(token) not in allowed_marks:
            continue
        # Do not delete from binary/numeric sequences. A mark-column artefact is
        # a standalone numeric token, not one of several adjacent numeric cells.
        prev_numeric = idx > 0 and spans[idx - 1][0].isdigit()
        next_numeric = idx + 1 < len(spans) and spans[idx + 1][0].isdigit()
        if prev_numeric or next_numeric:
            continue
        eligible.append(idx)

    # Bound the combinatorics and fail closed on extremely numeric rubric rows.
    if not eligible or len(eligible) > 10:
        return None

    for delete_count in (1, 2):
        proved: dict[str, dict[str, Any]] = {}
        for deleted in itertools.combinations(eligible, delete_count):
            candidate = _clean_after_token_delete(base, spans, deleted)
            if not candidate or candidate == old_text or len(candidate) >= len(old_text):
                continue
            if not _exact_source_substring(candidate, source_text):
                continue
            key = NORMALIZED(candidate)
            deleted_values = [spans[index][0] for index in deleted]
            proved[key] = {
                "newText": candidate,
                "deletedMarkTokens": deleted_values,
                "pathPrefixTokens": path_prefix,
            }
        if len(proved) == 1:
            return next(iter(proved.values()))
        if len(proved) > 1:
            return None
    return None


def _point_reason(result: dict[str, Any], code: str, old_text: str) -> str | None:
    expected = f"point:{code}:{NORMALIZED(old_text)}"
    for reason in result.get("evidence", {}).get("reasons") or []:
        if reason.get("code") == "rubric_source_text_mismatch" and reason.get("detail") == expected:
            return expected
    return None


def plan_source(source: dict[str, Any], root: Path) -> tuple[dict[str, Any] | None, dict[str, Any]]:
    key = f"{source['year']}-{source['series']}-{source['component']}{source['variant']}"
    pdf = root / f"9618-ms-point-repair-{key}.pdf"
    BASE["download"](str(source["sourceUrl"]), pdf)
    actual_sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
    expected_sha = str(source["sourceSha256"])
    if actual_sha != expected_sha:
        raise RuntimeError(f"source_sha_mismatch:{actual_sha}:{expected_sha}")

    pages = BASE["pdf_pages"](pdf)
    parsed = BASE["parse_sections"](pages)
    rows: list[dict[str, Any]] = []
    considered = 0

    for scheme in source.get("schemes") or []:
        if str(scheme.get("schemeType")) == "manual_only":
            continue
        section = RESOLVE_SECTION(scheme, pages, parsed)
        audit = AUDIT_SCHEME(scheme, section, source)
        if not section or not audit.get("sourcePage"):
            continue
        evidence = audit.get("evidence") or {}
        section_hash = str(evidence.get("sourceSectionHash") or "")
        if not section_hash:
            continue
        source_text = str(section.get("text") or "")

        point_by_code = {
            str(point.get("code")): point
            for point in (scheme.get("points") or [])
            if point.get("code")
        }
        for code, point in point_by_code.items():
            old_text = str(point.get("text") or "")
            mismatch_detail = _point_reason(audit, code, old_text)
            if not mismatch_detail:
                continue
            considered += 1
            repair = derive_point_repair(
                old_text,
                scheme.get("path"),
                point.get("marks"),
                scheme.get("maxMarks"),
                source_text,
            )
            if repair is None:
                continue
            new_text = str(repair["newText"])
            rows.append({
                "markSchemeId": scheme["markSchemeId"],
                "pointId": point.get("id"),
                "pointCode": code,
                "expectedOldText": old_text,
                "newText": new_text,
                "mismatchDetail": mismatch_detail,
                "sourcePage": int(audit["sourcePage"]),
                "sourceSectionHash": section_hash,
                "proofMode": PROOF_MODE,
                "proof": {
                    "deletedMarkTokens": repair["deletedMarkTokens"],
                    "pathPrefixTokens": repair["pathPrefixTokens"],
                    "oldTextSha256": hashlib.sha256(old_text.encode()).hexdigest(),
                    "newTextSha256": hashlib.sha256(new_text.encode()).hexdigest(),
                },
                "displayRef": scheme.get("displayRef"),
            })

    manifest = None
    if rows:
        manifest = {
            "version": REPAIR_VERSION,
            "sourcePaperId": source["sourcePaperId"],
            "sourceSha256": source["sourceSha256"],
            "rows": rows,
        }
    return manifest, {
        "key": key,
        "consideredPointMismatches": considered,
        "plannedRepairs": len(rows),
    }


def _report_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "markSchemeId": row["markSchemeId"],
        "pointId": row["pointId"],
        "pointCode": row["pointCode"],
        "displayRef": row.get("displayRef"),
        "sourcePage": row["sourcePage"],
        "proofMode": row["proofMode"],
        "proof": row["proof"],
        "oldLength": len(row["expectedOldText"]),
        "newLength": len(row["newText"]),
    }


def main() -> int:
    index = BASE["edge"]("source_audit_index", timeout=180)["data"]
    if index.get("auditVersion") != AUDIT_VERSION:
        raise RuntimeError("source_audit_index_version_mismatch")
    if index.get("bootstrapVersion") != BOOTSTRAP_VERSION:
        raise RuntimeError("source_audit_bootstrap_version_mismatch")

    refs = list(index.get("sources") or [])
    if len(refs) != int(index.get("sourceCount") or 0):
        raise RuntimeError("source_index_count_mismatch")

    batch_size = max(1, min(8, int(os.getenv("SOURCE_AUDIT_SOURCE_BATCH_SIZE", "4"))))
    manifests: list[dict[str, Any]] = []
    paper_summaries: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []

    with tempfile.TemporaryDirectory(prefix="ms-source-point-repair-v1-") as tmp:
        root = Path(tmp)
        for start in range(0, len(refs), batch_size):
            requested = refs[start : start + batch_size]
            ids = [str(item["sourcePaperId"]) for item in requested]
            payload = BASE["edge"](
                "source_audit_batch", {"sourcePaperIds": ids}, timeout=180
            )["data"]
            if payload.get("auditVersion") != AUDIT_VERSION or payload.get("bootstrapVersion") != BOOTSTRAP_VERSION:
                raise RuntimeError("source_audit_batch_version_mismatch")
            sources = list(payload.get("sources") or [])
            returned = [str(item.get("sourcePaperId")) for item in sources]
            if set(returned) != set(ids) or len(returned) != len(ids):
                raise RuntimeError("source_audit_batch_identity_mismatch")

            for source in sources:
                key = f"{source.get('year')}-{source.get('series')}-{source.get('component')}{source.get('variant')}"
                try:
                    manifest, summary = plan_source(source, root)
                    paper_summaries.append(summary)
                    if manifest:
                        manifests.append(manifest)
                    print(json.dumps(summary, separators=(",", ":")))
                except Exception as exc:
                    failures.append({"key": key, "error": str(exc)[:1000]})

    strict = os.getenv("SOURCE_POINT_REPAIR_STRICT", "1").strip().lower() in {"1", "true", "yes"}
    if strict and failures:
        report = {
            "version": REPAIR_VERSION,
            "mode": "plan",
            "sourceCount": len(refs),
            "sourceFailures": failures,
            "plannedRepairs": 0,
            "papers": paper_summaries,
        }
        Path(os.getenv("SOURCE_POINT_REPAIR_REPORT", "ms-source-point-repair-report.json")).write_text(
            json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        raise RuntimeError(f"source_point_repair_source_failures:{len(failures)}")

    # The SQL contract accepts at most 80 rows. Keep each manifest tied to one
    # source identity while splitting only when a single MS paper exceeds that.
    apply_manifests: list[dict[str, Any]] = []
    for manifest in manifests:
        rows = list(manifest["rows"])
        for start in range(0, len(rows), 80):
            apply_manifests.append({**manifest, "rows": rows[start : start + 80]})

    should_apply = os.getenv("SOURCE_POINT_REPAIR_APPLY", "").strip().upper() == "YES"
    apply_results: list[dict[str, Any]] = []
    if should_apply:
        for manifest in apply_manifests:
            result = BASE["edge"](
                "source_point_repair_apply", {"manifest": manifest}, timeout=180
            )["data"]
            apply_results.append(result)

    planned_rows = [row for manifest in manifests for row in manifest["rows"]]
    report = {
        "version": REPAIR_VERSION,
        "mode": "apply" if should_apply else "plan",
        "sourceCount": len(refs),
        "targetCount": int(index.get("targetCount") or 0),
        "sourceFailures": failures,
        "consideredPointMismatches": sum(int(item["consideredPointMismatches"]) for item in paper_summaries),
        "plannedRepairs": len(planned_rows),
        "plannedSchemes": len({row["markSchemeId"] for row in planned_rows}),
        "plannedSources": len(manifests),
        "rows": [_report_row(row) for row in planned_rows],
        "papers": paper_summaries,
        "applyResults": apply_results,
        "applied": sum(int(item.get("applied") or 0) for item in apply_results),
        "replayed": sum(int(item.get("replayed") or 0) for item in apply_results),
    }
    output = Path(os.getenv("SOURCE_POINT_REPAIR_REPORT", "ms-source-point-repair-report.json"))
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "mode": report["mode"],
        "sourceCount": report["sourceCount"],
        "consideredPointMismatches": report["consideredPointMismatches"],
        "plannedRepairs": report["plannedRepairs"],
        "plannedSchemes": report["plannedSchemes"],
        "plannedSources": report["plannedSources"],
        "applied": report["applied"],
        "sourceFailures": len(failures),
    }, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
