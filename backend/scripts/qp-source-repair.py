#!/usr/bin/env python3
"""Source-faithful Cambridge 9618 Question Paper repair parser.

This tool is deliberately conservative. It does not infer marks or paths. Instead
it receives the database's expected leaf path/mark manifest, parses an official QP
PDF with layout-preserving pdftotext, and fails if every expected leaf cannot be
matched exactly.

Output is a deterministic JSON repair manifest containing:
- leaf-only `stem`
- inherited printed `context`
- source-faithful canonical `displayRef`

It never writes to the database.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Iterable

PARSER_VERSION = "qp-source-repair-v2"
PAGE_REF_RE = re.compile(r"9618/\d+/(?:M/J|O/N|F/M)/\d+", re.IGNORECASE)
FOOTER_STARTS = (
    "Permission to reproduce items",
    "To avoid the issue of disclosure",
    "Cambridge Assessment International Education is part of",
    "reasonable effort has been made by the publisher",
    "Assessment International Education Copyright Acknowledgements Booklet",
    "The publisher has made every effort",
    "The publisher will be pleased",
    "publisher will be pleased",
    "at www.cambridgeinternational.org after the live examination series",
    "Cambridge Local Examinations Syndicate (UCLES)",
)
SERIES_LABELS = {"FM": "F/M", "MJ": "M/J", "ON": "O/N"}


def prefix_set(valid: Iterable[str]) -> set[str]:
    out: set[str] = set()
    for path in valid:
        bits = path.split(".")
        for index in range(1, len(bits) + 1):
            out.add(".".join(bits[:index]))
    return out


def path_suffix(path: str) -> str:
    bits = path.split(".")
    return bits[0] + "".join(f"({part})" for part in bits[1:])


def canonical_ref(
    syllabus_code: str,
    component: int,
    variant: int,
    series: str,
    year: int,
    path: str,
    aliases: dict[str, str] | None = None,
) -> str:
    printed_path = (aliases or {}).get(path, path)
    series_label = SERIES_LABELS.get(series, series)
    return (
        f"{syllabus_code}/{component}{variant}/{series_label}/{str(year)[-2:]} "
        f"Q{path_suffix(printed_path)}"
    )


def normalize_line(raw: str) -> str:
    raw = raw.replace("\x0c", "")
    raw = raw.replace("DO NOT WRITE IN THIS MARGIN", " ")
    return raw.rstrip()


def footer_noise(stripped: str) -> bool:
    """Recognise source-page legal/footer prose, including older UCLES wording."""
    lowered = re.sub(r"\s+", " ", stripped).strip().lower()
    signatures = (
        "publisher will be pleased to make amends",
        "make amends at the earliest possible opportunity",
        "after the live examination series",
        "cambridge local examinations syndicate (ucles)",
        "which itself is a department of the university of cambridge",
        "which is a department of the university of cambridge",
        "copyright acknowledgements booklet",
        "permission to reproduce items",
        "reasonable effort has been made by the publisher",
    )
    return any(signature in lowered for signature in signatures)


def is_noise_line(raw: str, idx_in_page: int | None = None, page_len: int | None = None) -> bool:
    stripped = raw.strip()
    if not stripped:
        return True
    if stripped.startswith("© UCLES") or stripped.startswith("© Cambridge"):
        return True
    if PAGE_REF_RE.search(stripped):
        return True
    if stripped in ("[Turn over", "[Turn over]", "BLANK PAGE"):
        return True
    if any(stripped.startswith(prefix) for prefix in FOOTER_STARTS) or footer_noise(stripped):
        return True
    if re.fullmatch(r"\*[\d ]+\*", stripped):
        return True
    if stripped.startswith("Cambridge International AS & A Level"):
        return True
    if (
        re.fullmatch(r"\d{1,2}", stripped)
        and idx_in_page is not None
        and page_len is not None
        and (idx_in_page < 8 or idx_in_page >= page_len - 8)
    ):
        return True

    chars = [char for char in stripped if not char.isspace()]
    if chars:
        ascii_print = sum(32 <= ord(char) < 127 for char in chars) / len(chars)
        alnum = sum(char.isalnum() for char in chars) / len(chars)
        if len(chars) >= 8 and ascii_print < 0.45 and alnum < 0.35:
            return True
    return False


def preprocess_text(text: str) -> list[str]:
    out: list[str] = []
    for page in text.split("\f"):
        lines = page.splitlines()
        for index, raw in enumerate(lines):
            raw = normalize_line(raw)
            out.append("" if is_noise_line(raw, index, len(lines)) else raw)
        out.append("")
    return out


def main_candidate(raw: str, expected_number: int):
    match = re.match(r"^(\s*)(\d{1,2})\s+(.+)$", raw)
    if not match:
        return None
    indent = len(match.group(1))
    number = int(match.group(2))
    rest = match.group(3).strip()
    if number != expected_number:
        return None
    if not (indent <= 1 or 24 <= indent <= 36):
        return None
    if re.match(r"^hours?\b", rest, re.IGNORECASE):
        return None
    if not re.match(r"^(?:\([a-z]\)|[A-Za-z])", rest, re.IGNORECASE):
        return None
    return indent, number, rest


def detect_events(lines: list[str], valid: set[str]) -> list[dict[str, object]]:
    valid_prefixes = prefix_set(valid)
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
        candidate = main_candidate(raw, next_main) if next_main <= max_main else None
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


def dense_font_garbage(text: str) -> bool:
    chars = [char for char in text if not char.isspace()]
    if len(chars) < 8:
        return False
    non_ascii = sum(ord(char) >= 128 for char in chars) / len(chars)
    ascii_alnum = sum(char.isascii() and char.isalnum() for char in chars) / len(chars)
    return non_ascii > 0.35 and ascii_alnum < 0.45


def clean_segment(raw_lines: list[str], expected_mark: int | None = None) -> str:
    cleaned: list[str] = []
    for raw in raw_lines:
        stripped = raw.strip().replace("DO NOT WRITE IN THIS MARGIN", " ").strip()
        if not stripped:
            if cleaned and cleaned[-1] != "":
                cleaned.append("")
            continue
        if any(stripped.startswith(prefix) for prefix in FOOTER_STARTS) or footer_noise(stripped):
            break
        if stripped.startswith("© UCLES") or stripped.startswith("© Cambridge"):
            continue
        if PAGE_REF_RE.search(stripped):
            continue
        if stripped in ("[Turn over", "[Turn over]", "BLANK PAGE"):
            continue
        if re.fullmatch(r"\*[\d ]+\*", stripped):
            continue
        if dense_font_garbage(stripped):
            continue
        without_terminal_mark = re.sub(r"\s*\[\d+\]\s*$", "", stripped).strip()
        if re.fullmatch(r"[\s._…]+", without_terminal_mark) and len(without_terminal_mark) >= 8:
            continue
        stripped = re.sub(r"\.{8,}", " __________ ", stripped)
        stripped = re.sub(r"…{4,}", " __________ ", stripped)
        if not re.search(r"\s{3,}", stripped):
            stripped = re.sub(r"\s+", " ", stripped).strip()
        else:
            stripped = stripped.rstrip()
        if stripped:
            cleaned.append(stripped)

    while cleaned and cleaned[0] == "":
        cleaned.pop(0)
    while cleaned and cleaned[-1] == "":
        cleaned.pop()
    text = "\n".join(cleaned).strip()
    if expected_mark is not None:
        text = re.sub(rf"\s*\[{expected_mark}\]\s*$", "", text).rstrip()
    return re.sub(r"\n{3,}", "\n\n", text)


def pdftotext_layout(pdf_path: Path, executable: str = "pdftotext") -> str:
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as handle:
        output_path = Path(handle.name)
    try:
        subprocess.run([executable, "-layout", str(pdf_path), str(output_path)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return output_path.read_text(encoding="utf-8", errors="ignore")
    finally:
        output_path.unlink(missing_ok=True)


def parse_text(text: str, expected: dict[str, int]) -> tuple[dict[str, dict[str, object]], list[dict[str, object]]]:
    lines = preprocess_text(text)
    events = detect_events(lines, set(expected))
    nodes: dict[str, str] = {}
    for index, event in enumerate(events):
        end = int(events[index + 1]["line"]) if index + 1 < len(events) else len(lines)
        path = str(event["path"])
        if path in nodes:
            continue
        nodes[path] = clean_segment([str(event["head"]), *lines[int(event["line"]) + 1 : end]], expected.get(path))
    missing = sorted(set(expected) - set(nodes))
    if missing:
        raise ValueError(f"missing_paths:{','.join(missing)}")
    rows: dict[str, dict[str, object]] = {}
    for path, marks in expected.items():
        stem = nodes[path]
        if not stem.strip():
            raise ValueError(f"empty_stem:{path}")
        bits = path.split(".")
        ancestors: list[str] = []
        for depth in range(1, len(bits)):
            ancestor = nodes.get(".".join(bits[:depth]))
            if ancestor:
                ancestors.append(ancestor)
        rows[path] = {"path": path, "marks": marks, "stem": stem, "context": "\n\n".join(ancestors).strip() or None}
    return rows, events


def quality_gate(rows: dict[str, dict[str, object]]) -> None:
    issues: list[str] = []
    for path, row in rows.items():
        stem = str(row["stem"])
        context = str(row["context"] or "")
        text = f"{context}\n{stem}"
        if not stem.strip():
            issues.append(f"{path}:empty")
        squashed = re.sub(r"\s+", "", text).upper()
        if "DONOTWRITEINTHISMARGIN" in squashed:
            issues.append(f"{path}:margin")
        if PAGE_REF_RE.search(text):
            issues.append(f"{path}:paper_ref")
        if re.search(r"© UCLES|Copyright Acknowledgements|reasonable effort has been made", text, re.IGNORECASE) or any(footer_noise(line) for line in text.splitlines()):
            issues.append(f"{path}:footer")
        if re.search(rf"\[\s*{row['marks']}\s*\]\s*$", stem):
            issues.append(f"{path}:trailing_mark")
        if any(dense_font_garbage(line) for line in text.splitlines()):
            issues.append(f"{path}:gibberish")
    if issues:
        raise ValueError("quality_gate:" + ",".join(issues))


def load_manifest(path: Path) -> dict[str, object]:
    data = json.loads(path.read_text(encoding="utf-8"))
    required = ("sourcePaperId", "syllabusCode", "component", "variant", "series", "year", "leaves")
    missing = [key for key in required if key not in data]
    if missing:
        raise ValueError("manifest_missing:" + ",".join(missing))
    leaves = data["leaves"]
    if not isinstance(leaves, list) or not leaves:
        raise ValueError("manifest_leaves_empty")
    expected: dict[str, int] = {}
    for leaf in leaves:
        path_value = str(leaf["path"])
        marks = int(leaf["marks"])
        if path_value in expected:
            raise ValueError(f"manifest_duplicate_path:{path_value}")
        expected[path_value] = marks
    if sum(expected.values()) != int(data.get("expectedMarks", 75)):
        raise ValueError("manifest_mark_sum_mismatch")
    data["_expected"] = expected
    return data


def build_repair(pdf_path: Path, manifest: dict[str, object], pdftotext: str = "pdftotext") -> dict[str, object]:
    expected = manifest["_expected"]
    assert isinstance(expected, dict)
    text = pdftotext_layout(pdf_path, pdftotext)
    rows, events = parse_text(text, expected)
    quality_gate(rows)
    aliases = {str(k): str(v) for k, v in dict(manifest.get("aliases", {})).items()}
    ordered_rows: list[dict[str, object]] = []
    for leaf in manifest["leaves"]:
        path = str(leaf["path"])
        row = dict(rows[path])
        row["displayRef"] = canonical_ref(str(manifest["syllabusCode"]), int(manifest["component"]), int(manifest["variant"]), str(manifest["series"]), int(manifest["year"]), path, aliases)
        ordered_rows.append(row)
    return {
        "parserVersion": PARSER_VERSION,
        "sourcePaperId": manifest["sourcePaperId"],
        "sourceFile": pdf_path.name,
        "sourceSha256": hashlib.sha256(pdf_path.read_bytes()).hexdigest(),
        "syllabusCode": manifest["syllabusCode"],
        "component": int(manifest["component"]),
        "variant": int(manifest["variant"]),
        "series": manifest["series"],
        "year": int(manifest["year"]),
        "leaves": len(ordered_rows),
        "marks": sum(int(row["marks"]) for row in ordered_rows),
        "eventCount": len(events),
        "rows": ordered_rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--pdftotext", default="pdftotext")
    args = parser.parse_args()
    manifest = load_manifest(args.manifest)
    result = build_repair(args.pdf, manifest, args.pdftotext)
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
