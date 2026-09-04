#!/usr/bin/env python3
"""Source-authoritative canonical backfill v2 for Cambridge 0478/9618.

The database path/mark manifest and the SHA-pinned original QP identify a leaf.
Canonical text is then reconstructed from the verified PDF itself.  Historical
legacy stem_md is evidence only: it is deliberately *not* treated as source
authority because older 0478 extraction rows can contain duplicated answer
lines or text from neighbouring parts.

9618 reuses the production-proven qp-source-repair-v3 parser.  The same parser
is made syllabus-neutral for 0478.  Every paper remains fail-closed: if the
parser cannot recover every expected printed path for a paper, that paper
produces no writable rows.
"""
from __future__ import annotations

import hashlib
import os
import re
import runpy
import subprocess
import tempfile
from pathlib import Path
from typing import Any

V1 = runpy.run_path(
    "backend/scripts/structured_content_backfill.py",
    run_name="structured_content_backfill_v1_impl",
)
QP = runpy.run_path(
    "backend/scripts/qp-source-repair-v3.py",
    run_name="qp_source_repair_v3_for_structured_content",
)

PARSER_VERSION = "structured-content-source-v2"
PAGE_REF_RE = re.compile(r"(?:0478|9618)/\d+/(?:M/J|O/N|F/M)/\d+", re.I)

# qp-source-repair-v3 delegates several cleaning functions to its v2 base.
# Make those helpers syllabus-neutral without weakening their other gates.
QP_BASE = QP["BASE"]
QP_BASE["PAGE_REF_RE"] = PAGE_REF_RE
for name in ("is_noise_line", "clean_segment", "quality_gate"):
    fn = QP_BASE.get(name)
    if callable(fn):
        fn.__globals__["PAGE_REF_RE"] = PAGE_REF_RE


def layout_text(pdf: Path) -> str:
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as handle:
        output = Path(handle.name)
    try:
        subprocess.run(
            ["pdftotext", "-layout", str(pdf), str(output)],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=120,
        )
        return output.read_text(encoding="utf-8", errors="ignore")
    finally:
        output.unlink(missing_ok=True)


def page_map(text: str) -> list[int]:
    """Map parser line indices to 1-based source pages.

    Both qp-source-repair preprocessors preserve one output slot per input line
    and append one separator slot per form-feed page, so this map works for the
    legacy detector and its v3 fallback.
    """
    pages: list[int] = []
    for page_number, page in enumerate(text.split("\f"), start=1):
        pages.extend([page_number] * len(page.splitlines()))
        pages.append(page_number)
    return pages


def prefixes(path: str) -> list[str]:
    bits = path.split(".")
    return [".".join(bits[:depth]) for depth in range(1, len(bits))]


def legacy_overlap(stored: str, source: str) -> float:
    old = set(V1["lexical_tokens"](stored))
    new = set(V1["lexical_tokens"](source))
    if not old or not new:
        return 0.0
    return round(len(old & new) / max(1, len(new)), 4)


def source_asset_blocks(leaf: dict[str, Any], source_stem: str) -> tuple[list[dict[str, Any]] | None, str | None]:
    blocks: list[dict[str, Any]] = []
    assets = sorted(
        list(leaf.get("assets") or []),
        key=lambda item: (int(item.get("sortOrder") or 0), str(item.get("id") or "")),
    )
    for asset in assets:
        page = asset.get("sourcePage")
        if not isinstance(page, int) or page < 1:
            return None, "asset_source_page_missing"
        kind = str(asset.get("kind") or "")
        content = str(asset.get("contentMd") or "")
        asset_id = str(asset.get("id") or "")

        if kind == "table":
            parsed = V1["parse_markdown_table"](content)
            if parsed:
                headers, rows, editable = parsed
                lower = f"{source_stem} {asset.get('altText') or ''}".lower()
                table_kind = (
                    "truth_table" if "truth table" in lower
                    else "tick_grid" if "tick" in lower
                    else "selection_grid" if "select" in lower and "row" in lower
                    else "table"
                )
                blocks.append({
                    "type": "table", "kind": table_kind, "headers": headers,
                    "rows": rows, "editableCells": editable, "source": {"page": page},
                })
                continue
            # A repaired source crop is still preferable to flattening a table
            # whose cell semantics cannot be proven from markdown.
            if re.fullmatch(r"[0-9a-fA-F-]{36}", asset_id) and (
                asset.get("storagePath") or asset.get("sourceBbox") or asset.get("cropStatus")
            ):
                blocks.append({
                    "type": "asset", "kind": "image", "assetId": asset_id,
                    "altText": str(asset.get("altText") or "Original Cambridge source table"),
                    "source": {"page": page},
                })
                continue
            return None, "table_not_semantic"

        if kind == "pseudocode":
            if not content.strip():
                return None, "pseudocode_content_missing"
            blocks.append({
                "type": "code", "language": "pseudocode", "text": content.strip(),
                "source": {"page": page},
            })
            continue

        if kind in {"diagram", "image"}:
            if not re.fullmatch(r"[0-9a-fA-F-]{36}", asset_id):
                return None, "asset_id_invalid"
            blocks.append({
                "type": "asset", "kind": V1["asset_kind"](asset, source_stem),
                "assetId": asset_id,
                "altText": str(asset.get("altText") or "Original Cambridge source visual"),
                "source": {"page": page},
            })
            continue

        return None, "unsupported_asset_kind"
    return blocks, None


def plan_source(source: dict[str, Any], pdf: Path, work: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    del work
    leaves = list(source.get("leaves") or [])
    aliases = V1["aliases_for"](source)
    expected: dict[str, int] = {}
    internal_for_printed: dict[str, str] = {}
    for leaf in leaves:
        internal = str(leaf["path"])
        printed = aliases.get(internal, internal)
        if printed in expected:
            raise RuntimeError(f"duplicate_printed_path:{printed}")
        expected[printed] = int(leaf["marks"])
        internal_for_printed[printed] = internal

    text = layout_text(pdf)
    source_rows, events = QP["parse_text"](text, expected)
    pages = page_map(text)
    event_page: dict[str, int] = {}
    for event in events:
        line = int(event["line"])
        path = str(event["path"])
        if path not in event_page and 0 <= line < len(pages):
            event_page[path] = pages[line]

    rows: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    for leaf in leaves:
        question_id = str(leaf.get("questionId"))
        internal = str(leaf.get("path"))
        printed = aliases.get(internal, internal)
        if leaf.get("contentVersion") == 1:
            skipped.append({"questionId": question_id, "path": internal, "reason": "already_structured"})
            continue
        if leaf.get("hasOpenFidelityFinding"):
            skipped.append({"questionId": question_id, "path": internal, "reason": "open_fidelity_finding"})
            continue

        source_row = source_rows.get(printed)
        source_page = event_page.get(printed)
        if not source_row or not source_page:
            skipped.append({"questionId": question_id, "path": internal, "reason": "source_event_missing"})
            continue
        source_stem = str(source_row.get("stem") or "").strip()
        source_context = str(source_row.get("context") or "").strip()
        if not source_stem:
            skipped.append({"questionId": question_id, "path": internal, "reason": "source_stem_empty", "sourcePage": source_page})
            continue

        blocks: list[dict[str, Any]] = []
        if source_context:
            ancestor_pages = [event_page.get(prefix) for prefix in prefixes(printed)]
            context_page = next((page for page in ancestor_pages if page), source_page)
            blocks.append({
                "type": "text", "style": "paragraph", "text": source_context,
                "source": {"page": int(context_page)},
            })
        blocks.append({
            "type": "text", "style": "task", "text": source_stem,
            "source": {"page": source_page},
        })

        asset_blocks, error = source_asset_blocks(leaf, source_stem)
        if error or asset_blocks is None:
            skipped.append({"questionId": question_id, "path": internal, "reason": error or "asset_blocks_failed", "sourcePage": source_page})
            continue
        blocks.extend(asset_blocks)

        answer_kind = str(leaf.get("answerKind") or "")
        answer_lines = leaf.get("answerLines")
        if answer_kind == "diagram":
            blocks.append({"type": "answer_area", "kind": "drawing", "lines": None, "source": {"page": source_page}})
        elif isinstance(answer_lines, int) and answer_lines > 0 and answer_kind not in {"table", "diagram"}:
            blocks.append({"type": "answer_area", "kind": "lines", "lines": answer_lines, "source": {"page": source_page}})

        content = {
            "version": 1,
            "source": {
                "paperId": str(source["sourcePaperId"]),
                "sha256": str(source["sourceSha256"]).lower(),
            },
            "blocks": blocks,
        }
        segment_hash = hashlib.sha256((source_context + "\n\x1f\n" + source_stem).encode()).hexdigest()
        rows.append({
            "questionId": question_id,
            "sourcePage": source_page,
            "content": content,
            "evidence": {
                "eventPath": printed,
                "sourceAuthority": "sha256_pinned_pdf_path_mark_parser",
                "sourceTextSha256": segment_hash,
                "legacyStemTokenOverlap": legacy_overlap(str(leaf.get("stemMd") or ""), source_stem),
                "assetCount": len(list(leaf.get("assets") or [])),
                "parser": PARSER_VERSION,
            },
        })
    return rows, skipped


# Reuse v1 orchestration: source bootstrap, exact PDF SHA verification,
# all-papers-before-write behavior, OIDC apply gateway and reporting.
main_globals = V1["main"].__globals__
main_globals["plan_source"] = plan_source
main_globals["PARSER_VERSION"] = PARSER_VERSION

if __name__ == "__main__":
    raise SystemExit(V1["main"]())
