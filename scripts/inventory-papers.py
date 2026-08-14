#!/usr/bin/env python3
"""Build a read-only Cambridge past-paper coverage inventory from a local folder.

The script never modifies source files. It recursively scans a directory such as
`papers/`, parses canonical Cambridge filenames, and prints normalized JSON plus
coverage and duplicate diagnostics.

Examples:
    python3 scripts/inventory-papers.py papers
    python3 scripts/inventory-papers.py papers --syllabus 9618 --year-from 2021 --year-to 2025
    python3 scripts/inventory-papers.py papers --json-out /tmp/paper-inventory.json

Canonical examples:
    9618_s25_qp_11.pdf
    9618_w24_ms_22.pdf
    9618_s25_in_23.pdf
    9618_s25_sf_41.zip
    9618_s25_gt.pdf

Files such as `9618_s24_sf_41 (1).zip` are detected as copy-suffix
candidates, not silently accepted as canonical. Merged convenience files are
reported as unparsed/non-canonical.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

SERIES_MAP = {"s": "MJ", "w": "ON", "m": "FM"}
KIND_MAP = {"qp": "QP", "ms": "MS", "in": "IN", "sf": "SF", "gt": "GT"}

CANONICAL_RE = re.compile(
    r"^(?P<syllabus>\d{4})_(?P<series>[swm])(?P<yy>\d{2})_"
    r"(?P<kind>qp|ms|in|sf)_(?P<paper>\d{2})"
    r"(?:\.(?P<ext>pdf|zip|docx))?$",
    re.IGNORECASE,
)
GT_RE = re.compile(
    r"^(?P<syllabus>\d{4})_(?P<series>[swm])(?P<yy>\d{2})_gt(?:\.pdf)?$",
    re.IGNORECASE,
)
COPY_SUFFIX_RE = re.compile(r"^(?P<base>.+?) \((?P<copy>\d+)\)(?P<ext>\.[^.]+)$")


@dataclass(frozen=True)
class InventoryRow:
    syllabus: str
    year: int
    series: str
    component: int | None
    variant: int | None
    kind: str
    path: str
    file_name: str

    @property
    def paper_key(self) -> str | None:
        if self.component is None or self.variant is None:
            return None
        return f"{self.syllabus}:{self.year}:{self.series}:P{self.component}:V{self.variant}"

    @property
    def source_key(self) -> str | None:
        if self.paper_key is None:
            return None
        return f"{self.paper_key}:{self.kind}"


def parse_filename(path: Path) -> InventoryRow | None:
    name = path.name

    gt = GT_RE.match(name)
    if gt:
        return InventoryRow(
            syllabus=gt.group("syllabus"),
            year=2000 + int(gt.group("yy")),
            series=SERIES_MAP[gt.group("series").lower()],
            component=None,
            variant=None,
            kind="GT",
            path=str(path),
            file_name=name,
        )

    match = CANONICAL_RE.match(name)
    if not match:
        return None

    paper_number = int(match.group("paper"))
    component = paper_number // 10
    variant = paper_number % 10
    if component not in {1, 2, 3, 4} or variant not in {1, 2, 3}:
        return None

    return InventoryRow(
        syllabus=match.group("syllabus"),
        year=2000 + int(match.group("yy")),
        series=SERIES_MAP[match.group("series").lower()],
        component=component,
        variant=variant,
        kind=KIND_MAP[match.group("kind").lower()],
        path=str(path),
        file_name=name,
    )


def parse_copy_suffix(path: Path) -> tuple[InventoryRow, int] | None:
    match = COPY_SUFFIX_RE.match(path.name)
    if not match:
        return None
    normalized_name = f"{match.group('base')}{match.group('ext')}"
    normalized_path = path.with_name(normalized_name)
    row = parse_filename(normalized_path)
    if row is None:
        return None
    return row, int(match.group("copy"))


def walk_files(root: Path) -> Iterable[Path]:
    for current_root, _, files in os.walk(root):
        for file_name in files:
            yield Path(current_root) / file_name


def keep(row: InventoryRow, args: argparse.Namespace) -> bool:
    if args.syllabus and row.syllabus != args.syllabus:
        return False
    if args.year_from and row.year < args.year_from:
        return False
    if args.year_to and row.year > args.year_to:
        return False
    return True


def coverage(rows: list[InventoryRow]) -> list[dict]:
    groups: dict[str, dict] = {}
    for row in rows:
        if row.paper_key is None:
            continue
        group = groups.setdefault(
            row.paper_key,
            {
                "paper_key": row.paper_key,
                "syllabus": row.syllabus,
                "year": row.year,
                "series": row.series,
                "component": row.component,
                "variant": row.variant,
                "kind_counts": Counter(),
                "files": [],
            },
        )
        group["kind_counts"][row.kind] += 1
        group["files"].append(row.path)

    result = []
    for group in groups.values():
        kind_counts = dict(sorted(group.pop("kind_counts").items()))
        kinds = sorted(kind_counts)
        duplicate_kinds = sorted(kind for kind, count in kind_counts.items() if count > 1)
        group.update(
            {
                "kinds": kinds,
                "kind_counts": kind_counts,
                "qp_present": "QP" in kinds,
                "ms_present": "MS" in kinds,
                "canonical_duplicate_kinds": duplicate_kinds,
                "has_canonical_duplicates": bool(duplicate_kinds),
            }
        )
        group["canonical_pair_complete"] = group["qp_present"] and group["ms_present"]
        result.append(group)

    return sorted(
        result,
        key=lambda item: (
            item["syllabus"],
            item["year"],
            item["series"],
            item["component"],
            item["variant"],
        ),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Inventory Cambridge past-paper files")
    parser.add_argument("root", help="Root directory containing downloaded papers")
    parser.add_argument("--syllabus", help="Filter syllabus, e.g. 9618")
    parser.add_argument("--year-from", type=int)
    parser.add_argument("--year-to", type=int)
    parser.add_argument("--json-out", help="Optional path for full JSON report")
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Not a directory: {root}")

    parsed: list[InventoryRow] = []
    copy_suffix_candidates: list[dict] = []
    unparsed: list[str] = []

    for path in walk_files(root):
        row = parse_filename(path)
        if row is not None:
            if keep(row, args):
                parsed.append(row)
            continue

        copy_candidate = parse_copy_suffix(path)
        if copy_candidate is not None:
            normalized, copy_number = copy_candidate
            if keep(normalized, args):
                copy_suffix_candidates.append(
                    {
                        "path": str(path),
                        "file_name": path.name,
                        "copy_number": copy_number,
                        "normalized_file_name": normalized.file_name,
                        "paper_key": normalized.paper_key,
                        "source_key": normalized.source_key,
                        "kind": normalized.kind,
                    }
                )
            continue

        if path.suffix.lower() in {".pdf", ".zip", ".docx"}:
            unparsed.append(str(path))

    coverage_rows = coverage(parsed)
    report = {
        "root": str(root),
        "filters": {
            "syllabus": args.syllabus,
            "year_from": args.year_from,
            "year_to": args.year_to,
        },
        "rows": [
            asdict(row) | {"paper_key": row.paper_key, "source_key": row.source_key}
            for row in parsed
        ],
        "coverage": coverage_rows,
        "copy_suffix_candidates": sorted(copy_suffix_candidates, key=lambda item: item["path"]),
        "unparsed_source_files": sorted(unparsed),
    }

    complete = sum(1 for item in coverage_rows if item["canonical_pair_complete"])
    incomplete = len(coverage_rows) - complete
    canonical_duplicate_papers = sum(1 for item in coverage_rows if item["has_canonical_duplicates"])

    print(
        f"parsed={len(parsed)} papers={len(coverage_rows)} "
        f"complete_qp_ms_pairs={complete} incomplete_pairs={incomplete} "
        f"canonical_duplicate_papers={canonical_duplicate_papers} "
        f"copy_suffix_candidates={len(copy_suffix_candidates)} unparsed={len(unparsed)}"
    )

    for item in coverage_rows:
        if item["has_canonical_duplicates"]:
            state = "DUPLICATE"
        else:
            state = "COMPLETE" if item["canonical_pair_complete"] else "MISSING_PAIR"
        kinds = ",".join(item["kinds"])
        print(f"{state:12} {item['paper_key']} [{kinds}]")

    if copy_suffix_candidates:
        print("\nCopy-suffix candidates (not canonical):")
        for item in report["copy_suffix_candidates"]:
            print(f"  {item['file_name']} -> {item['normalized_file_name']}")

    if unparsed:
        print("\nUnparsed/merged/non-canonical source files:")
        for path in sorted(unparsed):
            print(f"  {path}")

    if args.json_out:
        destination = Path(args.json_out).expanduser()
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"\nJSON report written to {destination}")


if __name__ == "__main__":
    main()
