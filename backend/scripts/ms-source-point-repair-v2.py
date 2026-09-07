#!/usr/bin/env python3
"""Plan/apply a second conservative Cambridge 9618 MS point cleanup pass.

V1 repaired point text only when the printed question path was a prefix. V2
covers the remaining deterministic PDF table-layout class where that same path
was interleaved into the answer row (often between language/example columns), or
where a trailing ``Published YYYY`` footer leaked into the point text.

Every proposed new value must be a full exact normalized substring of the exact
official MS section after SHA-256 verification. The only deletions V2 may make
are: the exact current question-path token sequence, up to two standalone mark
column integers equal to the point/scheme mark values, and a terminal
``Published <paper year>`` footer. No fuzzy matching, paraphrase, arbitrary token
removal, manual_only mutation, or automatic approval is allowed.
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

V1 = runpy.run_path(
    "backend/scripts/ms-source-point-repair-v1.py",
    run_name="ms_source_point_repair_v2_base",
)
V5 = V1["V5"]
V4 = V1["V4"]
BASE = V1["BASE"]
NORMALIZED = V1["NORMALIZED"]
AUDIT_SCHEME = V1["AUDIT_SCHEME"]
RESOLVE_SECTION = V1["RESOLVE_SECTION"]
AUDIT_VERSION = V1["AUDIT_VERSION"]
MATCHER_VERSION = V1["MATCHER_VERSION"]
BOOTSTRAP_VERSION = V1["BOOTSTRAP_VERSION"]
REPAIR_VERSION = "9618-ms-point-source-repair-v2"
PROOF_MODE = "exact_source_substring_after_embedded_layout_strip_v2"
_TOKEN_RE = re.compile(r"[A-Za-z0-9]+")


def _tokens_with_spans(text: str) -> list[tuple[str, int, int]]:
    return [(m.group(0), m.start(), m.end()) for m in _TOKEN_RE.finditer(text)]


def _path_tokens(path: object) -> list[str]:
    return [token.lower() for token in re.findall(r"[A-Za-z0-9]+", str(path or ""))]


def _path_occurrences(spans: list[tuple[str, int, int]], path: object) -> list[tuple[int, ...]]:
    expected = _path_tokens(path)
    if not expected or len(spans) < len(expected):
        return []
    tokens = [item[0].lower() for item in spans]
    width = len(expected)
    return [
        tuple(range(start, start + width))
        for start in range(0, len(tokens) - width + 1)
        if tokens[start : start + width] == expected
    ]


def _clean_after_token_delete(
    text: str, spans: list[tuple[str, int, int]], deleted: tuple[int, ...] | set[int]
) -> str:
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
    return value.strip(" \t\r\n.,;:-–—")


def _exact_source_substring(candidate: str, source_text: str) -> bool:
    key = NORMALIZED(candidate)
    source = NORMALIZED(source_text)
    compact = re.sub(r"[^a-z0-9]", "", key)
    if len(compact) < 4:
        return False
    return f" {key} " in f" {source} "


def _standalone_mark_indices(
    spans: list[tuple[str, int, int]], point_marks: object, scheme_marks: object
) -> list[int]:
    allowed = {
        int(value)
        for value in (point_marks, scheme_marks)
        if str(value or "").isdigit() and 0 < int(value) <= 20
    }
    if not allowed:
        return []
    eligible: list[int] = []
    for idx, (token, _start, _end) in enumerate(spans):
        if not token.isdigit() or int(token) not in allowed:
            continue
        # A mark-column value must be standalone, never one cell in a run of
        # numeric/binary data where deletion could alter the substantive answer.
        prev_numeric = idx > 0 and spans[idx - 1][0].isdigit()
        next_numeric = idx + 1 < len(spans) and spans[idx + 1][0].isdigit()
        if prev_numeric or next_numeric:
            continue
        eligible.append(idx)
    return eligible


def _footer_indices(spans: list[tuple[str, int, int]], year: object) -> tuple[int, ...]:
    if len(spans) < 2 or not str(year or "").isdigit():
        return ()
    if spans[-2][0].lower() == "published" and spans[-1][0] == str(year):
        return (len(spans) - 2, len(spans) - 1)
    return ()


def derive_point_repair_v2(
    old_text: str,
    path: object,
    point_marks: object,
    scheme_marks: object,
    source_text: str,
    year: object,
) -> dict[str, Any] | None:
    """Return one unique exact-source layout cleanup, otherwise fail closed."""
    spans = _tokens_with_spans(old_text)
    if not spans:
        return None

    path_sets = _path_occurrences(spans, path)
    footer = _footer_indices(spans, year)
    if not path_sets and not footer:
        return None

    mark_indices = _standalone_mark_indices(spans, point_marks, scheme_marks)
    if len(mark_indices) > 12:
        return None

    deletion_sets: set[tuple[int, ...]] = set()
    # Embedded/prefix path is always allowed; combine it with at most two
    # independently eligible mark-column values and optionally the footer.
    for path_set in path_sets:
        path_cut = set(path_set)
        available_marks = [idx for idx in mark_indices if idx not in path_cut]
        for mark_count in range(0, min(2, len(available_marks)) + 1):
            for marks in itertools.combinations(available_marks, mark_count):
                cut = path_cut | set(marks)
                deletion_sets.add(tuple(sorted(cut)))
                if footer:
                    deletion_sets.add(tuple(sorted(cut | set(footer))))

    # A leaked terminal publication footer can be repaired independently of a
    # printed path occurrence because its identity is fully constrained by year.
    if footer:
        deletion_sets.add(tuple(footer))

    proved: dict[str, dict[str, Any]] = {}
    old_norm_len = max(1, len(NORMALIZED(old_text)))
    path_token_set = set(_path_tokens(path))
    for deleted in sorted(deletion_sets, key=lambda item: (len(item), item)):
        candidate = _clean_after_token_delete(old_text, spans, deleted)
        if not candidate or len(candidate) >= len(old_text):
            continue
        # Small bounded deletions must not collapse a long point into an
        # unrelated tiny substring even if that tiny phrase happens to occur.
        if len(NORMALIZED(candidate)) < int(old_norm_len * 0.60):
            continue
        if not _exact_source_substring(candidate, source_text):
            continue
        key = NORMALIZED(candidate)
        deleted_tokens = [spans[idx][0] for idx in deleted]
        deleted_path_tokens = [token.lower() for token in deleted_tokens if token.lower() in path_token_set]
        proved[key] = {
            "newText": candidate,
            "deletedTokens": deleted_tokens,
            "deletedIndices": list(deleted),
            "deletedPathTokens": deleted_path_tokens,
            "removedPublishedFooter": bool(footer and set(footer).issubset(set(deleted))),
        }

    if len(proved) != 1:
        return None
    return next(iter(proved.values()))


def _point_reason(result: dict[str, Any], code: str, old_text: str) -> str | None:
    expected = f"point:{code}:{NORMALIZED(old_text)}"
    for reason in result.get("evidence", {}).get("reasons") or []:
        if reason.get("code") == "rubric_source_text_mismatch" and reason.get("detail") == expected:
            return expected
    return None


def plan_source(source: dict[str, Any], root: Path) -> tuple[dict[str, Any] | None, dict[str, Any]]:
    key = f"{source['year']}-{source['series']}-{source['component']}{source['variant']}"
    pdf = root / f"9618-ms-point-repair-v2-{key}.pdf"
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

        for point in scheme.get("points") or []:
            code = str(point.get("code") or "")
            if not code:
                continue
            old_text = str(point.get("text") or "")
            mismatch_detail = _point_reason(audit, code, old_text)
            if not mismatch_detail:
                continue
            considered += 1
            repair = derive_point_repair_v2(
                old_text,
                scheme.get("path"),
                point.get("marks"),
                scheme.get("maxMarks"),
                source_text,
                source.get("year"),
            )
            if repair is None:
                continue
            new_text = str(repair["newText"])
            rows.append({
                "markSchemeId": scheme["markSchemeId"],
                "pointCode": code,
                "expectedOldText": old_text,
                "newText": new_text,
                "mismatchDetail": mismatch_detail,
                "sourcePage": int(audit["sourcePage"]),
                "sourceSectionHash": section_hash,
                "proofMode": PROOF_MODE,
                "proof": {
                    "deletedTokens": repair["deletedTokens"],
                    "deletedIndices": repair["deletedIndices"],
                    "deletedPathTokens": repair["deletedPathTokens"],
                    "removedPublishedFooter": repair["removedPublishedFooter"],
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

    with tempfile.TemporaryDirectory(prefix="ms-source-point-repair-v2-") as tmp:
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
    output = Path(os.getenv("SOURCE_POINT_REPAIR_REPORT", "ms-source-point-repair-v2-report.json"))
    if strict and failures:
        report = {
            "version": REPAIR_VERSION,
            "mode": "plan",
            "sourceCount": len(refs),
            "sourceFailures": failures,
            "plannedRepairs": 0,
            "papers": paper_summaries,
        }
        output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        raise RuntimeError(f"source_point_repair_v2_source_failures:{len(failures)}")

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
                "source_point_repair_v2_apply", {"manifest": manifest}, timeout=180
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
