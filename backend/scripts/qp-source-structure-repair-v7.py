#!/usr/bin/env python3
"""Source-fidelity repair v7 for structures printed before a leaf task.

v7 keeps the existing two-phase SHA/source gates and adds two narrow repairs:
(1) explicit logo/back-reference wording is treated as a preceding visual cue;
(2) detector-v3 canonical cue evidence may recover a unique same-page source
span when legacy stem/context no longer carries shared parent context.
Ambiguous or cross-page matches remain skipped.
"""
from __future__ import annotations

import base64
import re
import runpy
from typing import Any

V6 = runpy.run_path(
    "backend/scripts/qp-source-structure-repair-v6.py",
    run_name="source_structure_repair_v6_lib",
)
V5 = V6["V5"]
V4 = V5["V4"]
V3 = V5["V3"]
BASE = V5["BASE"]
ORIGINAL_BUILD = V6["build_rows_v6"]
PT_TO_PX = BASE["PT_TO_PX"]
CLEAN = V5["clean_text_v5"]
CANONICAL_AUDIT = "source-fidelity-detector-v3-canonical-adjacency"

EXTRA_VISUAL_PATTERNS = [
    re.compile(r"following\s+(?:vector\s+)?logo", re.I),
    re.compile(r"(?:logo|shape|screenshot|screen\s+image)\s+(?:(?:is\s+)?shown|below|above|is\s+given|is\s+provided)", re.I),
    re.compile(r"(?:shown|given|provided)\s+(?:below|above|in\s+the\s+question)?\s*(?:logo|shape|screenshot|screen\s+image)", re.I),
    re.compile(r"(?:for|using|from)\s+this\s+logo", re.I),
    re.compile(r"example\s+from\s+(?:the|this)\s+logo", re.I),
    re.compile(r"(?:given|this)\s+logic\s+circuit", re.I),
]
V4["BROAD_VISUAL_PATTERNS"].extend(EXTRA_VISUAL_PATTERNS)

_old_backward = V3["BACKWARD_VISUAL_RE"].pattern
V3["BACKWARD_VISUAL_RE"] = re.compile(
    _old_backward
    + r"|(?:for|using|from)\s+this\s+logo"
    + r"|example\s+from\s+(?:the|this)\s+logo"
    + r"|following\s+(?:vector\s+)?logo"
    + r"|(?:logo|shape|screenshot|screen\s+image)\s+(?:shown|above|given|provided)"
    + r"|(?:given|this)\s+logic\s+circuit",
    re.I,
)
V3["crop_bounds_v3"].__globals__["BACKWARD_VISUAL_RE"] = V3["BACKWARD_VISUAL_RE"]
BASE["build_rows"].__globals__["crop_bounds"] = V3["crop_bounds_v3"]


def _source_geometry(pdf, source: dict[str, Any], work):
    lines, page_sizes = BASE["parse_bbox"](pdf, work)
    leaf_paths = [str(leaf["path"]) for leaf in source.get("leaves") or []]
    events = V3["detect_events_v3"](lines, BASE["prefixes"](leaf_paths))
    grouped: dict[str, list[Any]] = {}
    for event in events:
        grouped.setdefault(str(event.path), []).append(event)
    unique = {path: items[0] for path, items in grouped.items() if len(items) == 1}
    return lines, page_sizes, unique


def _is_preceding(asset: dict[str, Any], event: Any) -> bool:
    bbox = asset.get("sourceBbox")
    if not isinstance(bbox, list) or len(bbox) != 4 or asset.get("sourcePage") != event.page:
        return False
    try:
        return float(bbox[3]) <= float(event.ymin) * PT_TO_PX + 8.0
    except (TypeError, ValueError, AttributeError):
        return False


def _canonical_evidence(target: dict[str, Any]):
    evidence = target.get("ruleEvidence")
    if not isinstance(evidence, dict):
        return None
    for rule in target.get("rules") or []:
        detail = evidence.get(str(rule))
        if isinstance(detail, dict) and detail.get("audit") == CANONICAL_AUDIT:
            cue = str(detail.get("cue") or "").strip()
            if cue:
                return str(rule), str(detail.get("requiredKind") or "source"), cue
    return None


def _tokens(value: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", value.lower())


def _find_unique_preceding_cue(lines, event: Any, cue: str):
    signature = _tokens(cue)[:6]
    if len(signature) < 4:
        return None, "canonical_cue_signature_short"
    candidates: list[int] = []
    for index in range(max(0, event.index - 180), event.index):
        if lines[index].page != event.page:
            continue
        window: list[str] = []
        for offset in range(index, min(event.index, index + 5)):
            if lines[offset].page != event.page:
                break
            window.extend(_tokens(CLEAN(lines[offset].text)))
        for start in range(max(0, len(window) - len(signature) + 1)):
            if window[start:start + len(signature)] == signature:
                candidates.append(index)
                break
    collapsed: list[int] = []
    for index in candidates:
        if not collapsed or index - collapsed[-1] > 2:
            collapsed.append(index)
    if len(collapsed) != 1:
        return None, f"canonical_cue_count:{len(collapsed)}"
    return collapsed[0], None


def _canonical_preceding_row(pdf, work, lines, page_sizes, event: Any, target: dict[str, Any]):
    evidence = _canonical_evidence(target)
    if evidence is None:
        return None, "canonical_evidence_missing"
    rule, required_kind, cue = evidence
    cue_index, error = _find_unique_preceding_cue(lines, event, cue)
    if cue_index is None:
        return None, error
    cue_line = lines[cue_index]
    if cue_line.page != event.page or event.index <= cue_index:
        return None, "canonical_cue_not_preceding_same_page"
    bbox = V3["_full_width"](
        page_sizes[event.page], cue_line.ymax + 4.0, lines[event.index].ymin - 5.0
    )
    if not bbox:
        return None, "canonical_preceding_crop_missing"
    png, png_hash = BASE["render_crop"](
        pdf, event.page, bbox, work,
        f"{str(target['questionId'])[:8]}-canonical-pre-{event.page}",
    )
    target_rules = sorted(str(value) for value in target.get("rules") or [])
    label_kind = "visual" if required_kind == "visual" else required_kind
    row = {
        "questionId": target["questionId"],
        "text": {},
        "assets": [{
            "kind": "image",
            "pngBase64": base64.b64encode(png).decode(),
            "altText": f"Preceding Cambridge source {label_kind} for {target['displayRef']}",
            "sourcePage": event.page,
            "sourceBbox": list(bbox),
            "contentHash": png_hash,
            "satisfiesRules": [rule],
            "sourcePlacement": "after_source_visual_cue",
        }],
        "resolveRules": [],
        "restoreApproval": True,
    }
    plan = {
        "questionId": target["questionId"], "path": target["path"],
        "displayRef": target["displayRef"], "status": "asset_canonical_preceding_span",
        "assets": [{"page": event.page, "bbox": list(bbox), "bytes": len(png)}],
        "trueRules": [rule], "targetRules": target_rules,
        "resolvedByText": [], "stemChanged": False,
        "sourcePlacement": "after_source_visual_cue", "canonicalCue": cue[:240],
        "canonicalRule": rule,
    }
    return (row, plan), None


def build_rows_v7(pdf, source, work):
    rows, plan = ORIGINAL_BUILD(pdf, source, work)
    targets = {str(target["questionId"]): target for target in source.get("targets") or []}
    lines, page_sizes, events = _source_geometry(pdf, source, work)
    plan_by_id = {str(item.get("questionId")): item for item in plan}

    for row in rows:
        question_id = str(row.get("questionId"))
        target = targets.get(question_id) or {}
        event = events.get(str(target.get("path") or ""))
        if event is None:
            continue
        preceding_ids = []
        for asset in row.get("assets") or []:
            if not isinstance(asset, dict) or asset.get("kind") not in {"image", "diagram"}:
                continue
            if not _is_preceding(asset, event):
                continue
            evidence = _canonical_evidence(target)
            required = evidence[1] if evidence is not None else "visual"
            asset["altText"] = f"Preceding Cambridge source {required} for {target.get('displayRef') or target.get('path')}"
            asset["sourcePlacement"] = "after_source_visual_cue"
            preceding_ids.append(asset.get("contentHash"))
        if preceding_ids and question_id in plan_by_id:
            plan_by_id[question_id]["sourcePlacement"] = "after_source_visual_cue"
            plan_by_id[question_id]["precedingAssetHashes"] = [v for v in preceding_ids if v]

    existing = {str(row.get("questionId")) for row in rows}
    for question_id, target in targets.items():
        if question_id in existing or _canonical_evidence(target) is None:
            continue
        event = events.get(str(target.get("path") or ""))
        if event is None:
            replacement = {**(plan_by_id.get(question_id) or {}), "reason": "canonical_event_not_unique"}
            plan = [item for item in plan if str(item.get("questionId")) != question_id] + [replacement]
            continue
        recovered, error = _canonical_preceding_row(pdf, work, lines, page_sizes, event, target)
        if recovered is None:
            replacement = {**(plan_by_id.get(question_id) or {}), "reason": error or "canonical_preceding_recovery_failed"}
            plan = [item for item in plan if str(item.get("questionId")) != question_id] + [replacement]
            continue
        row, plan_entry = recovered
        rows.append(row)
        plan = [item for item in plan if str(item.get("questionId")) != question_id] + [plan_entry]
        existing.add(question_id)

    return rows, plan


BASE["build_rows"] = build_rows_v7

if __name__ == "__main__":
    raise SystemExit(V3["main"]())
