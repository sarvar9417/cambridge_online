#!/usr/bin/env python3
"""Source-backed canonical content backfill for official Cambridge 0478/9618 QPs.

The runner is deliberately two-phase. Every selected original QP is downloaded,
SHA-256 verified, parsed with bbox provenance, and all candidate rows are planned
before any database writes are attempted. A leaf is writable only when:

* its printed event can be located unambiguously in the original PDF;
* the stored stem is proven to occur in that exact source segment;
* no unresolved table/layout/visual fidelity finding remains;
* every structured asset has source-page provenance and can be represented by
  the canonical v1 schema.

Ambiguous leaves remain on the legacy renderer and are reported; they are never
guessed, auto-approved or silently flattened.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

AUDIENCE = "cambridge-corpus"
PARSER_VERSION = "structured-content-source-v1"
REPORT_PATH = Path(os.getenv("STRUCTURED_CONTENT_REPORT", "structured-content-backfill-report.json"))
MARGIN_RE = re.compile(r"DO\s+NOT\s+WRITE\s+IN\s+THIS\s+MARGIN", re.I)
PART_RE = re.compile(r"^\(([a-z])\)\s*(.*)$", re.I)
ROMAN_RE = re.compile(r"^\(((?:i|ii|iii|iv|v|vi|vii|viii|ix|x))\)\s*(.*)$", re.I)
MAIN_RE = re.compile(r"^(\d{1,2})(?:\s+(.*))?$")
MARK_ONLY_RE = re.compile(r"^\[\s*\d+\s*\]$")
DOTS_RE = re.compile(r"^(?:\d+\s+)?\.{8,}(?:\s*\[\d+\])?$")
FOOTER_RES = [
    re.compile(r"^©\s*(?:UCLES|Cambridge)", re.I),
    re.compile(r"^\d{4}/\d{2}/(?:F/M|M/J|O/N)/\d{2}$", re.I),
    re.compile(r"^\[Turn over", re.I),
    re.compile(r"^Trace ID:", re.I),
    re.compile(r"Re-uploading, mirroring|Licensed for hosting|papacambridge|Downloaded from", re.I),
]


@dataclass(frozen=True)
class Line:
    page: int
    ymin: float
    ymax: float
    xmin: float
    xmax: float
    text: str


@dataclass(frozen=True)
class Event:
    path: str
    index: int
    page: int
    head: str


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
    req = urllib.request.Request(
        os.environ["STRUCTURED_CONTENT_RUNNER_URL"],
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


def download(url: str, path: Path, attempts: int = 3) -> None:
    direct = f"https://drive.usercontent.google.com/download?id={drive_id(url)}&export=download&confirm=t"
    last: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            req = urllib.request.Request(direct, headers={"User-Agent": "CamPathStructuredBackfill/1.0"})
            with urllib.request.urlopen(req, timeout=90) as response, path.open("wb") as handle:
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


def clean_text(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", value)
    return " ".join(value.split())


def strip_margin_token(value: str) -> str:
    text = clean_text(value)
    # Some 0478 PDFs expose the vertical margin wording as an isolated NOT/IN
    # token immediately before a real question label. Strip only this narrow
    # parser artefact, never ordinary prose containing these words.
    text = re.sub(r"^(?:NOT|IN)\s+(?=(?:\d{1,2}\b|\([a-z]\)|\([ivx]+\)))", "", text, flags=re.I)
    return text


def is_noise(text: str) -> bool:
    value = clean_text(text)
    if not value or MARGIN_RE.search(value) or MARK_ONLY_RE.fullmatch(value) or DOTS_RE.fullmatch(value):
        return True
    if value == "DFD" or re.fullmatch(r"\*\s*\d+\s*\*", value):
        return True
    return any(pattern.search(value) for pattern in FOOTER_RES)


def parse_bbox(pdf: Path, work: Path) -> list[Line]:
    html = work / (pdf.stem + ".bbox.html")
    subprocess.run(["pdftotext", "-bbox-layout", str(pdf), str(html)], check=True, timeout=120)
    root = ET.parse(html).getroot()
    lines: list[Line] = []
    pages = [node for node in root.iter() if node.tag.endswith("page")]
    for page_number, page in enumerate(pages, start=1):
        raw: list[Line] = []
        for node in page.iter():
            if not node.tag.endswith("line"):
                continue
            words = [child for child in node.iter() if child.tag.endswith("word")]
            text = " ".join("".join(word.itertext()).strip() for word in words if "".join(word.itertext()).strip())
            if not text:
                continue
            raw.append(Line(
                page_number,
                float(node.attrib.get("yMin", node.attrib.get("ymin", "0"))),
                float(node.attrib.get("yMax", node.attrib.get("ymax", "0"))),
                float(node.attrib.get("xMin", node.attrib.get("xmin", "0"))),
                float(node.attrib.get("xMax", node.attrib.get("xmax", "0"))),
                text,
            ))
        raw.sort(key=lambda item: (item.ymin, item.xmin))
        groups: list[list[Line]] = []
        for line in raw:
            if groups and abs(groups[-1][0].ymin - line.ymin) <= 1.7:
                groups[-1].append(line)
            else:
                groups.append([line])
        for group in groups:
            group.sort(key=lambda item: item.xmin)
            text = strip_margin_token(" ".join(item.text for item in group))
            if text:
                lines.append(Line(
                    page_number,
                    min(item.ymin for item in group),
                    max(item.ymax for item in group),
                    min(item.xmin for item in group),
                    max(item.xmax for item in group),
                    text,
                ))
    return lines


def prefixes(paths: Iterable[str]) -> set[str]:
    result: set[str] = set()
    for path in paths:
        bits = str(path).split(".")
        for depth in range(1, len(bits) + 1):
            result.add(".".join(bits[:depth]))
    return result


def embedded_part(q: str, rest: str, valid: set[str]) -> tuple[str | None, str | None, str]:
    part = PART_RE.match(rest)
    if not part:
        return None, None, rest
    letter = part.group(1).lower()
    tail = clean_text(part.group(2))
    roman = ROMAN_RE.match(tail)
    if roman and f"{q}.{letter}.{roman.group(1).lower()}" in valid:
        return letter, roman.group(1).lower(), clean_text(roman.group(2))
    if f"{q}.{letter}" in valid:
        return letter, None, tail
    return None, None, rest


def detect_events(lines: list[Line], valid: set[str]) -> list[Event]:
    mains = {path.split(".", 1)[0] for path in valid}
    events: list[Event] = []
    current_q: str | None = None
    current_part: str | None = None
    for index, line in enumerate(lines):
        text = strip_margin_token(line.text)
        if is_noise(text):
            continue
        main = MAIN_RE.match(text)
        if main and line.xmin <= 76 and main.group(1) in mains:
            q = main.group(1)
            rest = clean_text(main.group(2) or "")
            current_q, current_part = q, None
            letter, roman, head = embedded_part(q, rest, valid)
            if letter:
                current_part = letter
                path = f"{q}.{letter}" + (f".{roman}" if roman else "")
                events.append(Event(path, index, line.page, head))
            elif q in valid:
                events.append(Event(q, index, line.page, rest))
            continue
        part = PART_RE.match(text)
        if part and current_q and line.xmin <= 96:
            letter = part.group(1).lower()
            tail = clean_text(part.group(2))
            current_part = letter
            roman = ROMAN_RE.match(tail)
            if roman and f"{current_q}.{letter}.{roman.group(1).lower()}" in valid:
                events.append(Event(f"{current_q}.{letter}.{roman.group(1).lower()}", index, line.page, clean_text(roman.group(2))))
                continue
            if f"{current_q}.{letter}" in valid:
                events.append(Event(f"{current_q}.{letter}", index, line.page, tail))
                continue
        roman = ROMAN_RE.match(text)
        if roman and current_q and current_part and line.xmin <= 132:
            path = f"{current_q}.{current_part}.{roman.group(1).lower()}"
            if path in valid:
                events.append(Event(path, index, line.page, clean_text(roman.group(2))))
    deduped: list[Event] = []
    for event in events:
        if deduped and event.path == deduped[-1].path and event.index - deduped[-1].index <= 2:
            continue
        deduped.append(event)
    return deduped


def line_value(line: Line, first: bool, head: str) -> str:
    text = head if first else strip_margin_token(line.text)
    if is_noise(text):
        return ""
    text = re.sub(r"\s*\[\s*\d+\s*\]\s*$", "", text).strip()
    return "" if MARK_ONLY_RE.fullmatch(text) or DOTS_RE.fullmatch(text) else text


def source_segment(lines: list[Line], event: Event, end_index: int) -> str:
    values: list[str] = []
    for index in range(event.index, end_index):
        value = line_value(lines[index], index == event.index, event.head)
        if value:
            values.append(value)
    return "\n".join(values).strip()


def lexical_tokens(value: str) -> list[str]:
    value = re.sub(r"[`*_#]", "", value or "")
    value = value.replace("←", "<-").replace("→", "->").replace("≤", "<=").replace("≥", ">=")
    return [token.upper() for token in re.findall(r"[A-Za-z0-9]+|<>|<=|>=|<-|->|[=+*/<>¬∧∨⊕]", value)]


def is_contiguous_subsequence(needle: list[str], haystack: list[str]) -> bool:
    if not needle or len(needle) > len(haystack):
        return False
    size = len(needle)
    return any(haystack[index:index + size] == needle for index in range(len(haystack) - size + 1))


def source_matches_stem(stem: str, segment: str) -> bool:
    needle = lexical_tokens(stem)
    haystack = lexical_tokens(segment)
    if len(needle) >= 3:
        return is_contiguous_subsequence(needle, haystack)
    compact_stem = re.sub(r"\s+", "", clean_text(stem)).upper()
    compact_source = re.sub(r"\s+", "", clean_text(segment)).upper()
    return bool(compact_stem) and compact_stem in compact_source


def parse_markdown_table(value: str) -> tuple[list[str], list[list[str | None]], list[list[int]]] | None:
    lines = [line.strip() for line in (value or "").splitlines() if line.strip()]
    if len(lines) < 2 or "|" not in lines[0]:
        return None
    def cells(line: str) -> list[str]:
        return [cell.strip() for cell in line.strip().strip("|").split("|")]
    header = cells(lines[0])
    separator = cells(lines[1])
    if len(separator) != len(header) or not all(re.fullmatch(r":?-{3,}:?", item.replace(" ", "")) for item in separator):
        return None
    rows = [cells(line) for line in lines[2:] if "|" in line]
    if not rows or any(len(row) != len(header) for row in rows):
        return None
    editable: list[list[int]] = []
    normalized: list[list[str | None]] = []
    for row_index, row in enumerate(rows):
        out: list[str | None] = []
        for column_index, cell in enumerate(row):
            blank = cell == "" or bool(re.fullmatch(r"[_\.\s]{2,}", cell))
            out.append(None if blank else cell)
            if blank:
                editable.append([row_index, column_index])
        normalized.append(out)
    return header, normalized, editable


def asset_kind(asset: dict[str, Any], stem: str) -> str:
    text = f"{asset.get('altText') or ''} {stem}".lower()
    if "logic circuit" in text or "logic gate" in text:
        return "logic_circuit"
    if "flowchart" in text:
        return "flowchart"
    if str(asset.get("kind")) == "image":
        return "image"
    return "diagram"


def build_blocks(leaf: dict[str, Any], source_page: int) -> tuple[list[dict[str, Any]] | None, str | None]:
    stem = clean_text(str(leaf.get("stemMd") or ""))
    if not stem:
        return None, "empty_stem"
    blocks: list[dict[str, Any]] = [{"type":"text","style":"paragraph","text":stem,"source":{"page":source_page}}]
    for asset in sorted(list(leaf.get("assets") or []), key=lambda item: (int(item.get("sortOrder") or 0), str(item.get("id") or ""))):
        page = asset.get("sourcePage")
        if not isinstance(page, int) or page < 1:
            return None, "asset_source_page_missing"
        kind = str(asset.get("kind") or "")
        content = str(asset.get("contentMd") or "")
        if kind == "table":
            parsed = parse_markdown_table(content)
            if not parsed:
                return None, "table_not_semantic"
            headers, rows, editable = parsed
            lower = f"{stem} {asset.get('altText') or ''}".lower()
            table_kind = "truth_table" if "truth table" in lower else "tick_grid" if "tick" in lower else "selection_grid" if "select" in lower and "row" in lower else "table"
            blocks.append({"type":"table","kind":table_kind,"headers":headers,"rows":rows,"editableCells":editable,"source":{"page":page}})
        elif kind == "pseudocode":
            if not content.strip():
                return None, "pseudocode_content_missing"
            blocks.append({"type":"code","language":"pseudocode","text":content.strip(),"source":{"page":page}})
        elif kind in {"diagram","image"}:
            asset_id = str(asset.get("id") or "")
            if not re.fullmatch(r"[0-9a-fA-F-]{36}", asset_id):
                return None, "asset_id_invalid"
            blocks.append({"type":"asset","kind":asset_kind(asset,stem),"assetId":asset_id,"altText":str(asset.get("altText") or "Original Cambridge source visual"),"source":{"page":page}})
        else:
            return None, "unsupported_asset_kind"
    return blocks, None


def aliases_for(source: dict[str, Any]) -> dict[str, str]:
    # Audit-proven historical 9618 exception: the database leaf is 6.a while
    # the printed 2023 M/J 11 paper labels the same 3-mark item simply Q6.
    if str(source.get("syllabusCode")) == "9618" and int(source.get("year") or 0) == 2023 and str(source.get("series")) == "MJ" and int(source.get("component") or 0) == 1 and int(source.get("variant") or 0) == 1:
        return {"6.a": "6"}
    return {}


def source_key(source: dict[str, Any]) -> str:
    return f"{source['syllabusCode']}-{source['year']}-{source['series']}-{source['component']}{source['variant']}"


def plan_source(source: dict[str, Any], pdf: Path, work: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    leaves = list(source.get("leaves") or [])
    aliases = aliases_for(source)
    printed_paths = [aliases.get(str(leaf["path"]), str(leaf["path"])) for leaf in leaves]
    valid = prefixes(printed_paths)
    lines = parse_bbox(pdf, work)
    events = detect_events(lines, valid)
    by_path: dict[str, list[Event]] = {}
    for event in events:
        by_path.setdefault(event.path, []).append(event)
    sorted_events = sorted(events, key=lambda item: item.index)
    rows: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []

    for leaf in leaves:
        question_id = str(leaf.get("questionId"))
        path = str(leaf.get("path"))
        if leaf.get("contentVersion") == 1:
            skipped.append({"questionId":question_id,"path":path,"reason":"already_structured"})
            continue
        if leaf.get("hasOpenFidelityFinding"):
            skipped.append({"questionId":question_id,"path":path,"reason":"open_fidelity_finding"})
            continue
        printed = aliases.get(path, path)
        candidates = by_path.get(printed) or []
        if len(candidates) != 1:
            skipped.append({"questionId":question_id,"path":path,"reason":"source_event_missing" if not candidates else "source_event_ambiguous","eventCount":len(candidates)})
            continue
        event = candidates[0]
        next_index = next((candidate.index for candidate in sorted_events if candidate.index > event.index), len(lines))
        segment = source_segment(lines, event, next_index)
        stem = str(leaf.get("stemMd") or "")
        if not source_matches_stem(stem, segment):
            skipped.append({"questionId":question_id,"path":path,"reason":"source_stem_mismatch","sourcePage":event.page})
            continue
        blocks, error = build_blocks(leaf, event.page)
        if error or not blocks:
            skipped.append({"questionId":question_id,"path":path,"reason":error or "blocks_empty","sourcePage":event.page})
            continue
        content = {
            "version": 1,
            "source": {"paperId":str(source["sourcePaperId"]),"sha256":str(source["sourceSha256"]).lower()},
            "blocks": blocks,
        }
        rows.append({
            "questionId": question_id,
            "sourcePage": event.page,
            "content": content,
            "evidence": {
                "eventPath": printed,
                "sourceMatch": "contiguous_lexical_tokens",
                "sourceSegmentSha256": hashlib.sha256(segment.encode()).hexdigest(),
                "assetCount": len(list(leaf.get("assets") or [])),
            },
        })
    return rows, skipped


def write_report(value: dict[str, Any]) -> None:
    REPORT_PATH.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    apply = os.getenv("STRUCTURED_CONTENT_APPLY", "").strip().upper() == "YES"
    only = os.getenv("STRUCTURED_CONTENT_ONLY", "").strip()
    syllabi = [only] if only in {"0478","9618"} else ["0478","9618"]
    bootstraps = [runner("structured_content_bootstrap", {"syllabus":syllabus}, timeout=180)["data"] for syllabus in syllabi]
    sources = [source for bootstrap in bootstraps for source in list(bootstrap.get("sources") or [])]
    if only and only not in {"0478","9618"}:
        sources = [source for source in sources if only in {str(source.get("sourcePaperId")),source_key(source)}]
        if not sources:
            raise RuntimeError("structured_content_only_not_found")

    plan_rows: list[dict[str, Any]] = []
    source_manifests: list[tuple[str, dict[str, Any]]] = []
    failures: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    verified_papers = 0
    source_ready_leaves = sum(len(list(source.get("leaves") or [])) for source in sources)

    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        for index, source in enumerate(sources, start=1):
            key = source_key(source)
            try:
                pdf = root / f"{key}.pdf"
                download(str(source["sourceUrl"]), pdf)
                actual_sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
                expected_sha = str(source["sourceSha256"]).lower()
                if actual_sha != expected_sha:
                    raise RuntimeError(f"source_sha_mismatch:{actual_sha}:{expected_sha}")
                work = root / ("work-" + str(source["sourcePaperId"]))
                work.mkdir(parents=True, exist_ok=True)
                rows, paper_skips = plan_source(source, pdf, work)
                verified_papers += 1
                skipped.extend({"paper":key,**item} for item in paper_skips)
                plan_rows.extend({"paper":key,"questionId":row["questionId"],"sourcePage":row["sourcePage"]} for row in rows)
                if rows:
                    source_manifests.append((key,{
                        "version":"structured-content-backfill-v1",
                        "parserVersion":PARSER_VERSION,
                        "sourcePaperId":source["sourcePaperId"],
                        "sourceSha256":expected_sha,
                        "rows":rows,
                    }))
                print(json.dumps({"event":"paper_planned","index":index,"total":len(sources),"paper":key,"leaves":len(source.get("leaves") or []),"writable":len(rows),"skipped":len(paper_skips)},separators=(",",":")))
            except Exception as exc:
                failures.append({"paper":key,"sourcePaperId":source.get("sourcePaperId"),"error":str(exc)[:3000]})
                print(json.dumps({"event":"paper_failed","paper":key,"error":str(exc)[:1000]},ensure_ascii=False,separators=(",",":")))

    reason_counts: dict[str,int] = {}
    for item in skipped:
        reason = str(item.get("reason") or "unknown")
        reason_counts[reason] = reason_counts.get(reason,0) + 1
    summary: dict[str,Any] = {
        "version":"structured-content-backfill-v1",
        "mode":"apply" if apply else "plan",
        "selectedPapers":len(sources),
        "verifiedPapers":verified_papers,
        "failedPapers":len(failures),
        "sourceReadyLeaves":source_ready_leaves,
        "writableLeaves":len(plan_rows),
        "skippedLeaves":len(skipped),
        "skipReasons":reason_counts,
        "failures":failures,
        "skipped":skipped,
    }
    if failures:
        summary["databaseWritesAttempted"] = False
        write_report(summary)
        print(json.dumps({key:value for key,value in summary.items() if key not in {"skipped","failures"}},separators=(",",":")))
        return 1
    if not apply:
        summary["databaseWritesAttempted"] = False
        write_report(summary)
        print(json.dumps({key:value for key,value in summary.items() if key not in {"skipped","failures"}},separators=(",",":")))
        return 0

    applied = 0
    existing = 0
    apply_failures: list[dict[str,Any]] = []
    for index,(key,manifest) in enumerate(source_manifests,start=1):
        try:
            result = runner("structured_content_apply", {"manifest":manifest}, timeout=300)["result"]
            applied += int(result.get("applied") or 0)
            existing += int(result.get("existing") or 0)
            print(json.dumps({"event":"apply_ok","index":index,"total":len(source_manifests),"paper":key,"applied":result.get("applied"),"existing":result.get("existing")},separators=(",",":")))
        except Exception as exc:
            apply_failures.append({"paper":key,"error":str(exc)[:3000]})
            print(json.dumps({"event":"apply_failed","paper":key,"error":str(exc)[:1000]},ensure_ascii=False,separators=(",",":")))
    summary.update({"databaseWritesAttempted":True,"appliedLeaves":applied,"existingLeaves":existing,"applyFailures":apply_failures})
    write_report(summary)
    print(json.dumps({key:value for key,value in summary.items() if key not in {"skipped","failures","applyFailures"}},separators=(",",":")))
    return 1 if apply_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
