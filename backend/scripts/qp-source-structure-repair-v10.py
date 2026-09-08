#!/usr/bin/env python3
"""Source-fidelity repair v10 with deterministic structure-segment recovery.

v10 preserves every v9 source/hash/rule/review guard and adds two narrow fixes for
remaining canonical owner-boundary cases:

1. main-question ownership is located with the same x-position guards used by the
   canonical event parser, preventing data rows such as "6 Mouse ..." or
   "3 Over $100 ..." from being misread as question labels;
2. when a canonical structure is introduced inside the target or an ancestor
   event, recover only the source segment after that explicit structure cue and
   before the next question event (with conservative prose stop boundaries for
   known Cambridge table/diagram continuations).

No source structure is inferred from marks, topic knowledge or generated content.
If the exact source geometry cannot be proved, the finding remains needs_review.
"""
from __future__ import annotations

import base64
import re
import runpy
from typing import Any

V9 = runpy.run_path(
    "backend/scripts/qp-source-structure-repair-v9.py",
    run_name="source_structure_repair_v9_lib",
)
V8 = V9["V8"]
V7 = V8["V7"]
V6 = V7["V6"]
V3 = V9["V3"]
BASE = V9["BASE"]
ORIGINAL_BUILD = V9["build_rows_v9"]
CLEAN = V7["CLEAN"]

MAIN_RE = V6["MAIN_RE"]
PART_RE = V6["PART_RE"]

EXTRA_TABLE_PATTERNS = [
    re.compile(r"\btable\s+(?:shows|showing|lists|is\s+shown|are\s+shown)", re.I),
    re.compile(r"part\s+of.{0,140}\btable\b.{0,140}(?:is\s+)?shown", re.I),
    re.compile(r"\bband\s+amount\s+points\b", re.I),
]
EXTRA_LAYOUT_PATTERNS = [
    re.compile(r"draw\s+one\s+line\s+from\s+each.{0,220}(?:to|with)", re.I),
]


def _valid_main_x_guarded(line, expected: int) -> bool:
    if float(getattr(line, "xmin", 9999.0)) > 72.0:
        return False
    text = CLEAN(line.text)
    match = MAIN_RE.match(text)
    if not match:
        return False
    token = match.group(1)
    if len(token) > 1 and token.startswith("0"):
        return False
    if int(token) != expected:
        return False
    rest = CLEAN(match.group(2) or "")
    if not rest or not re.match(r"^(?:\([a-z]\)|[A-Za-z])", rest, re.I):
        return False
    if not rest.startswith("(") and (len(rest) < 18 or len(rest.split()) < 4):
        return False
    return True


def _locate_span_x_guarded(lines, path: str):
    bits = str(path).split(".")
    question = int(bits[0])
    main_candidates = [
        i for i, line in enumerate(lines)
        if _valid_main_x_guarded(line, question)
    ]
    if len(main_candidates) != 1:
        return None, f"x_guarded_main_count:{len(main_candidates)}"
    main_index = main_candidates[0]

    next_candidates = [
        i for i, line in enumerate(lines[main_index + 1 :], start=main_index + 1)
        if _valid_main_x_guarded(line, question + 1)
    ]
    question_end = next_candidates[0] if next_candidates else len(lines)

    if len(bits) == 1:
        return (main_index, question_end), None

    part = bits[1].lower()
    part_candidates = []
    for i in range(main_index, question_end):
        text = CLEAN(lines[i].text)
        embedded = re.match(rf"^\s*{question}\s+\(({part})\)\s*", text, re.I)
        direct = PART_RE.match(text)
        if embedded or (
            direct
            and direct.group(1).lower() == part
            and float(getattr(lines[i], "xmin", 9999.0)) <= 92.0
        ):
            part_candidates.append(i)
    if len(part_candidates) != 1:
        return None, f"x_guarded_part_count:{len(part_candidates)}"
    start = part_candidates[0]

    sibling = chr(ord(part) + 1)
    end = question_end
    for i in range(start + 1, question_end):
        match = PART_RE.match(CLEAN(lines[i].text))
        if (
            match
            and match.group(1).lower() == sibling
            and float(getattr(lines[i], "xmin", 9999.0)) <= 92.0
        ):
            end = i
            break
    return (start, end), None


# v9 consults V6["_locate_span"] at runtime. Narrowing this one helper keeps all
# other v9 source-order logic unchanged while removing numeric data-row aliases.
V6["_locate_span"] = _locate_span_x_guarded


def _rule_patterns_v10(rule: str) -> list[re.Pattern[str]]:
    patterns = list(BASE["rule_patterns"](rule))
    if rule == "source_structure_required_but_missing_table":
        patterns.extend(EXTRA_TABLE_PATTERNS)
        # A matching layout rendered as a source image can also satisfy a stale
        # table finding until detector-v4 reconciliation has run.
        patterns.extend(EXTRA_LAYOUT_PATTERNS)
    elif rule == "source_structure_required_but_missing_layout":
        patterns.extend(EXTRA_LAYOUT_PATTERNS)
    return patterns


def _event_map(events) -> dict[str, list[Any]]:
    result: dict[str, list[Any]] = {}
    for event in events:
        result.setdefault(str(event.path), []).append(event)
    return result


def _next_event_after(events, index: int) -> int:
    for event in events:
        if event.index > index:
            return event.index
    return 10**9


def _ancestor_paths(path: str) -> list[str]:
    parts = str(path).split(".")
    values = [".".join(parts[:i]) for i in range(len(parts), 0, -1)]
    return values


def _bounded_structure_end(lines, cue_stop: int, default_end: int, rule: str, cue_text: str) -> int:
    upper = min(default_end, len(lines))
    if upper <= cue_stop + 1:
        return default_end

    cue_lower = cue_text.lower()
    stop_patterns: list[re.Pattern[str]] = []
    if rule == "source_visual_required_but_missing":
        stop_patterns = [
            re.compile(r"^a\s+program\s+is\s+needed\b", re.I),
            re.compile(r"^assume\s*:?$", re.I),
        ]
    elif rule == "source_structure_required_but_missing_table":
        if re.search(r"part\s+of.{0,140}\btable\b.{0,140}shown", cue_lower):
            stop_patterns = [
                re.compile(r"^the\s+database\s+(?:only\s+)?supports\b", re.I),
                re.compile(r"^write\s+a\s+structured\s+query\s+language\b", re.I),
            ]
        elif re.search(r"\bband\s+amount\s+points\b", cue_lower):
            stop_patterns = [re.compile(r"^for\s+example\b", re.I)]

    if not stop_patterns:
        return default_end

    for index in range(cue_stop + 1, upper):
        text = CLEAN(lines[index].text)
        if any(pattern.search(text) for pattern in stop_patterns):
            return index
    return default_end


def _structure_segment_asset(
    pdf,
    work,
    lines,
    page_sizes,
    events,
    target: dict[str, Any],
    target_event,
    rule: str,
    required_kind: str,
):
    by_path = _event_map(events)
    for path in _ancestor_paths(str(target.get("path") or "")):
        matches = [event for event in by_path.get(path, []) if event.index <= target_event.index]
        if len(matches) != 1:
            continue
        event = matches[0]
        default_end = _next_event_after(events, event.index)
        if default_end <= event.index:
            continue
        default_end = min(default_end, len(lines))
        hit = BASE["pattern_hit"](
            lines,
            event,
            default_end,
            _rule_patterns_v10(rule),
        )
        if not hit:
            continue
        cue_stop, match = hit
        cue_page = lines[cue_stop].page
        if cue_page not in page_sizes:
            continue
        end_index = _bounded_structure_end(
            lines,
            cue_stop,
            default_end,
            rule,
            match.group(0),
        )
        bbox = V3["crop_bounds_v3"](
            lines,
            event,
            end_index,
            cue_stop,
            page_sizes[cue_page],
        )
        if not bbox:
            continue
        png, png_hash = BASE["render_crop"](
            pdf,
            cue_page,
            bbox,
            work,
            f"{str(target['questionId'])[:8]}-structure-v10-{cue_page}",
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
            "ownerPath": path,
            "ownerEvent": event.index,
            "cueStop": cue_stop,
            "sourcePage": cue_page,
            "endIndex": end_index,
            "bbox": list(bbox),
            "bytes": len(png),
            "matchedCue": match.group(0)[:240],
        }
        return asset, evidence
    return None, None


def build_rows_v10(pdf, source, work):
    rows, plan = ORIGINAL_BUILD(pdf, source, work)
    targets = {str(target["questionId"]): target for target in source.get("targets") or []}
    rows_by_id = {str(row.get("questionId")): row for row in rows}
    plan_by_id = {str(item.get("questionId")): item for item in plan}
    lines, page_sizes, unique_events = V7["_source_geometry"](pdf, source, work)
    events = V9["_all_events"](lines, source)

    for question_id, target in targets.items():
        old_plan = plan_by_id.get(question_id) or {}
        if old_plan.get("status") != "canonical_owner_span_blocked":
            continue
        evidence = V8["_canonical_evidence"](target)
        if evidence is None:
            continue
        rule, required_kind, cue = evidence
        target_event = unique_events.get(str(target.get("path") or ""))
        if target_event is None:
            continue

        asset, segment_evidence = _structure_segment_asset(
            pdf,
            work,
            lines,
            page_sizes,
            events,
            target,
            target_event,
            rule,
            required_kind,
        )
        if asset is None:
            replacement = dict(old_plan)
            replacement.update({
                "status": "canonical_structure_segment_blocked_v10",
                "reason": old_plan.get("reason") or "structure_segment_not_proved",
                "ownerBoundary": "explicit_rule_cue_segment_blocked",
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
            "status": "asset_canonical_structure_segment_v10",
            "reason": None,
            "canonicalRule": rule,
            "canonicalCue": cue[:240],
            "requiredKind": required_kind,
            "ownerBoundary": "explicit_rule_cue_segment",
            "ownerEvidence": segment_evidence or {},
            "resolvedByText": [
                value for value in replacement.get("resolvedByText") or []
                if str(value) != rule
            ],
        })
        plan = [item for item in plan if str(item.get("questionId")) != question_id]
        plan.append(replacement)
        plan_by_id[question_id] = replacement

    return rows, plan


BASE["build_rows"] = build_rows_v10

if __name__ == "__main__":
    raise SystemExit(V3["main"]())
