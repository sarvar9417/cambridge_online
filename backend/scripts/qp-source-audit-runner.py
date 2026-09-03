#!/usr/bin/env python3
"""Read-only full-corpus source-fidelity audit for Cambridge 9618 Question Papers.

The runner obtains a database snapshot through an OIDC-protected Supabase Edge
Function, downloads every source-ready official QP, verifies its SHA-256 and
compares source-derived leaves with the database.

The production repair parser remains deliberately conservative. For audit-only
coverage this runner has a safer fallback event detector for legacy PDF layouts;
the fallback is read-only and is never used to mutate question data.
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
PSEUDOCODE_HEADS = {
    "OUTPUT", "INPUT", "DECLARE", "CALL", "RETURN", "IF", "ELSE", "ENDIF",
    "FOR", "NEXT", "WHILE", "ENDWHILE", "REPEAT", "UNTIL", "CASE", "ENDCASE",
    "PROCEDURE", "ENDPROCEDURE", "FUNCTION", "ENDFUNCTION", "TYPE", "ENDTYPE",
}


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
    req = urllib.request.Request(direct, headers={"User-Agent": "CamPathQpSourceAudit/1.1"})
    with urllib.request.urlopen(req, timeout=90) as response, path.open("wb") as handle:
        while chunk := response.read(1024 * 1024):
            handle.write(chunk)
    if path.stat().st_size < 1000:
        raise RuntimeError("download_too_small")


def normalized_text(value: object) -> str:
    text = unicodedata.normalize("NFKC", str(value or ""))
    text = text.replace("\u00a0", " ")
    for char in ("\u2010", "\u2011", "\u2012", "\u2013"):
        text = text.replace(char, "-")
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


def semantic_text(context: object, stem: object) -> str:
    """Canonicalise representation-only differences without hiding source artefacts.

    Context may historically be embedded at the beginning of stem_md. Answer-space
    dotted/underscore placeholders are presentation scaffolding rather than question
    semantics, so they are ignored. Standalone numeric response-row labels at the
    very end (1,2,3,...) are also ignored. A lone trailing page number is *not*
    ignored, so accidental page-number contamination still appears as a mismatch.
    """
    context_text = normalized_text(context)
    stem_text = normalized_text(stem)
    if context_text and (stem_text == context_text or stem_text.startswith(context_text + "\n")):
        combined = stem_text
    else:
        combined = "\n".join(part for part in (context_text, stem_text) if part)

    combined = re.sub(r"\.{8,}|_{8,}|…{4,}", " ", combined)
    lines = [re.sub(r"\s+", " ", line).strip() for line in combined.splitlines()]
    lines = [line for line in lines if line]

    numeric_tail: list[int] = []
    for line in reversed(lines):
        if re.fullmatch(r"[1-9]\d?", line) is None:
            break
        numeric_tail.append(int(line))
    numeric_tail.reverse()
    if numeric_tail:
        labels = numeric_tail
        if len(labels) >= 3 and labels[-1] > labels[-2] + 1:
            labels = labels[:-1]
        if len(labels) >= 2 and labels == list(range(1, len(labels) + 1)):
            remove_count = len(labels)
            # Preserve a possible trailing page number so it remains auditable.
            if len(numeric_tail) > len(labels):
                page = str(numeric_tail[-1])
                lines = lines[: -len(numeric_tail)] + [page]
            else:
                lines = lines[:-remove_count]

    return normalized_text("\n".join(lines))


def audit_main_candidate(raw: str, expected_number: int):
    match = re.match(r"^(\s*)(\d{1,2})\s+(.+)$", raw)
    if not match:
        return None
    indent = len(match.group(1))
    number = int(match.group(2))
    rest = match.group(3).strip()
    if number != expected_number:
        return None
    if re.match(r"^hours?\b", rest, re.IGNORECASE):
        return None
    if not re.match(r"^(?:\([a-z]\)|[A-Za-z])", rest, re.IGNORECASE):
        return None

    # Real question numbers in the legacy Cambridge layouts audited here are
    # left-aligned with 0-4 spaces. Keep support for the old 24-36-space shape,
    # but only when the remainder is clearly sentence-like. This prevents queue /
    # trace-table rows such as "                                4 Wasp" from being
    # mistaken for Q4 and consuming every later question.
    if indent <= 4:
        pass
    elif 24 <= indent <= 36:
        words = rest.split()
        if len(rest) < 18 or len(words) < 4:
            return None
    else:
        return None

    first = re.match(r"[A-Za-z]+", rest)
    if first and first.group(0).upper() in PSEUDOCODE_HEADS and first.group(0).isupper():
        return None
    return indent, number, rest


def detect_events_audit(lines: list[str], valid: set[str]) -> list[dict[str, object]]:
    valid_prefixes = PARSER["prefix_set"](valid)
    mains = sorted({int(path.split(".")[0]) for path in valid})
    if not mains:
        return []
    max_main = max(mains)
    next_main = min(mains)
    current_q: str | None = None
    current_part: str | None = None
    events: list[dict[str, object]] = []
    part_re = re.compile(r"^\s*\(([a-z])\)\s*(.*)$", re.IGNORECASE)
    roman_re = re.compile(r"^\s*\(([ivx]+)\)\s*(.*)$", re.IGNORECASE)

    for line_number, raw in enumerate(lines):
        if not raw.strip():
            continue
        candidate = audit_main_candidate(raw, next_main) if next_main <= max_main else None
        if candidate:
            _, number, rest = candidate
            current_q = str(number)
            current_part = None
            larger = [value for value in mains if value > number]
            next_main = larger[0] if larger else max_main + 1
            embedded = re.match(r"^\s*\(([a-z])\)\s*(?:\(([ivx]+)\)\s*)?(.*)$", rest, re.IGNORECASE)
            if embedded:
                part = embedded.group(1).lower()
                roman = embedded.group(2).lower() if embedded.group(2) else None
                path = f"{number}.{part}" + (f".{roman}" if roman else "")
                if path in valid_prefixes:
                    current_part = part
                    events.append({"path": path, "line": line_number, "head": embedded.group(3)})
                else:
                    events.append({"path": str(number), "line": line_number, "head": rest})
            else:
                events.append({"path": str(number), "line": line_number, "head": rest})
            continue

        part_match = part_re.match(raw)
        if part_match and current_q:
            part = part_match.group(1).lower()
            rest = part_match.group(2)
            roman_match = re.match(r"^\s*\(([ivx]+)\)\s*(.*)$", rest, re.IGNORECASE)
            roman = roman_match.group(1).lower() if roman_match else None
            text = roman_match.group(2) if roman_match else rest
            path = f"{current_q}.{part}" + (f".{roman}" if roman else "")
            if path in valid_prefixes:
                current_part = part
                events.append({"path": path, "line": line_number, "head": text})
                continue

        roman_match = roman_re.match(raw)
        if roman_match and current_q and current_part:
            roman = roman_match.group(1).lower()
            path = f"{current_q}.{current_part}.{roman}"
            if path in valid_prefixes:
                events.append({"path": path, "line": line_number, "head": roman_match.group(2)})

    deduped: list[dict[str, object]] = []
    for event in events:
        if deduped and event["path"] == deduped[-1]["path"] and int(event["line"]) - int(deduped[-1]["line"]) < 3:
            continue
        deduped.append(event)
    return deduped


def parse_text_audit(text: str, expected: dict[str, int]) -> tuple[dict[str, dict[str, object]], str]:
    try:
        rows, _ = PARSER["parse_text"](text, expected)
        return rows, "repair-parser"
    except ValueError as exc:
        if not str(exc).startswith("missing_paths:"):
            raise

    lines = PARSER["preprocess_text"](text)
    events = detect_events_audit(lines, set(expected))
    nodes: dict[str, str] = {}
    for index, event in enumerate(events):
        end = int(events[index + 1]["line"]) if index + 1 < len(events) else len(lines)
        path = str(event["path"])
        if path in nodes:
            continue
        nodes[path] = PARSER["clean_segment"](
            [str(event["head"]), *lines[int(event["line"]) + 1 : end]],
            expected.get(path),
        )

    missing = sorted(set(expected) - set(nodes))
    if missing:
        raise ValueError(f"audit_missing_paths:{','.join(missing)}")

    rows: dict[str, dict[str, object]] = {}
    for path, marks in expected.items():
        stem = nodes[path]
        if not stem.strip():
            raise ValueError(f"audit_empty_stem:{path}")
        bits = path.split(".")
        ancestors: list[str] = []
        for depth in range(1, len(bits)):
            ancestor = nodes.get(".".join(bits[:depth]))
            if ancestor:
                ancestors.append(ancestor)
        rows[path] = {
            "path": path,
            "marks": marks,
            "stem": stem,
            "context": "\n\n".join(ancestors).strip() or None,
        }
    return rows, "audit-fallback"


def source_rows(pdf: Path, source: dict[str, Any], expected: dict[str, int]) -> tuple[dict[str, dict[str, object]], str]:
    text = PARSER["pdftotext_layout"](pdf)
    rows, parser_mode = parse_text_audit(text, expected)
    aliases: dict[str, str] = {}
    for path, row in rows.items():
        row["displayRef"] = PARSER["canonical_ref"](
            str(source["syllabusCode"]),
            int(source["component"]),
            int(source["variant"]),
            str(source["series"]),
            int(source["year"]),
            path,
            aliases,
        )
    return rows, parser_mode


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
    parsed_by_path, parser_mode = source_rows(pdf, source, expected)
    if len(parsed_by_path) != len(leaves) or sum(int(row["marks"]) for row in parsed_by_path.values()) != 75:
        raise RuntimeError("parser_count_or_mark_gate_failed")

    mismatches: list[dict[str, Any]] = []
    exact_stems = normalized_stems = exact_contexts = normalized_contexts = exact_refs = 0
    semantic_matches = representation_differences = 0

    for leaf in leaves:
        path = str(leaf["path"])
        row = parsed_by_path[path]
        stem_cmp = comparison(row.get("stem"), leaf.get("stemMd"))
        context_cmp = comparison(row.get("context"), leaf.get("contextMd"))
        ref_equal = str(row.get("displayRef") or "") == str(leaf.get("displayRef") or "")
        semantic_equal = semantic_text(row.get("context"), row.get("stem")) == semantic_text(
            leaf.get("contextMd"), leaf.get("stemMd")
        )
        exact_stems += int(stem_cmp["exact"])
        normalized_stems += int(stem_cmp["normalized"])
        exact_contexts += int(context_cmp["exact"])
        normalized_contexts += int(context_cmp["normalized"])
        exact_refs += int(ref_equal)
        semantic_matches += int(semantic_equal)
        if semantic_equal and not (stem_cmp["exact"] and context_cmp["exact"]):
            representation_differences += 1

        if not (semantic_equal and ref_equal):
            mismatches.append({
                "questionId": leaf.get("questionId"),
                "path": path,
                "displayRef": leaf.get("displayRef"),
                "status": leaf.get("status"),
                "promptVersion": leaf.get("promptVersion"),
                "stem": stem_cmp,
                "context": context_cmp,
                "semanticMatch": semantic_equal,
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
        "parserMode": parser_mode,
        "leaves": len(leaves),
        "marks": 75,
        "exactStemMatches": exact_stems,
        "normalizedStemMatches": normalized_stems,
        "exactContextMatches": exact_contexts,
        "normalizedContextMatches": normalized_contexts,
        "semanticMatches": semantic_matches,
        "representationDifferences": representation_differences,
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
                    "parserMode": result["parserMode"],
                    "leaves": result["leaves"],
                    "semanticMismatches": result["mismatchCount"],
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
        "semanticMismatchLeaves": sum(int(item["mismatchCount"]) for item in succeeded),
        "semanticMatches": sum(int(item["semanticMatches"]) for item in succeeded),
        "representationDifferences": sum(int(item["representationDifferences"]) for item in succeeded),
        "exactStemMatches": sum(int(item["exactStemMatches"]) for item in succeeded),
        "normalizedStemMatches": sum(int(item["normalizedStemMatches"]) for item in succeeded),
        "exactContextMatches": sum(int(item["exactContextMatches"]) for item in succeeded),
        "normalizedContextMatches": sum(int(item["normalizedContextMatches"]) for item in succeeded),
        "exactDisplayRefMatches": sum(int(item["exactDisplayRefMatches"]) for item in succeeded),
        "fallbackPapers": sum(1 for item in succeeded if item["parserMode"] == "audit-fallback"),
        "strict": strict,
    }
    report = {"summary": summary, "failed": failed, "papers": succeeded}
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, separators=(",", ":")))

    hard_ref_failures = any(int(item["exactDisplayRefMatches"]) != int(item["leaves"]) for item in succeeded)
    semantic_mismatches = int(summary["semanticMismatchLeaves"]) > 0
    return 1 if failed or hard_ref_failures or (strict and semantic_mismatches) else 0


if __name__ == "__main__":
    raise SystemExit(main())
