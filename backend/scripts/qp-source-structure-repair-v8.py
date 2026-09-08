#!/usr/bin/env python3
"""Source-fidelity repair v8 with canonical owner-boundary protection.

v8 keeps every v7 SHA/source/geometry gate and changes only canonical detector-v3
handling:
- canonical findings are never resolved by leaf text absence;
- a canonical rule must be proved by an explicit verified asset;
- inherited/shared-parent source structures are recovered from a unique same-page
  cue span when possible;
- canonical assets are labelled for ordered insertion immediately after the
  canonical source cue in content_json;
- ambiguous/cross-page ownership remains needs_review.
"""
from __future__ import annotations

import runpy
from typing import Any

V7 = runpy.run_path(
    "backend/scripts/qp-source-structure-repair-v7.py",
    run_name="source_structure_repair_v7_lib",
)
V3 = V7["V3"]
BASE = V7["BASE"]
ORIGINAL_BUILD = V7["build_rows_v7"]
CANONICAL_AUDIT = V7["CANONICAL_AUDIT"]


def _canonical_evidence(target: dict[str, Any]):
    return V7["_canonical_evidence"](target)


def _canonical_asset_label(required_kind: str, target: dict[str, Any]) -> str:
    # sync_repaired_source_assets_v2 intentionally recognises this prefix and
    # inserts the asset immediately after the canonical source cue.
    display_ref = target.get("displayRef") or target.get("path") or target.get("questionId")
    return f"Preceding Cambridge source visual ({required_kind}) for {display_ref}"


def _scope_canonical_asset(asset: dict[str, Any], rule: str, required_kind: str, target: dict[str, Any]) -> bool:
    declared = [str(value) for value in asset.get("satisfiesRules") or []]
    if rule not in declared:
        return False
    asset["satisfiesRules"] = [rule]
    asset["altText"] = _canonical_asset_label(required_kind, target)
    asset["sourcePlacement"] = "after_source_visual_cue"
    return True


def _row_meaningful(row: dict[str, Any], target: dict[str, Any]) -> bool:
    if row.get("assets") or row.get("resolveRules"):
        return True
    text = row.get("text") or {}
    normalize = BASE["normalize_compare"]
    if text.get("stemMd") and normalize(text.get("stemMd")) != normalize(target.get("currentStem")):
        return True
    if "contextMd" in text and normalize(text.get("contextMd")) != normalize(target.get("currentContext")):
        return True
    return False


def build_rows_v8(pdf, source, work):
    rows, plan = ORIGINAL_BUILD(pdf, source, work)
    targets = {str(target["questionId"]): target for target in source.get("targets") or []}
    rows_by_id = {str(row.get("questionId")): row for row in rows}
    plan_by_id = {str(item.get("questionId")): item for item in plan}
    lines, page_sizes, events = V7["_source_geometry"](pdf, source, work)

    for question_id, target in targets.items():
        evidence = _canonical_evidence(target)
        if evidence is None:
            continue
        rule, required_kind, cue = evidence
        row = rows_by_id.get(question_id)
        old_plan = plan_by_id.get(question_id) or {}

        # Canonical adjacency evidence can never be disproved by the absence of
        # the cue in a leaf-owned text segment. Remove that text-only resolution
        # before any write manifest can be emitted.
        if row is not None:
            row["resolveRules"] = [
                str(value) for value in row.get("resolveRules") or []
                if str(value) != rule
            ]

        # If v2-v7 already recovered a verified source asset for this rule, keep
        # it but scope its authority to exactly this canonical rule and mark it
        # for ordered insertion after the canonical cue.
        asset_proves_rule = False
        if row is not None:
            for asset in row.get("assets") or []:
                if isinstance(asset, dict) and _scope_canonical_asset(
                    asset, rule, required_kind, target
                ):
                    asset_proves_rule = True

        if asset_proves_rule:
            replacement = dict(old_plan)
            replacement.update({
                "status": "asset_canonical_owner_verified",
                "canonicalRule": rule,
                "canonicalCue": cue[:240],
                "requiredKind": required_kind,
                "ownerBoundary": "verified_asset",
                "resolvedByText": [
                    value for value in replacement.get("resolvedByText") or []
                    if str(value) != rule
                ],
            })
            plan = [item for item in plan if str(item.get("questionId")) != question_id]
            plan.append(replacement)
            plan_by_id[question_id] = replacement
            continue

        # The common flattened-leaf case: canonical text inherited a structure
        # introduced before the leaf event. Recover only a unique same-page span.
        event = events.get(str(target.get("path") or ""))
        recovered = None
        error = "canonical_event_not_unique"
        if event is not None:
            recovered, error = V7["_canonical_preceding_row"](
                pdf, work, lines, page_sizes, event, target
            )

        if recovered is not None:
            recovered_row, recovered_plan = recovered
            canonical_assets = []
            for asset in recovered_row.get("assets") or []:
                if not isinstance(asset, dict):
                    continue
                asset["satisfiesRules"] = [rule]
                asset["altText"] = _canonical_asset_label(required_kind, target)
                asset["sourcePlacement"] = "after_source_visual_cue"
                canonical_assets.append(asset)

            if not canonical_assets:
                recovered = None
                error = "canonical_recovery_emitted_no_asset"
            else:
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
                row.setdefault("assets", []).extend(canonical_assets)
                row["restoreApproval"] = True
                replacement = dict(recovered_plan)
                replacement.update({
                    "status": "asset_canonical_owner_span",
                    "canonicalRule": rule,
                    "canonicalCue": cue[:240],
                    "requiredKind": required_kind,
                    "ownerBoundary": "shared_parent_same_page",
                    "resolvedByText": [
                        value for value in old_plan.get("resolvedByText") or []
                        if str(value) != rule
                    ],
                    "priorStatus": old_plan.get("status"),
                })
                plan = [item for item in plan if str(item.get("questionId")) != question_id]
                plan.append(replacement)
                plan_by_id[question_id] = replacement
                continue

        # Ambiguous ownership is not a false positive. Preserve any independent
        # source text correction but leave the canonical finding unresolved.
        replacement = dict(old_plan)
        replacement.update({
            "status": "canonical_owner_boundary_blocked",
            "reason": error or "canonical_source_asset_not_proved",
            "canonicalRule": rule,
            "canonicalCue": cue[:240],
            "requiredKind": required_kind,
            "ownerBoundary": "needs_review",
            "resolvedByText": [
                value for value in replacement.get("resolvedByText") or []
                if str(value) != rule
            ],
        })
        plan = [item for item in plan if str(item.get("questionId")) != question_id]
        plan.append(replacement)
        plan_by_id[question_id] = replacement

        if row is not None and not _row_meaningful(row, target):
            rows.remove(row)
            rows_by_id.pop(question_id, None)

    return rows, plan


BASE["build_rows"] = build_rows_v8

if __name__ == "__main__":
    raise SystemExit(V3["main"]())
