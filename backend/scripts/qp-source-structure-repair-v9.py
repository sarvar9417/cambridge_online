#!/usr/bin/env python3
"""Source-fidelity repair v9 with hierarchical owner-span recovery.

v9 preserves every v8 fail-closed rule and adds one deterministic fallback for
canonical detector-v3 findings that remain blocked after same-page leaf recovery:

- locate the target inside its unique printed main-question span;
- search only source text preceding the target for the canonical cue signature;
- choose the nearest preceding occurrence when a source phrase is repeated;
- crop from the source cue to the next printed question/part boundary, preserving
  the original Cambridge table/diagram/layout geometry;
- scope the recovered asset to exactly the canonical rule it proves;
- leave missing/ambiguous geometry unresolved rather than guessing.

This specifically handles shared parent context and previous-page structures that
are copied into a leaf's canonical content_json but sit outside that leaf's own
PDF text segment.
"""
from __future__ import annotations

import base64
import re
import runpy
from typing import Any

V8 = runpy.run_path(
    "backend/scripts/qp-source-structure-repair-v8.py",
    run_name="source_structure_repair_v8_lib",
)
V7 = V8["V7"]
V6 = V7["V6"]
V3 = V8["V3"]
BASE = V8["BASE"]
ORIGINAL_BUILD = V8["build_rows_v8"]
CLEAN = V7["CLEAN"]


def _tokens(value: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", value.lower())


def _candidate_cue_starts(lines, start: int, end: int, cue: str) -> list[int]:
    signature = _tokens(cue)[:6]
    if len(signature) < 4:
        return []
    candidates: list[int] = []
    for index in range(max(0, start), min(len(lines), end)):
        window: list[str] = []
        for offset in range(index, min(end, index + 8)):
            window.extend(_tokens(CLEAN(lines[offset].text)))
            if len(window) >= len(signature) + 8:
                break
        if any(
            window[pos : pos + len(signature)] == signature
            for pos in range(max(0, len(window) - len(signature) + 1))
        ):
            candidates.append(index)

    # pdftotext windows overlap; collapse adjacent hits into one source locus.
    collapsed: list[int] = []
    for index in candidates:
        if not collapsed or index - collapsed[-1] > 3:
            collapsed.append(index)
    return collapsed


def _all_events(lines, source: dict[str, Any]):
    leaf_paths = [str(leaf["path"]) for leaf in source.get("leaves") or []]
    return sorted(
        V3["detect_events_v3"](lines, BASE["prefixes"](leaf_paths)),
        key=lambda event: event.index,
    )


def _next_event_index(events, cue_start: int, main_end: int) -> int:
    for event in events:
        if cue_start < event.index < main_end:
            return event.index
    return main_end


def _canonical_owner_span_asset(
    pdf,
    work,
    lines,
    page_sizes,
    events,
    target_event,
    target: dict[str, Any],
    rule: str,
    required_kind: str,
    cue: str,
):
    main_path = str(target.get("path") or "").split(".", 1)[0]
    span, span_error = V6["_locate_span"](lines, main_path)
    if not span:
        return None, span_error or "owner_main_span_missing", None
    main_start, main_end = span
    if not (main_start <= target_event.index < main_end):
        return None, "target_outside_owner_main_span", None

    candidates = _candidate_cue_starts(lines, main_start, target_event.index + 1, cue)
    preceding = [index for index in candidates if index <= target_event.index]
    if not preceding:
        return None, "owner_cue_count:0", {"candidateCount": len(candidates)}

    # The nearest preceding occurrence is the only occurrence that can own the
    # target when Cambridge repeats the same table/diagram wording later in the
    # same main question. This remains source-order deterministic.
    cue_start = max(preceding)
    cue_page = lines[cue_start].page
    if cue_page not in page_sizes:
        return None, "owner_cue_page_missing", {"candidateCount": len(preceding)}

    boundary = _next_event_index(events, cue_start, main_end)
    if boundary <= cue_start:
        return None, "owner_boundary_not_after_cue", {"candidateCount": len(preceding)}

    # Let the established source rule regex determine the final instruction line
    # whenever possible. This avoids including wrapped introduction prose in the
    # asset while retaining geometry that pdftotext cannot see.
    synthetic = BASE["Event"](
        str(target.get("path") or main_path),
        cue_start,
        cue_page,
        CLEAN(lines[cue_start].text),
    )
    hit = BASE["pattern_hit"](
        lines,
        synthetic,
        boundary,
        BASE["rule_patterns"](rule),
    )
    cue_stop = hit[0] if hit else cue_start
    if lines[cue_stop].page != cue_page:
        cue_stop = cue_start

    bbox = V3["crop_bounds_v3"](
        lines,
        synthetic,
        boundary,
        cue_stop,
        page_sizes[cue_page],
    )
    if not bbox:
        return None, "owner_span_crop_missing", {
            "candidateCount": len(preceding),
            "cueStart": cue_start,
            "boundary": boundary,
        }

    png, png_hash = BASE["render_crop"](
        pdf,
        cue_page,
        bbox,
        work,
        f"{str(target['questionId'])[:8]}-owner-{cue_page}",
    )
    asset = {
        "kind": "image",
        "pngBase64": base64.b64encode(png).decode(),
        "altText": V8["_canonical_asset_label"](required_kind, target),
        "sourcePage": cue_page,
        "sourceBbox": list(bbox),
        "contentHash": png_hash,
        "satisfiesRules": [rule],
        "sourcePlacement": "after_source_visual_cue",
    }
    evidence = {
        "candidateCount": len(preceding),
        "cueStart": cue_start,
        "cuePage": cue_page,
        "boundary": boundary,
        "bbox": list(bbox),
        "bytes": len(png),
    }
    return asset, None, evidence


def build_rows_v9(pdf, source, work):
    rows, plan = ORIGINAL_BUILD(pdf, source, work)
    targets = {str(target["questionId"]): target for target in source.get("targets") or []}
    rows_by_id = {str(row.get("questionId")): row for row in rows}
    plan_by_id = {str(item.get("questionId")): item for item in plan}
    lines, page_sizes, unique_events = V7["_source_geometry"](pdf, source, work)
    events = _all_events(lines, source)

    for question_id, target in targets.items():
        old_plan = plan_by_id.get(question_id) or {}
        if old_plan.get("status") != "canonical_owner_boundary_blocked":
            continue
        evidence = V8["_canonical_evidence"](target)
        if evidence is None:
            continue
        rule, required_kind, cue = evidence
        target_event = unique_events.get(str(target.get("path") or ""))
        if target_event is None:
            continue

        asset, error, owner_evidence = _canonical_owner_span_asset(
            pdf,
            work,
            lines,
            page_sizes,
            events,
            target_event,
            target,
            rule,
            required_kind,
            cue,
        )
        if asset is None:
            replacement = dict(old_plan)
            replacement.update({
                "status": "canonical_owner_span_blocked",
                "reason": error or "owner_span_asset_not_proved",
                "ownerBoundary": "main_question_nearest_preceding_cue_blocked",
                "ownerEvidence": owner_evidence or {},
            })
            plan = [item for item in plan if str(item.get("questionId")) != question_id]
            plan.append(replacement)
            plan_by_id[question_id] = replacement
            continue

        row = rows_by_id.get(question_id)
        if row is None:
            row = {
                "questionId": target["questionId"],
                "text": {},
                "assets": [],
                "resolveRules": [],
                "restoreApproval": True,
            }
            rows.append(row)
            rows_by_id[question_id] = row
        row["resolveRules"] = [
            str(value) for value in row.get("resolveRules") or []
            if str(value) != rule
        ]
        row.setdefault("assets", []).append(asset)
        row["restoreApproval"] = True

        replacement = dict(old_plan)
        replacement.update({
            "status": "asset_canonical_owner_question_span",
            "reason": None,
            "canonicalRule": rule,
            "canonicalCue": cue[:240],
            "requiredKind": required_kind,
            "ownerBoundary": "main_question_nearest_preceding_cue",
            "ownerEvidence": owner_evidence or {},
            "resolvedByText": [
                value for value in replacement.get("resolvedByText") or []
                if str(value) != rule
            ],
        })
        plan = [item for item in plan if str(item.get("questionId")) != question_id]
        plan.append(replacement)
        plan_by_id[question_id] = replacement

    return rows, plan


BASE["build_rows"] = build_rows_v9

if __name__ == "__main__":
    raise SystemExit(V3["main"]())
