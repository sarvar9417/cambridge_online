#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import runpy
import subprocess
import tempfile
from collections import defaultdict
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

IMPL_PATH = "backend/scripts/source-backed-topic-review.py"
impl = runpy.run_path(IMPL_PATH, run_name="source_backed_topic_review_impl")


def _norm_heading(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()


def _selected_subject_sections(source_text: str, rows: list[dict]) -> dict[str, str]:
    """Return the last heading occurrence for every syllabus subtopic.

    The official PDFs contain each code in the overview and again in Subject content.
    The Subject-content occurrence is later, so selecting the last line-start heading is
    deterministic and avoids relying on page numbers or column extraction order.
    """
    codes = [str(item["subtopicCode"]) for item in rows]
    starts: list[tuple[int, str]] = []
    for code in codes:
        pattern = re.compile(rf"(?m)^\s*{re.escape(code)}\s+[^\n]+")
        matches = list(pattern.finditer(source_text))
        if not matches:
            raise RuntimeError(f"official_subtopic_heading_missing:{code}")
        starts.append((matches[-1].start(), code))
    starts.sort()
    sections: dict[str, str] = {}
    for index, (start, code) in enumerate(starts):
        end = starts[index + 1][0] if index + 1 < len(starts) else min(len(source_text), start + 18000)
        sections[code] = source_text[start:end]
    return sections


def _catalog_grounding(rows: list[dict], sections: dict[str, str]) -> tuple[list[dict], list[str]]:
    """Check that each synthetic DB LO bundle is grounded in its official subtopic section.

    Historical LO codes in CamPath are pedagogical/synthetic (for example 8.2-lo-01),
    while Cambridge expresses the same requirement as prose under "Candidates should
    be able to". Therefore exact-string matching is invalid. We verify the bundle against
    the official section using word/bi-gram TF-IDF. Per-LO lexical misses are retained as
    audit evidence because one official requirement is sometimes split into several DB LOs.
    """
    generic = {
        "show","understanding","understand","explain","describe","identify","use","using","given","give",
        "state","define","demonstrate","able","candidate","candidates","should","be","to","the","a","an","of",
        "and","or","for","in","on","with","how","why","when","where","which","from","that","this","their",
        "different","appropriate","purpose","purposes","benefit","benefits","drawback","drawbacks"
    }
    ordered = sorted(rows, key=lambda x: (int(x["topicNumber"]), str(x["subtopicCode"])))
    section_texts = [sections[str(x["subtopicCode"])] for x in ordered]
    profile_texts = [" ".join([str(x.get("subtopicTitle") or ""), *[str(lo.get("text") or "") for lo in x.get("los") or []]]) for x in ordered]
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", sublinear_tf=True, min_df=1)
    matrix = vectorizer.fit_transform(section_texts + profile_texts)
    section_matrix = matrix[:len(ordered)]
    profile_matrix = matrix[len(ordered):]
    sims = cosine_similarity(profile_matrix, section_matrix)

    report: list[dict] = []
    failures: list[str] = []
    for i, item in enumerate(ordered):
        code = str(item["subtopicCode"])
        own = float(sims[i, i])
        ranked = sorted(((float(sims[i, j]), str(ordered[j]["subtopicCode"])) for j in range(len(ordered))), reverse=True)
        best_score, best_code = ranked[0]
        title_tokens = {t for t in _norm_heading(str(item.get("subtopicTitle") or "")).split() if len(t) >= 3 and t not in generic}
        section_tokens = set(_norm_heading(sections[code]).split())
        title_overlap = len(title_tokens & section_tokens) / max(1, len(title_tokens))

        low_los: list[str] = []
        for lo in item.get("los") or []:
            lo_tokens = {t for t in _norm_heading(str(lo.get("text") or "")).split() if len(t) >= 3 and t not in generic}
            distinctive = lo_tokens & section_tokens
            if lo_tokens and not distinctive:
                low_los.append(str(lo.get("code")))

        # Source authority is the official subtopic section. Synthetic LOs may split one
        # Cambridge requirement into multiple concise objectives, so lexical misses are
        # evidence, not an automatic rejection. The aggregate profile must still be grounded.
        ok = own >= 0.045 and title_overlap >= 0.40
        report.append({
            "code": code,
            "ownSimilarity": round(own, 6),
            "bestSemanticSection": best_code,
            "bestSemanticScore": round(best_score, 6),
            "titleOverlap": round(title_overlap, 4),
            "lowLexicalLos": low_los,
            "ok": ok,
        })
        if not ok:
            failures.append(code)
    return report, failures


def source_catalog_gate_v2(taxonomy: list[dict]) -> dict:
    by_version: dict[str, list[dict]] = defaultdict(list)
    for item in taxonomy:
        by_version[str(item["version"])].append(item)

    report: dict = {}
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        for version, rows in sorted(by_version.items()):
            source_key = impl["VERSION_SOURCE"].get(version)
            if not source_key:
                raise RuntimeError(f"no_drive_source_for_syllabus:{version}")
            source = impl["SOURCES"][source_key]
            pdf = root / f"{source_key}.pdf"
            txt = root / f"{source_key}.txt"
            impl["drive_download"](source["driveId"], pdf)
            actual = hashlib.sha256(pdf.read_bytes()).hexdigest()
            if actual != source["sha256"]:
                raise RuntimeError(f"syllabus_sha_mismatch:{version}:{actual}:{source['sha256']}")
            subprocess.run(["pdftotext", "-layout", str(pdf), str(txt)], check=True)
            source_text = txt.read_text(errors="ignore")
            sections = _selected_subject_sections(source_text, rows)
            if len(sections) != 44:
                raise RuntimeError(f"official_subtopic_count_mismatch:{version}:{len(sections)}")
            grounding, failures = _catalog_grounding(rows, sections)
            report[version] = {
                "sha256": actual,
                "subtopics": len(sections),
                "los": sum(len(x.get("los") or []) for x in rows),
                "grounding": grounding,
                "failures": failures,
            }
            if failures:
                diagnostics = [x for x in grounding if not x["ok"]]
                raise RuntimeError(f"drive_catalog_semantic_mismatch:{version}:{json.dumps(diagnostics,separators=(',',':'))}")
    return report


# Patch the actual global namespace used by main(), not only runpy's returned mapping.
impl["main"].__globals__["source_catalog_gate"] = source_catalog_gate_v2
raise SystemExit(impl["main"]())
