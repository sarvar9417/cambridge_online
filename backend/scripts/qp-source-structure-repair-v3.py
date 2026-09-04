#!/usr/bin/env python3
"""Two-phase source-fidelity repair orchestrator.

Phase 1 downloads and SHA-verifies every selected original QP, parses all
unresolved structured/visual targets and builds an in-memory repair manifest.
No database writes occur unless every selected source paper completes parsing
without provenance or parser failures.

Phase 2 applies the already-verified per-paper manifests through the guarded
service-role RPC. Ambiguous targets are deliberately skipped and remain
needs_review; they are never guessed or auto-approved.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import runpy
import tempfile
from pathlib import Path
from typing import Any, Iterable

BASE = runpy.run_path(
    "backend/scripts/qp-source-structure-repair-v2.py",
    run_name="source_structure_repair_v2_lib",
)

Line = BASE["Line"]
Event = BASE["Event"]
MAIN_RE = BASE["MAIN_RE"]
PART_RE = BASE["PART_RE"]
ROMAN_RE = BASE["ROMAN_RE"]
PT_TO_PX = BASE["PT_TO_PX"]
clean_text = BASE["clean_text"]
is_noise = BASE["is_noise"]


def _embedded_part(q: str, rest: str, valid_paths: set[str]) -> tuple[str | None, str | None, str]:
    part = PART_RE.match(rest)
    if not part:
        return None, None, rest
    letter = part.group(1).lower()
    tail = clean_text(part.group(2))
    roman = ROMAN_RE.match(tail)
    if roman:
        r = roman.group(1).lower()
        path = f"{q}.{letter}.{r}"
        if path in valid_paths:
            return letter, r, clean_text(roman.group(2))
    path = f"{q}.{letter}"
    if path in valid_paths:
        return letter, None, tail
    return None, None, rest


def detect_events_v3(lines: list[Any], valid_paths: set[str]) -> list[Any]:
    """Recognise Cambridge nested labels even when `(b) (i)` shares one line."""
    mains = {path.split(".", 1)[0] for path in valid_paths}
    events: list[Any] = []
    current_q: str | None = None
    current_part: str | None = None

    for index, line in enumerate(lines):
        text = clean_text(line.text)
        if is_noise(text):
            continue

        main = MAIN_RE.match(text)
        if main and line.xmin <= 72 and main.group(1) in mains:
            q = main.group(1)
            rest = clean_text(main.group(2) or "")
            current_q, current_part = q, None
            letter, roman, head = _embedded_part(q, rest, valid_paths)
            if letter:
                current_part = letter
                path = f"{q}.{letter}" + (f".{roman}" if roman else "")
                events.append(Event(path, index, line.page, head))
            elif q in valid_paths:
                events.append(Event(q, index, line.page, rest))
            continue

        part = PART_RE.match(text)
        if part and current_q and line.xmin <= 92:
            letter = part.group(1).lower()
            tail = clean_text(part.group(2))
            current_part = letter
            roman = ROMAN_RE.match(tail)
            if roman:
                candidate = f"{current_q}.{letter}.{roman.group(1).lower()}"
                if candidate in valid_paths:
                    events.append(Event(candidate, index, line.page, clean_text(roman.group(2))))
                    continue
            candidate = f"{current_q}.{letter}"
            if candidate in valid_paths:
                events.append(Event(candidate, index, line.page, tail))
                continue

        roman = ROMAN_RE.match(text)
        if roman and current_q and current_part and line.xmin <= 128:
            candidate = f"{current_q}.{current_part}.{roman.group(1).lower()}"
            if candidate in valid_paths:
                events.append(Event(candidate, index, line.page, clean_text(roman.group(2))))

    # The same path can occasionally be repeated by page headers/carry-over
    # layout. Keep only exact source events separated by meaningful content;
    # build_rows will still fail closed if more than one survives.
    deduped: list[Any] = []
    for event in events:
        if deduped and event.path == deduped[-1].path and event.index - deduped[-1].index <= 2:
            continue
        deduped.append(event)
    return deduped


BACKWARD_VISUAL_RE = re.compile(
    r"shown\s+in\s+(?:the\s+)?(?:diagram|figure)|shown\s+above|"
    r"queue\s+shown\s+in\s+(?:the\s+)?diagram|using\s+(?:the\s+)?diagram",
    re.I,
)


def _full_width(page_size: tuple[float, float], y1: float, y2: float) -> tuple[int, int, int, int] | None:
    width, height = page_size
    y1 = max(35.0, y1)
    y2 = min(height - 45.0, y2)
    if y2 - y1 < 18.0:
        return None
    x1, x2 = 55.0, min(width - 40.0, 555.0)
    return tuple(round(value * PT_TO_PX) for value in (x1, y1, x2, y2))


def crop_bounds_v3(
    lines: list[Any],
    event: Any,
    end_index: int,
    cue_stop: int,
    page_size: tuple[float, float],
) -> tuple[int, int, int, int] | None:
    """Recover source visuals even when they contain no extractable text.

    - Tables/blank diagrams after the instruction use geometric space up to the
      next question event, not text candidates.
    - Phrases such as "shown in the diagram" usually refer to a visual already
      printed in the parent context; in that case crop backwards to the nearest
      parent/main boundary on the same page.
    """
    cue_page = lines[cue_stop].page
    cue_window = " ".join(
        clean_text(lines[index].text)
        for index in range(max(event.index, cue_stop - 4), cue_stop + 1)
        if lines[index].page == cue_page
    )

    if BACKWARD_VISUAL_RE.search(cue_window):
        main_number = str(event.path).split(".", 1)[0]
        boundary: int | None = None
        for index in range(event.index - 1, -1, -1):
            line = lines[index]
            if line.page != cue_page:
                break
            text = clean_text(line.text)
            if not text:
                continue
            part = PART_RE.match(text)
            if part and line.xmin <= 92:
                boundary = index
                break
            main = MAIN_RE.match(text)
            if main and line.xmin <= 72 and main.group(1) == main_number:
                boundary = index
                break
        if boundary is not None:
            backward = _full_width(
                page_size,
                lines[boundary].ymax + 4.0,
                lines[event.index].ymin - 5.0,
            )
            if backward:
                return backward

    # Forward geometry is deliberately based on question boundaries rather than
    # extracted words. This preserves empty boxes, logic gates and connector
    # lines that pdftotext cannot see at all.
    y1 = lines[cue_stop].ymax + 4.0
    if end_index < len(lines) and lines[end_index].page == cue_page:
        y2 = lines[end_index].ymin - 5.0
    else:
        y2 = page_size[1] - 45.0
    forward = _full_width(page_size, y1, y2)
    if forward:
        return forward

    # Final conservative fallback to the original word-bounded strategy.
    return BASE["crop_bounds"](lines, event, end_index, cue_stop, page_size)


# Patch v2's proven source/hash/manifest machinery with the two layout fixes
# above. runpy functions retain a shared globals dictionary, so replacing these
# names changes only this orchestrator's process and leaves v2 replayable.
BASE["build_rows"].__globals__["detect_events"] = detect_events_v3
BASE["build_rows"].__globals__["crop_bounds"] = crop_bounds_v3


def source_key(source: dict[str, Any]) -> str:
    return BASE["source_key"](source)


def write_report(summary: dict[str, Any]) -> None:
    Path("source-structure-repair-plan.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    bootstrap = BASE["runner"]("source_structure_bootstrap_v2", timeout=180)["data"]
    if bootstrap.get("version") != "source-structure-repair-bootstrap-v2":
        raise RuntimeError("bootstrap_version_mismatch")

    sources = list(bootstrap.get("sources") or [])
    only = os.getenv("SOURCE_STRUCTURE_ONLY", "").strip()
    if only:
        sources = [
            source
            for source in sources
            if only
            in {
                str(source["sourcePaperId"]),
                source_key(source),
                str(source["syllabusCode"]),
            }
        ]
        if not sources:
            raise RuntimeError("source_structure_only_not_found")

    plan_only = os.getenv("SOURCE_STRUCTURE_APPLY", "").strip().upper() != "YES"
    plan_rows: list[dict[str, Any]] = []
    verified_manifests: list[tuple[str, dict[str, Any]]] = []
    paper_failures: list[dict[str, Any]] = []
    integrity_failures: list[dict[str, Any]] = []

    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        for source in sources:
            key = source_key(source)
            try:
                pdf = root / f"{key}.pdf"
                BASE["download"](str(source["sourceUrl"]), pdf)
                actual_sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
                expected_sha = str(source["sourceSha256"]).lower()
                if actual_sha != expected_sha:
                    integrity_failures.append(
                        {
                            "paper": key,
                            "sourcePaperId": source["sourcePaperId"],
                            "error": f"source_sha_mismatch:{actual_sha}:{expected_sha}",
                        }
                    )
                    continue

                paper_work = root / ("work-" + str(source["sourcePaperId"]))
                paper_work.mkdir(parents=True, exist_ok=True)
                rows, paper_plan = BASE["build_rows"](pdf, source, paper_work)
                plan_rows.extend({"paper": key, **item} for item in paper_plan)
                if rows:
                    verified_manifests.append(
                        (
                            key,
                            {
                                "version": "source-structure-repair-v2",
                                "sourcePaperId": source["sourcePaperId"],
                                "sourceSha256": expected_sha,
                                "rows": rows,
                            },
                        )
                    )
                print(
                    json.dumps(
                        {
                            "event": "paper_verified",
                            "paper": key,
                            "targets": len(source.get("targets") or []),
                            "planned": len(rows),
                        },
                        ensure_ascii=False,
                        separators=(",", ":"),
                    )
                )
            except Exception as exc:
                failure = {
                    "paper": key,
                    "sourcePaperId": source.get("sourcePaperId"),
                    "error": str(exc)[:3000],
                }
                paper_failures.append(failure)
                print(
                    json.dumps(
                        {"event": "paper_failed", **failure},
                        ensure_ascii=False,
                        separators=(",", ":"),
                    )
                )

        status_counts: dict[str, int] = {}
        for row in plan_rows:
            status = str(row.get("status") or "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1

        preflight = {
            "version": "source-structure-repair-v3",
            "mode": "plan" if plan_only else "apply",
            "bootstrapQuestions": bootstrap.get("questionCount"),
            "bootstrapPapers": bootstrap.get("paperCount"),
            "selectedPapers": len(sources),
            "verifiedPapers": len(sources) - len(paper_failures) - len(integrity_failures),
            "manifestPapers": len(verified_manifests),
            "statusCounts": status_counts,
            "paperFailures": paper_failures,
            "integrityFailures": integrity_failures,
            "rows": plan_rows,
        }

        if paper_failures or integrity_failures:
            preflight["databaseWritesAttempted"] = False
            write_report(preflight)
            print(json.dumps({k:v for k,v in preflight.items() if k != "rows"}, ensure_ascii=False, separators=(",", ":")))
            return 1

        if plan_only:
            preflight["databaseWritesAttempted"] = False
            write_report(preflight)
            print(json.dumps({k:v for k,v in preflight.items() if k != "rows"}, ensure_ascii=False, separators=(",", ":")))
            return 0

        applied: list[dict[str, Any]] = []
        apply_failures: list[dict[str, Any]] = []
        for index, (key, manifest) in enumerate(verified_manifests, start=1):
            try:
                result = BASE["runner"]("source_structure_apply_v2", {"manifest": manifest}, timeout=300)["result"]
                applied.append({"paper": key, "rows": len(manifest["rows"]), "result": result})
                print(json.dumps({"event":"apply_ok","index":index,"total":len(verified_manifests),"paper":key,"rows":len(manifest["rows"])}, ensure_ascii=False, separators=(",", ":")))
            except Exception as exc:
                failure = {"paper": key, "error": str(exc)[:3000]}
                apply_failures.append(failure)
                print(json.dumps({"event":"apply_failed",**failure}, ensure_ascii=False, separators=(",", ":")))

        summary = {
            **preflight,
            "databaseWritesAttempted": True,
            "appliedPapers": len(applied),
            "appliedRows": sum(int(item["rows"]) for item in applied),
            "applyFailures": apply_failures,
        }
        write_report(summary)
        print(json.dumps({k:v for k,v in summary.items() if k != "rows"}, ensure_ascii=False, separators=(",", ":")))
        return 1 if apply_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
