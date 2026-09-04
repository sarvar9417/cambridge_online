#!/usr/bin/env python3
from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import subprocess
import tempfile
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image

AUDIENCE = "cambridge-corpus"
DPI = 200
PT_TO_PX = DPI / 72.0

TABLE_PATTERNS = [
    re.compile(r"complete\s+(?:(?:the|this|following)\s+)?(?:truth\s+)?table", re.I),
    re.compile(r"fill\s+in\s+(?:(?:the|this|following)\s+)?(?:truth\s+)?table", re.I),
    re.compile(r"tick.{0,220}each\s+row|each\s+row.{0,220}tick", re.I),
    re.compile(r"select\s+(?:one\s+)?(?:box|column).{0,180}each\s+row", re.I),
]
LAYOUT_PATTERNS = [
    re.compile(r"match\s+each", re.I),
    re.compile(r"draw\s+(?:a\s+)?line.{0,180}match", re.I),
    re.compile(r"draw\s+lines?.{0,180}match", re.I),
    re.compile(r"join\s+each.{0,180}(?:correct|matching)", re.I),
]
VISUAL_PATTERNS = [
    re.compile(pattern, re.I) for pattern in [
        r"following (?:logic )?circuit", r"logic circuit (?:is )?shown", r"circuit shown (?:below|above)",
        r"following diagram", r"diagram (?:is )?shown", r"diagram shown (?:below|above)",
        r"shown in (?:the )?(?:diagram|figure)", r"figure\s+[0-9]+(?:\.[0-9]+)?\s+(?:shows|is shown)",
        r"following flowchart", r"flowchart (?:is )?shown", r"flowchart shown (?:below|above)",
        r"following graph", r"graph (?:is )?shown", r"graph shown (?:below|above)",
        r"following (?:bitmap )?image", r"image (?:is )?shown", r"image shown (?:below|above)",
        r"complete (?:the )?(?:following )?(?:diagram|flowchart|logic circuit)",
        r"complete (?:the )?(?:e-r|entity[- ]relationship) diagram",
        r"consider the logic circuit",
    ]
]

MARGIN_RE = re.compile(r"DO\s+NOT\s+WRITE\s+IN\s+THIS\s+MARGIN", re.I)
DOTS_RE = re.compile(r"^(?:\d+\s+)?\.{8,}(?:\s*\[\d+\])?$")
MARK_ONLY_RE = re.compile(r"^\[\d+\]$")
FOOTER_RES = [
    re.compile(r"^©\s*(?:UCLES|Cambridge)", re.I),
    re.compile(r"^\d{4}/\d{2}/(?:F/M|M/J|O/N)/\d{2}$", re.I),
    re.compile(r"^\[Turn over", re.I),
    re.compile(r"^Trace ID:", re.I),
    re.compile(r"Re-uploading, mirroring|Licensed for hosting|papacambridge|Downloaded from", re.I),
]
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
PART_RE = re.compile(r"^\(([a-z])\)\s*(.*)$", re.I)
ROMAN_RE = re.compile(r"^\(((?:i|ii|iii|iv|v|vi|vii|viii|ix|x))\)\s*(.*)$", re.I)
MAIN_RE = re.compile(r"^(\d{1,2})(?:\s+(.*))?$")


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


def runner(action: str, payload: dict | None = None, timeout: int = 300) -> dict:
    req = urllib.request.Request(
        os.environ["CORPUS_RUNNER_URL"],
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
    req = urllib.request.Request(direct, headers={"User-Agent": "CamPathSourceStructureRepair/2.0"})
    with urllib.request.urlopen(req, timeout=90) as response, path.open("wb") as handle:
        while chunk := response.read(1024 * 1024):
            handle.write(chunk)
    if path.stat().st_size < 1000:
        raise RuntimeError("download_too_small")


def clean_text(value: str) -> str:
    return " ".join(CONTROL_RE.sub("", value).replace("\u00a0", " ").split())


def is_noise(text: str) -> bool:
    value = clean_text(text)
    if not value or MARGIN_RE.search(value) or MARK_ONLY_RE.fullmatch(value) or DOTS_RE.fullmatch(value):
        return True
    if value == "DFD" or re.fullmatch(r"\*\s*\d+\s*\*", value):
        return True
    if any(pattern.search(value) for pattern in FOOTER_RES):
        return True
    if len(value) <= 30 and any(ord(char) < 32 for char in text):
        return True
    return False


def parse_bbox(pdf: Path, work: Path) -> tuple[list[Line], dict[int, tuple[float, float]]]:
    html = work / (pdf.stem + ".bbox.html")
    subprocess.run(["pdftotext", "-bbox-layout", str(pdf), str(html)], check=True, timeout=90)
    root = ET.parse(html).getroot()
    pages = [node for node in root.iter() if node.tag.endswith("page")]
    all_lines: list[Line] = []
    page_sizes: dict[int, tuple[float, float]] = {}
    for page_number, page in enumerate(pages, start=1):
        width = float(page.attrib.get("width", "595"))
        height = float(page.attrib.get("height", "842"))
        page_sizes[page_number] = (width, height)
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
            text = clean_text(" ".join(item.text for item in group))
            if not text:
                continue
            all_lines.append(Line(
                page_number,
                min(item.ymin for item in group),
                max(item.ymax for item in group),
                min(item.xmin for item in group),
                max(item.xmax for item in group),
                text,
            ))
    return all_lines, page_sizes


def prefixes(paths: Iterable[str]) -> set[str]:
    result: set[str] = set()
    for path in paths:
        parts = str(path).split(".")
        for index in range(1, len(parts) + 1):
            result.add(".".join(parts[:index]))
    return result


def detect_events(lines: list[Line], valid_paths: set[str]) -> list[Event]:
    mains = {path.split(".", 1)[0] for path in valid_paths}
    events: list[Event] = []
    current_q: str | None = None
    current_part: str | None = None

    for index, line in enumerate(lines):
        text = clean_text(line.text)
        if is_noise(text):
            continue
        main = MAIN_RE.match(text)
        if main and line.xmin <= 72 and main.group(1) in mains:
            q = main.group(1)
            rest = clean_text(main.group(2) or "")
            current_q, current_part = q, None
            part = PART_RE.match(rest)
            if part and f"{q}.{part.group(1).lower()}" in valid_paths:
                current_part = part.group(1).lower()
                events.append(Event(f"{q}.{current_part}", index, line.page, clean_text(part.group(2))))
            elif q in valid_paths:
                events.append(Event(q, index, line.page, rest))
            continue

        part = PART_RE.match(text)
        if part and current_q and line.xmin <= 92:
            candidate = f"{current_q}.{part.group(1).lower()}"
            if candidate in valid_paths:
                current_part = part.group(1).lower()
                events.append(Event(candidate, index, line.page, clean_text(part.group(2))))
                continue

        roman = ROMAN_RE.match(text)
        if roman and current_q and current_part and line.xmin <= 128:
            candidate = f"{current_q}.{current_part}.{roman.group(1).lower()}"
            if candidate in valid_paths:
                events.append(Event(candidate, index, line.page, clean_text(roman.group(2))))
    return events


def line_for_segment(line: Line, first: bool, head: str) -> str:
    text = head if first else clean_text(line.text)
    if is_noise(text):
        return ""
    text = re.sub(r"\s*\[\d+\]\s*$", "", text).strip()
    if DOTS_RE.fullmatch(text) or MARK_ONLY_RE.fullmatch(text):
        return ""
    return text


def segment_text(lines: list[Line], event: Event, end_index: int, stop_index: int | None = None) -> str:
    values: list[str] = []
    upper = min(end_index, stop_index + 1 if stop_index is not None else end_index)
    for index in range(event.index, upper):
        value = line_for_segment(lines[index], index == event.index, event.head)
        if value:
            values.append(value)
    return "\n".join(values).strip()


def pattern_hit(lines: list[Line], event: Event, end_index: int, patterns: list[re.Pattern[str]]) -> tuple[int, re.Match[str]] | None:
    # Cambridge instructions often wrap over two or three physical lines. Search
    # short rolling windows so the cue location remains tied to a source y-range.
    for start in range(event.index, end_index):
        if is_noise(lines[start].text):
            continue
        joined = ""
        for stop in range(start, min(end_index, start + 5)):
            value = line_for_segment(lines[stop], stop == event.index, event.head)
            if value:
                joined = (joined + " " + value).strip()
            for pattern in patterns:
                match = pattern.search(joined)
                if match:
                    return stop, match
    return None


def rule_patterns(rule: str) -> list[re.Pattern[str]]:
    if rule == "source_structure_required_but_missing_table":
        return TABLE_PATTERNS
    if rule == "source_structure_required_but_missing_layout":
        return LAYOUT_PATTERNS
    if rule == "source_visual_required_but_missing":
        return VISUAL_PATTERNS
    return []


def crop_bounds(lines: list[Line], event: Event, end_index: int, cue_stop: int, page_size: tuple[float, float]) -> tuple[int, int, int, int] | None:
    cue_page = lines[cue_stop].page
    candidates = [line for line in lines[cue_stop + 1:end_index] if line.page == cue_page and not is_noise(line.text)]
    candidates = [line for line in candidates if not MARK_ONLY_RE.fullmatch(clean_text(line.text))]
    if not candidates:
        return None
    first = candidates[0]
    last = candidates[-1]
    width, height = page_size
    x1, x2 = 55.0, min(width - 40.0, 555.0)
    y1 = max(35.0, first.ymin - 7.0)
    y2 = min(height - 45.0, last.ymax + 7.0)
    if y2 - y1 < 18.0:
        return None
    return tuple(round(value * PT_TO_PX) for value in (x1, y1, x2, y2))


def render_crop(pdf: Path, page: int, bbox_px: tuple[int, int, int, int], work: Path, name: str) -> tuple[bytes, str]:
    prefix = work / f"page-{page}-{name}"
    subprocess.run([
        "pdftoppm", "-f", str(page), "-l", str(page), "-singlefile", "-png", "-r", str(DPI),
        str(pdf), str(prefix),
    ], check=True, timeout=120, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    source = Path(str(prefix) + ".png")
    with Image.open(source) as image:
        x1, y1, x2, y2 = bbox_px
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(image.width, x2), min(image.height, y2)
        if x2 - x1 < 100 or y2 - y1 < 45:
            raise RuntimeError("source_crop_too_small")
        crop = image.crop((x1, y1, x2, y2)).convert("L")
        crop_path = work / f"crop-{name}.png"
        crop.save(crop_path, format="PNG", optimize=True, compress_level=9)
    data = crop_path.read_bytes()
    if len(data) > 2_000_000:
        raise RuntimeError(f"source_crop_too_large:{len(data)}")
    return data, hashlib.sha256(data).hexdigest()


def normalize_compare(value: str | None) -> str:
    return re.sub(r"\s+", " ", MARGIN_RE.sub(" ", value or "")).strip()


def build_rows(pdf: Path, source: dict, work: Path) -> tuple[list[dict], list[dict]]:
    lines, page_sizes = parse_bbox(pdf, work)
    leaf_paths = [str(leaf["path"]) for leaf in source.get("leaves") or []]
    valid_paths = prefixes(leaf_paths)
    events = detect_events(lines, valid_paths)
    by_path: dict[str, list[Event]] = {}
    for event in events:
        by_path.setdefault(event.path, []).append(event)
    event_order = sorted(events, key=lambda item: item.index)
    end_by_index = {
        event.index: (event_order[pos + 1].index if pos + 1 < len(event_order) else len(lines))
        for pos, event in enumerate(event_order)
    }

    rows: list[dict] = []
    plan: list[dict] = []
    for target in source.get("targets") or []:
        path = str(target["path"])
        matches = by_path.get(path) or []
        if len(matches) != 1:
            plan.append({"questionId":target["questionId"],"path":path,"status":"skipped","reason":f"event_count:{len(matches)}"})
            continue
        event = matches[0]
        end_index = end_by_index[event.index]
        source_full = segment_text(lines, event, end_index)
        if len(normalize_compare(source_full)) < 5:
            plan.append({"questionId":target["questionId"],"path":path,"status":"skipped","reason":"empty_source_segment"})
            continue

        rules = [str(rule) for rule in target.get("rules") or []]
        true_hits: dict[str, int] = {}
        false_rules: list[str] = []
        for rule in rules:
            hit = pattern_hit(lines, event, end_index, rule_patterns(rule))
            if hit:
                true_hits[rule] = hit[0]
            else:
                false_rules.append(rule)

        row: dict = {
            "questionId": target["questionId"],
            "text": {},
            "assets": [],
            "resolveRules": false_rules,
            "restoreApproval": True,
        }

        if true_hits:
            cue_stop = min(true_hits.values())
            repaired_stem = segment_text(lines, event, end_index, stop_index=cue_stop)
            bbox = crop_bounds(lines, event, end_index, cue_stop, page_sizes[event.page])
            if not bbox:
                plan.append({"questionId":target["questionId"],"path":path,"status":"skipped","reason":"crop_bounds_missing","trueRules":sorted(true_hits)})
                continue
            png, png_hash = render_crop(pdf, event.page, bbox, work, str(target["questionId"])[:8])
            asset_kind = "diagram" if "source_visual_required_but_missing" in true_hits else "image"
            row["assets"].append({
                "kind": asset_kind,
                "pngBase64": base64.b64encode(png).decode(),
                "altText": f"Original Cambridge source layout for {target['displayRef']}",
                "sourcePage": event.page,
                "sourceBbox": list(bbox),
                "contentHash": png_hash,
                "satisfiesRules": sorted(true_hits),
            })
            if repaired_stem:
                row["text"]["stemMd"] = repaired_stem
            plan.append({
                "questionId":target["questionId"],"path":path,"displayRef":target["displayRef"],
                "status":"asset","page":event.page,"bbox":list(bbox),"bytes":len(png),
                "trueRules":sorted(true_hits),"resolvedByText":false_rules,
                "stemChanged":normalize_compare(repaired_stem)!=normalize_compare(target.get("currentStem")),
            })
        else:
            row["text"]["stemMd"] = source_full
            plan.append({
                "questionId":target["questionId"],"path":path,"displayRef":target["displayRef"],
                "status":"text_boundary","resolvedByText":false_rules,
                "stemChanged":normalize_compare(source_full)!=normalize_compare(target.get("currentStem")),
            })

        # A text-only row is meaningful only when it resolves a finding or changes
        # the corrupted source boundary. Asset rows are always meaningful.
        if row["assets"] or row["resolveRules"] or (
            row["text"].get("stemMd") and normalize_compare(row["text"]["stemMd"]) != normalize_compare(target.get("currentStem"))
        ):
            rows.append(row)
    return rows, plan


def source_key(source: dict) -> str:
    return f"{source['syllabusCode']}-{source['year']}-{source['series']}-{source['component']}{source['variant']}"


def main() -> int:
    bootstrap = runner("source_structure_bootstrap_v2", timeout=180)["data"]
    if bootstrap.get("version") != "source-structure-repair-bootstrap-v2":
        raise RuntimeError("bootstrap_version_mismatch")
    sources = list(bootstrap.get("sources") or [])
    only = os.getenv("SOURCE_STRUCTURE_ONLY", "").strip()
    if only:
        sources = [source for source in sources if only in {
            str(source["sourcePaperId"]), source_key(source), str(source["syllabusCode"]),
        }]
        if not sources:
            raise RuntimeError("source_structure_only_not_found")
    plan_only = os.getenv("SOURCE_STRUCTURE_APPLY", "").strip().upper() != "YES"

    plan_rows: list[dict] = []
    applied: list[dict] = []
    failures: list[dict] = []
    integrity_failures: list[dict] = []
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        for source in sources:
            key = source_key(source)
            try:
                pdf = root / f"{key}.pdf"
                download(str(source["sourceUrl"]), pdf)
                actual_sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
                expected_sha = str(source["sourceSha256"]).lower()
                if actual_sha != expected_sha:
                    integrity_failures.append({"paper":key,"error":f"source_sha_mismatch:{actual_sha}:{expected_sha}"})
                    continue
                paper_work = root / ("work-" + str(source["sourcePaperId"]))
                paper_work.mkdir(parents=True, exist_ok=True)
                rows, paper_plan = build_rows(pdf, source, paper_work)
                plan_rows.extend({"paper":key, **item} for item in paper_plan)
                if not plan_only and rows:
                    manifest = {
                        "version":"source-structure-repair-v2",
                        "sourcePaperId":source["sourcePaperId"],
                        "sourceSha256":expected_sha,
                        "rows":rows,
                    }
                    result = runner("source_structure_apply_v2", {"manifest":manifest}, timeout=300)["result"]
                    applied.append({"paper":key,"rows":len(rows),"result":result})
                print(json.dumps({"event":"paper_ok","paper":key,"targets":len(source.get("targets") or []),"planned":len(rows)},ensure_ascii=False,separators=(",",":")))
            except Exception as exc:
                failure={"paper":key,"error":str(exc)[:2000]}
                failures.append(failure)
                print(json.dumps({"event":"paper_failed",**failure},ensure_ascii=False,separators=(",",":")))

    status_counts: dict[str,int] = {}
    for row in plan_rows:
        status_counts[row["status"]] = status_counts.get(row["status"],0)+1
    summary = {
        "version":"source-structure-repair-v2",
        "mode":"plan" if plan_only else "apply",
        "bootstrapQuestions":bootstrap.get("questionCount"),
        "bootstrapPapers":bootstrap.get("paperCount"),
        "selectedPapers":len(sources),
        "statusCounts":status_counts,
        "appliedPapers":len(applied),
        "paperFailures":failures,
        "integrityFailures":integrity_failures,
        "rows":plan_rows,
    }
    Path("source-structure-repair-plan.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf8")
    print(json.dumps({key:value for key,value in summary.items() if key!="rows"},ensure_ascii=False,separators=(",",":")))
    # Source provenance failures are hard failures. Ambiguous target boundaries are
    # intentionally left needs_review rather than risking a guessed repair.
    return 1 if integrity_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
