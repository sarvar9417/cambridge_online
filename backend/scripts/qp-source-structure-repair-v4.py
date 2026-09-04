#!/usr/bin/env python3
"""Broad, two-phase Cambridge source-fidelity repair runner v4.

v4 keeps v3's source SHA gate, XML-safe bbox parser, nested part detection and
textless/preceding visual recovery. It broadens the source cue vocabulary to the
wording used across historical 0478/9618 papers and normalises repaired context
ownership so shared tables/diagrams live on parent nodes instead of being
flattened repeatedly into leaf context.

The production broad-fidelity migration deliberately runs before this planner;
every run therefore re-reads the live repair bootstrap instead of trusting an
older artifact or hard-coded corpus count.
"""
from __future__ import annotations

import re
import runpy

V3 = runpy.run_path(
    "backend/scripts/qp-source-structure-repair-v3.py",
    run_name="source_structure_repair_v3_lib",
)
BASE = V3["BASE"]

BROAD_TABLE_PATTERNS = [
    re.compile(r"complete.{0,100}(?:truth\s+|trace\s+|identifier\s+)?table", re.I),
    re.compile(r"fill\s+in.{0,100}(?:truth\s+|trace\s+|identifier\s+)?table", re.I),
    re.compile(r"tick.{0,220}(?:row|column|box|table)", re.I),
    re.compile(r"table.{0,220}tick", re.I),
    re.compile(r"select\s+(?:one\s+)?(?:box|column).{0,180}each\s+row", re.I),
    re.compile(r"(?:following|given|provided)\s+(?:truth\s+|trace\s+|identifier\s+)?table", re.I),
    re.compile(r"(?:truth|trace|identifier)\s+table", re.I),
    re.compile(r"table\s+(?:below|above|provided|given|shows|showing|contains|lists|represents)", re.I),
    re.compile(r"(?:answers?|results?).{0,160}table\s+provided", re.I),
    re.compile(r"(?:karnaugh\s+map|k-?map)", re.I),
]

BROAD_LAYOUT_PATTERNS = [
    re.compile(r"match\s+each", re.I),
    re.compile(r"draw\s+(?:a\s+)?line.{0,200}(?:match|connect)", re.I),
    re.compile(r"draw\s+lines?.{0,200}(?:match|connect)", re.I),
    re.compile(r"join\s+each.{0,200}(?:correct|matching)", re.I),
    re.compile(r"connect\s+each", re.I),
]

BROAD_VISUAL_PATTERNS = [
    re.compile(r"following\s+(?:logic\s+)?circuit", re.I),
    re.compile(r"(?:^|[.!?]\s+)(?:(?:a|the|this)\s+)?logic\s+circuit\s+(?:(?:is\s+)?shown|below|above|shows|represents)", re.I),
    re.compile(r"circuit\s+shown\s+(?:below|above)", re.I),
    re.compile(r"following\s+diagram", re.I),
    re.compile(r"diagram\s+(?:(?:is\s+)?shown|below|above|shows|represents)", re.I),
    re.compile(r"shown\s+in\s+(?:the\s+)?(?:diagram|figure)", re.I),
    re.compile(r"using\s+(?:the\s+)?(?:diagram|figure)", re.I),
    re.compile(r"figure\s+[0-9]+(?:\.[0-9]+)?\s+(?:shows|is\s+shown|represents)", re.I),
    re.compile(r"following\s+flowchart", re.I),
    re.compile(r"flowchart\s+(?:(?:is\s+)?shown|below|above|shows|represents)", re.I),
    re.compile(r"using\s+(?:the\s+)?flowchart", re.I),
    re.compile(r"following\s+graph", re.I),
    re.compile(r"graph\s+(?:(?:is\s+)?shown|below|above|shows|represents)", re.I),
    re.compile(r"using\s+(?:the\s+)?graph", re.I),
    re.compile(r"(?:network|tree)\s+(?:diagram\s+)?(?:below\s+)?(?:shows|represents|is\s+shown)", re.I),
    re.compile(r"following\s+(?:bitmap\s+)?image", re.I),
    re.compile(r"image\s+(?:(?:is\s+)?shown|below|above)", re.I),
    re.compile(r"complete.{0,100}(?:diagram|flowchart|logic\s+circuit)", re.I),
    re.compile(r"complete.{0,100}(?:e-?r|entity[- ]relationship)\s+diagram", re.I),
    re.compile(r"consider\s+the\s+logic\s+circuit", re.I),
]


def rule_patterns_v4(rule: str):
    if rule == "source_structure_required_but_missing_table":
        return BROAD_TABLE_PATTERNS
    if rule == "source_structure_required_but_missing_layout":
        return BROAD_LAYOUT_PATTERNS
    if rule == "source_visual_required_but_missing":
        return BROAD_VISUAL_PATTERNS
    return []


original_build_rows = BASE["build_rows"]
original_build_rows.__globals__["rule_patterns"] = rule_patterns_v4


def build_rows_v4(pdf, source, work):
    rows, plan = original_build_rows(pdf, source, work)
    targets = {str(target["questionId"]): target for target in source.get("targets") or []}
    for row in rows:
        target = targets.get(str(row.get("questionId"))) or {}
        text = row.setdefault("text", {})
        repaired = text.get("stemMd")
        if target.get("marks") is None:
            if repaired:
                text.pop("stemMd", None)
                text["contextMd"] = repaired
        else:
            if target.get("currentContext") is not None:
                text["contextMd"] = None
    return rows, plan


BASE["build_rows"] = build_rows_v4


if __name__ == "__main__":
    raise SystemExit(V3["main"]())
