#!/usr/bin/env python3
"""Build a read-only Cambridge past-paper coverage inventory from a local folder.

The script never modifies source files. It recursively scans a directory such as
`papers/`, parses canonical Cambridge filenames, and prints both normalized JSON
and a coverage summary.

Examples:
    python3 scripts/inventory-papers.py papers
    python3 scripts/inventory-papers.py papers --syllabus 9618 --year-from 2021 --year-to 2025
    python3 scripts/inventory-papers.py papers --json-out /tmp/paper-inventory.json

Supported canonical names include:
    9618_s25_qp_11.pdf
    9618_w24_ms_22.pdf
    9618_m25_qp_31.pdf
    9618_s25_in_23.pdf
    9618_s25_sf_41.zip
    9618_s25_gt.pdf

Non-canonical/merged convenience files are reported separately and are never
silently treated as canonical source papers.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

SERIES_MAP = {
    "s": "MJ",  # May/June
    "w": "ON",  # Oct/Nov
    "m": "FM",  # Feb/March
}

KIND_MAP = {
    "qp": "QP",
    "ms": "MS",
    "in": "IN",
    "sf": "SF",
    "gt": "GT",
}

CANONICAL_RE = re.compile(
    r"^(?P<syllabus>\d{4})_(?P<series>[swm])(?P<yy>\d{2})_"
    r"(?P<kind>qp|ms|in|sf)(?:_(?P<paper>\d{2}))?"
    r"(?:\.(?P<ext>pdf|zip|docx))?$",
    re.IGNORECASE,
)
GT_RE = re.compile(
    r"^(?P<syllabus>\d{4})_(?P<series>[swm])(?P<yy>\d{2})_gt(?:\.pdf)?$",
    re.IGNORECASE,
)


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


def parse_filename(path: Path) -> InventoryRow | None:
    name = path.name
    stem = name

    gt = GT_RE.match(stem)
    if gt:
        yy = int(gt.group("yy"))
        return InventoryRow(
            syllabus=gt.group("syllabus"),
            year=2000 + yy,
            series=SERIES_MAP[gt.group("series").lower()],
            component=None,
            variant=None,
            kind="GT",
            path=str(path),
            file_name=name,
        )

    match = CANONICAL_RE.match(stem)
    if not match:
        return None

    paper = match.group("paper")
    if paper is None:
        return None

    paper_number = int(paper)
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
                "kinds": set(),
                "files": [],
            },
        )
        group["kinds"].add(row.kind)
        group["files"].append(row.path)

    result = []
    for group in groups.values():
        kinds = sorted(group.pop("kinds"))
        group["kinds"] = kinds
        group["qp_present"] = "QP" in kinds
        group["ms_present"] = "MS" in kinds
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
    unparsed: list[str] = []
    for path in walk_files(root):
        row = parse_filename(path)
        if row is None:
            if path.suffix.lower() in {".pdf", ".zip", ".docx"}:
                unparsed.append(str(path))
            continue
        if keep(row, args):
            parsed.append(row)

    report = {
        "root": str(root),
        "filters": {
            "syllabus": args.syllabus,
            "year_from": args.year_from,
            "year_to": args.year_to,
        },
        "rows": [asdict(row) | {"paper_key": row.paper_key} for row in parsed],
        "coverage": coverage(parsed),
        "unparsed_source_files": sorted(unparsed),
    }

    complete = sum(1 for item in report["coverage"] if item["canonical_pair_complete"])
    incomplete = len(report["coverage"]) - complete

    print(
        f"parsed={len(parsed)} papers={len(report['coverage'])} "
        f"complete_qp_ms_pairs={complete} incomplete_pairs={incomplete} "
        f"unparsed={len(unparsed)}"
    )

    for item in report["coverage"]:
        state = "COMPLETE" if item["canonical_pair_complete"] else "MISSING_PAIR"
        kinds = ",".join(item["kinds"])
        print(f"{state:12} {item['paper_key']} [{kinds}]")

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
