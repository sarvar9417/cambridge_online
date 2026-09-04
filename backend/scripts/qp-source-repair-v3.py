#!/usr/bin/env python3
"""Source-faithful Cambridge 9618 QP parser v3.

v3 keeps the conservative, manifest-driven contract from qp-source-repair-v2 but
adds three audit-proven hardening rules:
  * internal database paths may map to a different printed path (for example the
    historical 2023 M/J 11 internal path 6.a is printed simply as Q6);
  * legacy PDF layouts may indent printed question numbers by up to four spaces,
    while deeply-indented table/data rows are rejected as question starts;
  * C0 extraction residue and content after the terminal mark token are removed
    before source text is accepted.

The parser is read-only. Database mutation remains behind the guarded repair RPC.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import runpy
from pathlib import Path
from typing import Iterable

BASE = runpy.run_path("backend/scripts/qp-source-repair.py", run_name="qp_source_repair_v2_base")
PARSER_VERSION = "qp-source-repair-v3"
PSEUDOCODE_HEADS = {
    "OUTPUT", "INPUT", "DECLARE", "CALL", "RETURN", "IF", "ELSE", "ENDIF",
    "FOR", "NEXT", "WHILE", "ENDWHILE", "REPEAT", "UNTIL", "CASE", "ENDCASE",
    "PROCEDURE", "ENDPROCEDURE", "FUNCTION", "ENDFUNCTION", "TYPE", "ENDTYPE",
}


def prefix_set(valid: Iterable[str]) -> set[str]:
    return BASE["prefix_set"](valid)


def canonical_ref(*args, **kwargs) -> str:
    return BASE["canonical_ref"](*args, **kwargs)


def _strip_controls(raw: str) -> tuple[str, bool]:
    had_controls = False
    chars: list[str] = []
    for char in raw:
        code = ord(char)
        if code < 32 and char not in ("\t", "\n", "\r"):
            had_controls = True
            continue
        if code == 127:
            had_controls = True
            continue
        chars.append(char)
    return "".join(chars), had_controls


def normalize_line(raw: str) -> str:
    cleaned, had_controls = _strip_controls(raw)
    cleaned = BASE["normalize_line"](cleaned)
    if had_controls and re.fullmatch(r"[\s,;:|/\\.\-0-9]*", cleaned):
        return ""
    return cleaned


def is_noise_line(raw: str, idx_in_page: int | None = None, page_len: int | None = None) -> bool:
    return BASE["is_noise_line"](raw, idx_in_page, page_len)


def preprocess_text(text: str) -> list[str]:
    out: list[str] = []
    for page in text.split("\f"):
        lines = page.splitlines()
        for index, raw in enumerate(lines):
            cleaned = normalize_line(raw)
            out.append("" if is_noise_line(cleaned, index, len(lines)) else cleaned)
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
    if re.match(r"^hours?\b", rest, re.IGNORECASE):
        return None
    if not re.match(r"^(?:\([a-z]\)|[A-Za-z])", rest, re.IGNORECASE):
        return None

    if indent <= 4:
        pass
    elif 24 <= indent <= 36:
        # Deeply-indented legacy question starts exist, but short table/data rows
        # such as "                                4 Wasp" must never become Q4.
        words = rest.split()
        if len(rest) < 18 or len(words) < 4:
            return None
    else:
        return None

    first = re.match(r"[A-Za-z]+", rest)
    if first and first.group(0).upper() in PSEUDOCODE_HEADS and first.group(0).isupper():
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


def _truncate_after_terminal_mark(raw_lines: list[str], expected_mark: int | None) -> list[str]:
    if expected_mark is None:
        return raw_lines
    pattern = re.compile(rf"(?:^|\s)\[\s*{expected_mark}\s*\]\s*(?:\d{{1,2}})?\s*$")
    for index, raw in enumerate(raw_lines):
        cleaned, _ = _strip_controls(raw)
        if pattern.search(cleaned):
            return raw_lines[: index + 1]
    return raw_lines


def clean_segment(raw_lines: list[str], expected_mark: int | None = None) -> str:
    normalized = [normalize_line(raw) for raw in _truncate_after_terminal_mark(raw_lines, expected_mark)]
    return BASE["clean_segment"](normalized, expected_mark)


def parse_text(text: str, expected: dict[str, int]) -> tuple[dict[str, dict[str, object]], list[dict[str, object]]]:
    lines = preprocess_text(text)
    events = detect_events(lines, set(expected))
    nodes: dict[str, str] = {}
    for index, event in enumerate(events):
        end = int(events[index + 1]["line"]) if index + 1 < len(events) else len(lines)
        path = str(event["path"])
        if path in nodes:
            continue
        nodes[path] = clean_segment(
            [str(event["head"]), *lines[int(event["line"]) + 1 : end]],
            expected.get(path),
        )

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
        rows[path] = {
            "path": path,
            "marks": marks,
            "stem": stem,
            "context": "\n\n".join(ancestors).strip() or None,
        }
    return rows, events


def quality_gate(rows: dict[str, dict[str, object]]) -> None:
    BASE["quality_gate"](rows)
    issues: list[str] = []
    for path, row in rows.items():
        text = f"{row.get('context') or ''}\n{row.get('stem') or ''}"
        if any((ord(char) < 32 and char not in ("\t", "\n", "\r")) or ord(char) == 127 for char in text):
            issues.append(f"{path}:control")
    if issues:
        raise ValueError("quality_gate:" + ",".join(issues))


def _printed_manifest(manifest: dict[str, object]) -> tuple[dict[str, int], dict[str, str]]:
    expected = manifest["_expected"]
    assert isinstance(expected, dict)
    aliases = {str(k): str(v) for k, v in dict(manifest.get("aliases", {})).items()}
    printed_expected: dict[str, int] = {}
    for internal_path, marks in expected.items():
        printed_path = aliases.get(str(internal_path), str(internal_path))
        if printed_path in printed_expected:
            raise ValueError(f"duplicate_printed_path:{printed_path}")
        printed_expected[printed_path] = int(marks)
    return printed_expected, aliases


def build_repair(pdf_path: Path, manifest: dict[str, object], pdftotext: str = "pdftotext") -> dict[str, object]:
    expected = manifest["_expected"]
    assert isinstance(expected, dict)
    printed_expected, aliases = _printed_manifest(manifest)
    text = BASE["pdftotext_layout"](pdf_path, pdftotext)
    printed_rows, events = parse_text(text, printed_expected)

    ordered_rows: list[dict[str, object]] = []
    rows_for_gate: dict[str, dict[str, object]] = {}
    for leaf in manifest["leaves"]:
        internal_path = str(leaf["path"])
        printed_path = aliases.get(internal_path, internal_path)
        source_row = dict(printed_rows[printed_path])
        row = {
            "path": internal_path,
            "marks": int(leaf["marks"]),
            "stem": source_row["stem"],
            "context": source_row["context"],
            "displayRef": canonical_ref(
                str(manifest["syllabusCode"]),
                int(manifest["component"]),
                int(manifest["variant"]),
                str(manifest["series"]),
                int(manifest["year"]),
                internal_path,
                aliases,
            ),
        }
        ordered_rows.append(row)
        rows_for_gate[internal_path] = row

    quality_gate(rows_for_gate)
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


def load_manifest(path: Path) -> dict[str, object]:
    data = BASE["load_manifest"](path)
    aliases = data.get("aliases", {})
    if aliases is not None and not isinstance(aliases, dict):
        raise ValueError("manifest_aliases_not_object")
    return data


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
