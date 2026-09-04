#!/usr/bin/env python3
"""Strict, non-destructive source audit for legacy Cambridge 9618 mark schemes.

The runner downloads each official MS PDF, verifies its stored SHA-256, extracts
question sections with pdftotext -layout, and proves that the current canonical
rubric is supported by that exact source section. It never rewrites questions,
taxonomy, dependencies, points or groups. Optional recording writes only durable
audit evidence; promotion is a separate database gate.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import tempfile
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Iterable

AUDIENCE = "cambridge-corpus"
AUDIT_VERSION = "9618-ms-source-audit-v1"


def oidc_token() -> str:
    base = os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]
    sep = "&" if "?" in base else "?"
    req = urllib.request.Request(
        base + sep + "audience=" + AUDIENCE,
        headers={"Authorization": "bearer " + os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)["value"]


def edge(action: str, payload: dict[str, Any] | None = None, timeout: int = 180) -> dict[str, Any]:
    req = urllib.request.Request(
        os.environ["MS_SOURCE_AUDIT_RUNNER_URL"],
        data=json.dumps({"action": action, **(payload or {})}).encode(),
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
    req = urllib.request.Request(direct, headers={"User-Agent": "CamPathMsSourceAudit/1.0"})
    with urllib.request.urlopen(req, timeout=120) as response, path.open("wb") as handle:
        while chunk := response.read(1024 * 1024):
            handle.write(chunk)
    if path.stat().st_size < 1000:
        raise RuntimeError("download_too_small")


def pdf_pages(pdf: Path) -> list[list[str]]:
    proc = subprocess.run(
        ["pdftotext", "-layout", "-enc", "UTF-8", str(pdf), "-"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return [page.splitlines() for page in proc.stdout.split("\f") if page.strip()]


def path_from_match(match: re.Match[str]) -> str:
    bits = [match.group(1)]
    if match.group(2):
        bits.append(match.group(2).lower())
    if match.group(3):
        bits.append(match.group(3).lower())
    return ".".join(bits)


ROW_RE = re.compile(
    r"^\s*(\d{1,2})(?:\s*\(([a-z])\))?(?:\s*\(([ivx]+)\))?\s+(.*?)\s+(\d{1,2})\s*$",
    re.IGNORECASE,
)


def parse_sections(pages: list[list[str]]) -> dict[str, dict[str, Any]]:
    flat: list[tuple[int, str]] = []
    for page_no, lines in enumerate(pages, 1):
        flat.extend((page_no, line) for line in lines)
        flat.append((page_no, ""))

    candidates: list[dict[str, Any]] = []
    for index, (page_no, raw) in enumerate(flat):
        match = ROW_RE.match(raw)
        if not match:
            continue
        top, marks = int(match.group(1)), int(match.group(5))
        if top > 30 or marks > 20:
            continue
        candidates.append({
            "index": index,
            "page": page_no,
            "path": path_from_match(match),
            "top": top,
            "has_part": bool(match.group(2) or match.group(3)),
            "marks": marks,
            "head": match.group(4).strip(),
        })

    ordered: list[dict[str, Any]] = []
    current = 0
    seen: set[str] = set()
    for item in candidates:
        top = int(item["top"])
        if item["has_part"]:
            if top < current or top > current + 1:
                continue
            if top == current + 1:
                current = top
        else:
            if top != current + 1:
                continue
            current = top
        if item["path"] not in seen:
            seen.add(item["path"])
            ordered.append(item)

    tops_with_parts = {int(item["top"]) for item in ordered if "." in str(item["path"])}
    ordered = [item for item in ordered if "." in str(item["path"]) or int(item["top"]) not in tops_with_parts]

    sections: dict[str, dict[str, Any]] = {}
    for pos, item in enumerate(ordered):
        end = int(ordered[pos + 1]["index"]) if pos + 1 < len(ordered) else len(flat)
        body = [str(item["head"])]
        body.extend(line for _page, line in flat[int(item["index"]) + 1 : end])
        cleaned = "\n".join(
            line for line in body
            if line.strip()
            and "Cambridge International AS & A Level" not in line
            and not line.lstrip().startswith("©")
        ).strip()
        sections[str(item["path"])] = {
            "page": int(item["page"]),
            "marks": int(item["marks"]),
            "text": cleaned,
        }
    return sections


def normalized(value: object) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).lower()
    for src, dst in (("–", "-"), ("—", "-"), ("−", "-"), ("’", "'"), ("“", '"'), ("”", '"')):
        text = text.replace(src, dst)
    text = re.sub(r"[`*_#]", " ", text)
    text = re.sub(r"[^a-z0-9.+\-/<>=]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def supported(phrase: object, source_text: str) -> tuple[bool, str]:
    key = normalized(phrase)
    if not key:
        return True, key
    # Very short fragments are unsafe evidence: they can match a mark number,
    # question label or unrelated table value by chance.
    if len(re.sub(r"[^a-z0-9]", "", key)) < 4:
        return False, key
    return key in normalized(source_text), key


def strings(value: object) -> Iterable[str]:
    if isinstance(value, list):
        for item in value:
            if isinstance(item, str) and item.strip():
                yield item


def canonical_hash(scheme: dict[str, Any]) -> str:
    keys = ("path", "schemeType", "maxMarks", "guidanceMd", "groups", "points", "levels")
    body = {key: scheme.get(key) for key in keys}
    return hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def audit_scheme(scheme: dict[str, Any], section: dict[str, Any] | None, source: dict[str, Any]) -> dict[str, Any]:
    reasons: list[dict[str, str]] = []
    source_text = str(section.get("text") if section else "")

    def fail(code: str, detail: str) -> None:
        reasons.append({"code": code, "detail": detail[:500]})

    if section is None:
        fail("source_path_missing", str(scheme.get("path")))
    else:
        if int(section["marks"]) != int(scheme.get("maxMarks") or -1):
            fail("source_mark_mismatch", f"source={section['marks']} canonical={scheme.get('maxMarks')}")
        if int(scheme.get("questionMarks") or -1) != int(scheme.get("maxMarks") or -2):
            fail("question_mark_mismatch", f"question={scheme.get('questionMarks')} scheme={scheme.get('maxMarks')}")

    if str(scheme.get("schemeType")) == "manual_only":
        fail("manual_only", "manual_only schemes are never auto-approved")
    if float(scheme.get("extractConfidence") or 0) < 0.95:
        fail("low_extract_confidence", str(scheme.get("extractConfidence")))
    if int(scheme.get("openQuestionFindings") or 0) > 0:
        fail("open_question_findings", str(scheme.get("openQuestionFindings")))
    if int(scheme.get("openSchemeFindings") or 0) > 0:
        fail("open_scheme_findings", str(scheme.get("openSchemeFindings")))
    if bool(scheme.get("inUse")):
        fail("question_in_use", "assignment or answer already references the question")

    points = list(scheme.get("points") or [])
    groups = list(scheme.get("groups") or [])
    levels = list(scheme.get("levels") or [])
    scheme_type = str(scheme.get("schemeType") or "")
    max_marks = int(scheme.get("maxMarks") or 0)

    if scheme_type == "all_required":
        if not points:
            fail("missing_points", "all_required scheme has no canonical points")
        elif sum(int(point.get("marks") or 0) for point in points) != max_marks:
            fail("point_mark_sum_mismatch", "all_required point marks do not equal max_marks")
    elif scheme_type == "any_n_from_m":
        if not groups or not points:
            fail("missing_group_structure", "any_n_from_m requires groups and points")
        for group in groups:
            n = int(group.get("nRequired") or 0)
            ppm = int(group.get("marksPerPoint") or 0)
            cap = int(group.get("maxMarks") or 0)
            if n <= 0 or ppm <= 0 or cap != n * ppm:
                fail("group_cap_mismatch", str(group.get("label") or group.get("id")))
    elif scheme_type == "levels_of_response":
        if not levels or max(int(level.get("maxMarks") or 0) for level in levels) != max_marks:
            fail("level_structure_mismatch", "levels do not reach max_marks")
    elif scheme_type not in {"exact_match", "code_output", "manual_only"}:
        fail("unsupported_scheme_type", scheme_type)

    evidence_phrases: list[tuple[str, str]] = []
    guidance = scheme.get("guidanceMd")
    if guidance:
        evidence_phrases.append(("guidance", str(guidance)))
    for group in groups:
        if group.get("label"):
            evidence_phrases.append(("group", str(group["label"])))
    for point in points:
        evidence_phrases.append((f"point:{point.get('code')}", str(point.get("text") or "")))
        evidence_phrases.extend((f"accept:{point.get('code')}", value) for value in strings(point.get("accept")))
        evidence_phrases.extend((f"reject:{point.get('code')}", value) for value in strings(point.get("reject")))
    for level in levels:
        evidence_phrases.append((f"level:{level.get('levelNumber')}", str(level.get("descriptorMd") or "")))
        if level.get("indicativeContentMd"):
            evidence_phrases.append((f"indicative:{level.get('levelNumber')}", str(level["indicativeContentMd"])))

    checked = 0
    matched = 0
    for label, phrase in evidence_phrases:
        ok, key = supported(phrase, source_text)
        if not key:
            continue
        checked += 1
        if ok:
            matched += 1
        else:
            fail("source_text_mismatch", f"{label}:{key}")

    if checked == 0:
        fail("no_source_text_evidence", "no canonical rubric phrase was available for source proof")

    result = "verified" if not reasons else "needs_review"
    evidence = {
        "strict": result == "verified",
        "path": scheme.get("path"),
        "displayRef": scheme.get("displayRef"),
        "sourceMarks": section.get("marks") if section else None,
        "canonicalMarks": scheme.get("maxMarks"),
        "canonicalHash": canonical_hash(scheme),
        "sourceSectionHash": hashlib.sha256(normalized(source_text).encode()).hexdigest() if source_text else None,
        "phrasesChecked": checked,
        "phrasesMatched": matched,
        "reasons": reasons,
        "schemeType": scheme_type,
        "extractConfidence": scheme.get("extractConfidence"),
    }
    return {
        "auditVersion": AUDIT_VERSION,
        "markSchemeId": scheme["markSchemeId"],
        "sourcePaperId": source["sourcePaperId"],
        "sourceSha256": source["sourceSha256"],
        "sourcePage": section.get("page") if section else None,
        "result": result,
        "evidence": evidence,
    }


def audit_source(source: dict[str, Any], root: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    key = f"{source['year']}-{source['series']}-{source['component']}{source['variant']}"
    pdf = root / f"9618-ms-{key}.pdf"
    download(str(source["sourceUrl"]), pdf)
    actual_sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
    if actual_sha != str(source["sourceSha256"]):
        raise RuntimeError(f"source_sha_mismatch:{actual_sha}:{source['sourceSha256']}")
    sections = parse_sections(pdf_pages(pdf))
    audits = [audit_scheme(scheme, sections.get(str(scheme["path"])), source) for scheme in source.get("schemes") or []]
    return audits, {
        "key": key,
        "schemes": len(audits),
        "verified": sum(1 for item in audits if item["result"] == "verified"),
        "needsReview": sum(1 for item in audits if item["result"] != "verified"),
        "parsedSections": len(sections),
    }


def record_batches(audits: list[dict[str, Any]], size: int = 100) -> int:
    recorded = 0
    for start in range(0, len(audits), size):
        data = edge("record_source_audit", {"audits": audits[start : start + size]}, timeout=180)
        recorded += int(data.get("data", {}).get("recorded", 0))
    return recorded


def main() -> int:
    bootstrap = edge("source_audit_bootstrap", timeout=180)["data"]
    if bootstrap.get("auditVersion") != AUDIT_VERSION:
        raise RuntimeError("bootstrap_audit_version_mismatch")

    all_audits: list[dict[str, Any]] = []
    papers: list[dict[str, Any]] = []
    source_failures: list[dict[str, str]] = []
    with tempfile.TemporaryDirectory(prefix="ms-source-audit-") as tmp:
        root = Path(tmp)
        for source in bootstrap.get("sources") or []:
            try:
                audits, summary = audit_source(source, root)
                all_audits.extend(audits)
                papers.append(summary)
                print(json.dumps(summary, separators=(",", ":")))
            except Exception as exc:  # fail closed and keep the rest of the corpus auditable
                key = f"{source.get('year')}-{source.get('series')}-{source.get('component')}{source.get('variant')}"
                source_failures.append({"key": key, "error": str(exc)[:1000]})
                for scheme in source.get("schemes") or []:
                    all_audits.append({
                        "auditVersion": AUDIT_VERSION,
                        "markSchemeId": scheme["markSchemeId"],
                        "sourcePaperId": source["sourcePaperId"],
                        "sourceSha256": source["sourceSha256"],
                        "sourcePage": None,
                        "result": "needs_review",
                        "evidence": {
                            "strict": False,
                            "path": scheme.get("path"),
                            "reasons": [{"code": "source_audit_error", "detail": str(exc)[:500]}],
                        },
                    })

    verified = sum(1 for item in all_audits if item["result"] == "verified")
    needs_review = len(all_audits) - verified
    recorded = 0
    if os.getenv("SOURCE_AUDIT_RECORD", "").strip().lower() in {"1", "true", "yes"}:
        recorded = record_batches(all_audits)

    report = {
        "auditVersion": AUDIT_VERSION,
        "targetCount": int(bootstrap.get("targetCount") or 0),
        "sourceCount": int(bootstrap.get("sourceCount") or 0),
        "audited": len(all_audits),
        "verified": verified,
        "needsReview": needs_review,
        "recorded": recorded,
        "sourceFailures": source_failures,
        "papers": papers,
        "audits": all_audits,
    }
    output = Path(os.getenv("SOURCE_AUDIT_REPORT", "ms-source-audit-report.json"))
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("targetCount", "sourceCount", "audited", "verified", "needsReview", "recorded")}, separators=(",", ":")))

    if len(all_audits) != int(bootstrap.get("targetCount") or 0):
        raise RuntimeError(f"audit_target_count_mismatch:{len(all_audits)}:{bootstrap.get('targetCount')}")
    if recorded and recorded != len(all_audits):
        raise RuntimeError(f"audit_record_count_mismatch:{recorded}:{len(all_audits)}")
    if os.getenv("SOURCE_AUDIT_STRICT", "").strip().lower() in {"1", "true", "yes"} and source_failures:
        raise RuntimeError(f"source_failures:{len(source_failures)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
