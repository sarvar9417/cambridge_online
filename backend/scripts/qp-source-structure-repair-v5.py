#!/usr/bin/env python3
"""Final source-fidelity repair hardening for the residual Cambridge edge cases.

v5 is intentionally narrow:
* remove the vertical "DO NOT WRITE IN THIS MARGIN" token before grouped bbox
  lines are classified, so 2025 templates do not hide real question labels;
* treat references to a table above / K-map as backward visual references;
* when a question explicitly says its source layout is "given on page N", crop
  that exact referenced source page instead of guessing a same-page boundary.

All existing SHA, source-paper, rule-resolution and idempotency gates remain in
v4/v3/v2.  Ambiguous rows still stay skipped.
"""
from __future__ import annotations

import base64
import re
import runpy
from typing import Any

V4 = runpy.run_path(
    "backend/scripts/qp-source-structure-repair-v4.py",
    run_name="source_structure_repair_v4_lib",
)
V3 = V4["V3"]
BASE = V4["BASE"]

ORIGINAL_CLEAN = BASE["clean_text"]
MARGIN = re.compile(r"DO\s+NOT\s+WRITE\s+IN\s+THIS\s+MARGIN", re.I)


def clean_text_v5(value: str) -> str:
    # Grouped bbox extraction can place the vertical margin warning on the same
    # physical line as the real question label. Remove only that known template
    # token; all other noise and geometry checks remain unchanged.
    return ORIGINAL_CLEAN(MARGIN.sub(" ", value or ""))


# Patch every v2/v3 helper that classifies grouped bbox lines.
BASE["clean_text"] = clean_text_v5
for fn_name in ("parse_bbox", "is_noise", "line_for_segment", "segment_text", "pattern_hit"):
    fn = BASE.get(fn_name)
    if callable(fn):
        fn.__globals__["clean_text"] = clean_text_v5
for fn_name in ("detect_events_v3", "crop_bounds_v3"):
    fn = V3.get(fn_name)
    if callable(fn):
        fn.__globals__["clean_text"] = clean_text_v5

# Cambridge frequently tells the candidate to edit a structure printed in the
# immediately preceding parent/sibling part. Reuse v3's audited backward crop.
V3["BACKWARD_VISUAL_RE"] = re.compile(
    r"shown\s+in\s+(?:the\s+)?(?:diagram|figure)|shown\s+above|"
    r"queue\s+shown\s+in\s+(?:the\s+)?diagram|using\s+(?:the\s+)?diagram|"
    r"table\s+above|(?:in|on|using)\s+(?:the\s+)?k-?map|karnaugh\s+map",
    re.I,
)
V3["crop_bounds_v3"].__globals__["BACKWARD_VISUAL_RE"] = V3["BACKWARD_VISUAL_RE"]
# v3 installed its crop function into v2 build_rows during import.
BASE["build_rows"].__globals__["crop_bounds"] = V3["crop_bounds_v3"]

ORIGINAL_BUILD = V4["build_rows_v4"]
PAGE_REF = re.compile(r"\bgiven\s+on\s+page\s+(\d{1,2})\b", re.I)


def _cross_page_row(pdf, source: dict[str, Any], work, target: dict[str, Any], page: int):
    lines, page_sizes = BASE["parse_bbox"](pdf, work)
    if page not in page_sizes:
        return None
    page_lines = [
        line for line in lines
        if line.page == page and not BASE["is_noise"](clean_text_v5(line.text))
    ]
    if not page_lines:
        return None
    # Full-width source crop bounded by meaningful source content on the exact
    # referenced page. This preserves blank cells/lines invisible to pdftotext.
    y1 = max(35.0, min(line.ymin for line in page_lines) - 6.0)
    y2 = min(page_sizes[page][1] - 45.0, max(line.ymax for line in page_lines) + 6.0)
    bbox = V3["_full_width"](page_sizes[page], y1, y2)
    if not bbox:
        return None
    png, png_hash = BASE["render_crop"](pdf, page, bbox, work, str(target["questionId"])[:8] + "-xref")
    rules = sorted(str(rule) for rule in target.get("rules") or [])
    row = {
        "questionId": target["questionId"],
        "text": {},
        "assets": [{
            "kind": "image",
            "pngBase64": base64.b64encode(png).decode(),
            "altText": f"Original Cambridge referenced source layout for {target['displayRef']}",
            "sourcePage": page,
            "sourceBbox": list(bbox),
            "contentHash": png_hash,
            "satisfiesRules": rules,
        }],
        "resolveRules": [],
        "restoreApproval": True,
    }
    plan = {
        "questionId": target["questionId"],
        "path": target["path"],
        "displayRef": target["displayRef"],
        "status": "asset_cross_page",
        "page": page,
        "bbox": list(bbox),
        "bytes": len(png),
        "trueRules": rules,
        "resolvedByText": [],
        "stemChanged": False,
    }
    return row, plan


def build_rows_v5(pdf, source, work):
    rows, plan = ORIGINAL_BUILD(pdf, source, work)
    existing = {str(row.get("questionId")) for row in rows}
    plan_by_id = {str(item.get("questionId")): item for item in plan}
    targets = {str(target["questionId"]): target for target in source.get("targets") or []}

    for question_id, target in targets.items():
        if question_id in existing:
            continue
        item = plan_by_id.get(question_id) or {}
        if item.get("status") != "skipped" or item.get("reason") != "crop_bounds_missing":
            continue
        source_text = "\n".join(
            str(target.get(key) or "") for key in ("currentContext", "currentStem")
        )
        match = PAGE_REF.search(source_text)
        if not match:
            continue
        fallback = _cross_page_row(pdf, source, work, target, int(match.group(1)))
        if not fallback:
            continue
        row, replacement = fallback
        rows.append(row)
        plan = [entry for entry in plan if str(entry.get("questionId")) != question_id]
        plan.append(replacement)
        existing.add(question_id)
    return rows, plan


BASE["build_rows"] = build_rows_v5

if __name__ == "__main__":
    raise SystemExit(V3["main"]())
