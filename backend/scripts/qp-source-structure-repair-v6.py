#!/usr/bin/env python3
"""Exact-label fallback for the last Cambridge source-fidelity spans.

Some 2021/2025 9618 templates place real question labels outside the historical
bbox x-thresholds.  v6 does not relax those thresholds globally.  Instead, only
for rows that v5 still reports as event_count:0, it locates the exact printed
main/part label in the SHA-verified PDF and crops the complete source span up to
the next sibling part or main question.  Every printed label must be unique;
otherwise the row remains skipped.
"""
from __future__ import annotations

import base64
import re
import runpy
from typing import Any

V5 = runpy.run_path(
    "backend/scripts/qp-source-structure-repair-v5.py",
    run_name="source_structure_repair_v5_lib",
)
V4 = V5["V4"]
V3 = V5["V3"]
BASE = V5["BASE"]
CLEAN = V5["clean_text_v5"]
ORIGINAL_BUILD = V5["build_rows_v5"]

MAIN_RE = re.compile(r"^\s*(\d{1,2})\s+(.+)$")
PART_RE = re.compile(r"^\s*\(([a-z])\)\s*(.*)$", re.I)


def _valid_main(text: str, expected: int) -> bool:
    match = MAIN_RE.match(text)
    if not match:
        return False
    token = match.group(1)
    if len(token) > 1 and token.startswith("0"):
        return False
    if int(token) != expected:
        return False
    rest = match.group(2).strip()
    if not re.match(r"^(?:\([a-z]\)|[A-Za-z])", rest, re.I):
        return False
    # Reject compact table/data rows while accepting a printed question that
    # immediately embeds part (a).
    if not rest.startswith("(") and (len(rest) < 18 or len(rest.split()) < 4):
        return False
    return True


def _locate_span(lines, path: str):
    bits = path.split(".")
    question = int(bits[0])
    main_candidates = [i for i, line in enumerate(lines) if _valid_main(CLEAN(line.text), question)]
    if len(main_candidates) != 1:
        return None, f"exact_main_count:{len(main_candidates)}"
    main_index = main_candidates[0]

    # Bound the question by the unique next printed main label when available.
    next_candidates = [
        i for i, line in enumerate(lines[main_index + 1 :], start=main_index + 1)
        if _valid_main(CLEAN(line.text), question + 1)
    ]
    question_end = next_candidates[0] if next_candidates else len(lines)

    if len(bits) == 1:
        return (main_index, question_end), None

    part = bits[1].lower()
    part_candidates = []
    for i in range(main_index, question_end):
        text = CLEAN(lines[i].text)
        # Cambridge can print "Qn (a) ..." on the main line.
        embedded = re.match(rf"^\s*{question}\s+\(({part})\)\s*", text, re.I)
        direct = PART_RE.match(text)
        if embedded or (direct and direct.group(1).lower() == part):
            part_candidates.append(i)
    if len(part_candidates) != 1:
        return None, f"exact_part_count:{len(part_candidates)}"
    start = part_candidates[0]

    # A parent part owns all roman subparts; stop only at the next alphabetic
    # sibling or the next main question.
    sibling = chr(ord(part) + 1)
    end = question_end
    for i in range(start + 1, question_end):
        match = PART_RE.match(CLEAN(lines[i].text))
        if match and match.group(1).lower() == sibling:
            end = i
            break
    return (start, end), None


def _span_assets(pdf, work, lines, page_sizes, target: dict[str, Any], start: int, end: int):
    selected = [line for line in lines[start:end] if not BASE["is_noise"](CLEAN(line.text))]
    if not selected:
        return None
    pages = sorted({line.page for line in selected})
    rules = sorted(str(rule) for rule in target.get("rules") or [])
    assets = []
    plan_assets = []
    for page in pages:
        page_lines = [line for line in selected if line.page == page]
        if not page_lines or page not in page_sizes:
            return None
        y1 = max(35.0, min(line.ymin for line in page_lines) - 6.0)
        y2 = min(page_sizes[page][1] - 45.0, max(line.ymax for line in page_lines) + 6.0)
        bbox = V3["_full_width"](page_sizes[page], y1, y2)
        if not bbox:
            return None
        png, png_hash = BASE["render_crop"](
            pdf, page, bbox, work, f"{str(target['questionId'])[:8]}-span-{page}"
        )
        assets.append({
            "kind": "image",
            "pngBase64": base64.b64encode(png).decode(),
            "altText": f"Original Cambridge source span for {target['displayRef']} (page {page})",
            "sourcePage": page,
            "sourceBbox": list(bbox),
            "contentHash": png_hash,
            "satisfiesRules": rules,
        })
        plan_assets.append({"page": page, "bbox": list(bbox), "bytes": len(png)})
    return assets, plan_assets


def build_rows_v6(pdf, source, work):
    rows, plan = ORIGINAL_BUILD(pdf, source, work)
    existing = {str(row.get("questionId")) for row in rows}
    plan_by_id = {str(item.get("questionId")): item for item in plan}
    targets = {str(target["questionId"]): target for target in source.get("targets") or []}
    lines, page_sizes = BASE["parse_bbox"](pdf, work)

    for question_id, target in targets.items():
        if question_id in existing:
            continue
        old = plan_by_id.get(question_id) or {}
        if old.get("status") != "skipped" or not str(old.get("reason") or "").startswith("event_count:0"):
            continue
        span, error = _locate_span(lines, str(target["path"]))
        if not span:
            replacement = dict(old)
            replacement["reason"] = error or "exact_span_missing"
            plan = [entry for entry in plan if str(entry.get("questionId")) != question_id]
            plan.append(replacement)
            continue
        rendered = _span_assets(pdf, work, lines, page_sizes, target, span[0], span[1])
        if not rendered:
            replacement = dict(old)
            replacement["reason"] = "exact_span_crop_failed"
            plan = [entry for entry in plan if str(entry.get("questionId")) != question_id]
            plan.append(replacement)
            continue
        assets, plan_assets = rendered
        rules = sorted(str(rule) for rule in target.get("rules") or [])
        rows.append({
            "questionId": target["questionId"],
            "text": {},
            "assets": assets,
            "resolveRules": [],
            "restoreApproval": True,
        })
        plan = [entry for entry in plan if str(entry.get("questionId")) != question_id]
        plan.append({
            "questionId": target["questionId"],
            "path": target["path"],
            "displayRef": target["displayRef"],
            "status": "asset_exact_label_span",
            "assets": plan_assets,
            "trueRules": rules,
            "resolvedByText": [],
            "stemChanged": False,
        })
        existing.add(question_id)
    return rows, plan


BASE["build_rows"] = build_rows_v6

if __name__ == "__main__":
    raise SystemExit(V3["main"]())
