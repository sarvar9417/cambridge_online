#!/usr/bin/env python3
"""Source-backed full Cambridge 0478 corpus backfill.

The public Drive year folders are inventories, not trusted database rows. This
script discovers only canonical QP/MS names, audits pairing before writes,
stages each PDF through the OIDC Supabase runner (which verifies PDF bytes and
SHA-256), extracts QP/MS text from the official sources, assigns the exact
syllabus-version taxonomy, and applies each paper transactionally.
"""
from __future__ import annotations

import copy
import json
import math
import os
import re
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

import gdown
import requests
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

AUDIENCE = "cambridge-corpus"
RUNNER_URL = os.environ.get(
    "CORPUS_RUNNER_URL",
    "https://mphmganorvhsnwvhcxyj.supabase.co/functions/v1/corpus-runner",
)
CATALOGS = (
    Path("backend/src/database/catalogs/0478-2015-2022.json"),
    Path("backend/src/database/catalogs/0478-2023-2025.json"),
)
YEAR_FOLDERS = {
    2026: "1F9SRtj85iO7ciaE2B5hIKrTR66Czn5l0",
    2025: "11BB4bIy6cU1Eng2qQOJx6lK8Um6-dEOY",
    2024: "1SdW1OU_2PXzJQa2Jxk65m7i6fkFjsWqq",
    2023: "1Tu7aQgae0tYPC-1FswFa9gBqErRptxjS",
    2022: "14im3JAnbiotYym_4NR9eXKm2Zlbq3hk_",
    2021: "14iICm1dvph7tQ3v4QhqnMcvZNBvb6-qz",
    2020: "14hq13lT9f3wQV2Nvy6FA9RJWo5rH0nUI",
    2019: "14hYkXfGYZmkx3Q3SvsGfykEThKc3UTCa",
    2018: "14eMQSlVTocCThPIvdozDwUQht3xp8pVI",
    2017: "13aLe-ZUW0gSM8-XTHsolbsdQGSoxNyoO",
    2016: "135phMyYa8JdMdYgnMMT7GsEgL7aSTg6V",
    2015: "12hwvLjzE8n2DVuaS8H1yEwPinZTUAobY",
}
CANON = re.compile(r"^0478_([msw])(\d{2})_(qp|ms)_(11|12|13|21|22|23)\.pdf$", re.I)
SERIES = {"m": "FM", "s": "MJ", "w": "ON"}
SPECIFIC_RULES = [
    (r"\b(logic gate|truth table|boolean|nand|nor|xor)\b", ("logic", "boolean"), 0.28),
    (r"\b(database|sql|primary key|foreign key|query)\b", ("database",), 0.28),
    (r"\b(array|index|indices)\b", ("array",), 0.24),
    (r"\b(file handling|text file|openfile|readfile|writefile|closefile)\b", ("file",), 0.25),
    (r"\b(flowchart|pseudocode|trace table|test data|validation|verification|algorithm)\b", ("algorithm", "problem-solving", "pseudocode", "flowchart"), 0.22),
    (r"\b(binary|denary|hexadecimal|two.?s complement)\b", ("binary", "hexadecimal", "number system"), 0.25),
    (r"\b(compression|jpeg|mp3|sampling|sample rate|colour depth|resolution)\b", ("storage", "compression", "sound", "image"), 0.20),
    (r"\b(parity|check digit|checksum|arq|error detection)\b", ("error", "transmission", "data storage"), 0.23),
    (r"\b(encryption|symmetric|asymmetric|public key|private key)\b", ("encryption", "security"), 0.24),
    (r"\b(malware|phishing|pharming|firewall|proxy|cyber)\b", ("security", "cyber"), 0.23),
    (r"\b(fetch.execute|program counter|memory address register|mar\b|mdr\b|cir\b|von neumann)\b", ("architecture",), 0.25),
    (r"\b(sensor|actuator|input device|output device|printer|scanner|barcode|qr code)\b", ("input", "output", "device"), 0.20),
    (r"\b(router|network interface|mac address|ip address|wi.fi|ethernet)\b", ("network", "internet"), 0.20),
    (r"\b(compiler|interpreter|assembler|high.level|low.level|ide\b)\b", ("language", "translator", "ide"), 0.24),
    (r"\b(operating system|interrupt)\b", ("operating", "software", "interrupt"), 0.24),
    (r"\b(robot|robotics)\b", ("robot",), 0.25),
    (r"\b(artificial intelligence|machine learning|expert system)\b", ("artificial intelligence",), 0.25),
]


def catalog_payloads() -> list[dict[str, Any]]:
    """Return exact non-overlapping 0478 syllabus families used by this corpus.

    Cambridge keeps the 2026-2028 topic/subtopic structure aligned with the
    2023-2025 family. We clone that audited catalog and apply the syllabus-core
    wording updates that affect our searchable LO text rather than mapping 2026
    papers to the expired 2023-2025 syllabus row.
    """
    historical = json.loads(CATALOGS[0].read_text(encoding="utf-8"))
    revised = json.loads(CATALOGS[1].read_text(encoding="utf-8"))
    current = copy.deepcopy(revised)
    current.update({"versionLabel": "2026-2028", "validFrom": 2026, "validTo": 2028, "isActive": False})

    objective_updates = {
        "1.1-lo-06": "Use the two’s complement number system to represent positive and negative 8-bit binary integers",
        "3.1-lo-02": "(a) Understand the purpose of the components in a CPU, in a computer that has a Von Neumann architecture. (b) Describe the process of the fetch–decode–execute (FDE) cycle including the role of each component in the process",
    }
    seen: set[str] = set()
    for topic in current.get("topics", []):
        for subtopic in topic.get("subtopics", []):
            for lo in subtopic.get("learningObjectives", []):
                code = str(lo.get("code", ""))
                if code in objective_updates:
                    lo["text"] = objective_updates[code]
                    seen.add(code)
    if seen != set(objective_updates):
        raise RuntimeError(f"2026_catalog_objective_update_missing:{sorted(set(objective_updates) - seen)}")
    return [historical, revised, current]


def oidc_token() -> str:
    req_url = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL")
    req_token = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
    if not req_url or not req_token:
        raise RuntimeError("GitHub Actions OIDC environment is unavailable")
    r = requests.get(req_url, params={"audience": AUDIENCE}, headers={"Authorization": f"Bearer {req_token}"}, timeout=20)
    r.raise_for_status()
    return r.json()["value"]


def runner(action: str, **payload: Any) -> dict[str, Any]:
    token = oidc_token()
    r = requests.post(
        RUNNER_URL,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"action": action, **payload},
        timeout=95,
    )
    try:
        body = r.json()
    except Exception:
        raise RuntimeError(f"runner_{action}_{r.status_code}:{r.text[:1200]}")
    if not r.ok or body.get("ok") is False:
        raise RuntimeError(f"runner_{action}_{r.status_code}:{json.dumps(body)[:1800]}")
    return body


def discover_manifest() -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    identities: dict[tuple[Any, ...], str] = {}
    for folder_year, folder_id in YEAR_FOLDERS.items():
        url = f"https://drive.google.com/drive/folders/{folder_id}"
        entries = gdown.download_folder(url=url, skip_download=True, quiet=True, remaining_ok=True) or []
        for entry in entries:
            name = Path(str(entry.path)).name
            m = CANON.fullmatch(name)
            if not m:
                continue
            series_letter, yy, kind, paper = m.groups()
            year = 2000 + int(yy)
            if year != folder_year:
                raise RuntimeError(f"year_folder_mismatch:{folder_year}:{name}")
            component, variant = int(paper[0]), int(paper[1])
            item = {
                "year": year,
                "series": SERIES[series_letter.lower()],
                "component": component,
                "variant": variant,
                "kind": kind.upper(),
                "filename": name.lower(),
                "source_url": f"https://drive.google.com/file/d/{entry.id}/view?usp=sharing",
            }
            identity = (year, item["series"], component, variant, item["kind"])
            if identity in identities:
                raise RuntimeError(f"duplicate_canonical_source:{identity}:{identities[identity]}:{name}")
            identities[identity] = name
            found.append(item)
    found.sort(key=lambda x: (x["year"], x["series"], x["component"], x["variant"], x["kind"]))
    return found


def audit_pairs(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[int, str, int, int], dict[str, dict[str, Any]]] = defaultdict(dict)
    for item in items:
        grouped[(item["year"], item["series"], item["component"], item["variant"])][item["kind"]] = item
    bad = {key: sorted(value) for key, value in grouped.items() if set(value) != {"QP", "MS"}}
    if bad:
        raise RuntimeError(f"unpaired_canonical_sources:{json.dumps(bad, sort_keys=True)}")
    return [{"key": key, "qp": value["QP"], "ms": value["MS"]} for key, value in sorted(grouped.items())]


def batches(values: list[Any], size: int):
    for i in range(0, len(values), size):
        yield values[i:i + size]


def tfidf_scores(query: str, docs: list[str]) -> list[float]:
    if not docs:
        return []
    corpus = docs + [query]
    try:
        mat = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=12000).fit_transform(corpus)
        return cosine_similarity(mat[-1], mat[:-1]).ravel().tolist()
    except ValueError:
        return [0.0] * len(docs)


def title_rule_bonus(text: str, title: str) -> float:
    lower, t = text.lower(), title.lower()
    bonus = 0.0
    for pattern, title_terms, weight in SPECIFIC_RULES:
        if re.search(pattern, lower) and any(term in t for term in title_terms):
            bonus = max(bonus, weight)
    title_tokens = [x for x in re.findall(r"[a-z]{4,}", t) if x not in {"types", "methods", "concepts", "systems", "computer", "data"}]
    hits = sum(1 for tok in set(title_tokens) if tok in lower)
    return min(0.30, max(bonus, hits * 0.055))


def classify(text: str, coverage: dict[str, Any]) -> dict[str, Any]:
    subtopics = coverage.get("subtopics") or []
    los = coverage.get("los") or []
    by_sub: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for lo in los:
        by_sub[str(lo["subtopic"])].append(lo)
    docs = []
    for sub in subtopics:
        lo_text = " ".join(str(x.get("text", "")) for x in by_sub.get(str(sub["code"]), []))
        docs.append(f"{sub['title']} {lo_text}")
    scores = tfidf_scores(text, docs)
    adjusted = []
    for idx, sub in enumerate(subtopics):
        adjusted.append((scores[idx] if idx < len(scores) else 0.0) + title_rule_bonus(text, str(sub["title"])))
    order = sorted(range(len(subtopics)), key=lambda i: adjusted[i], reverse=True)
    if not order:
        raise RuntimeError("coverage_without_subtopics")
    best = order[0]
    second = adjusted[order[1]] if len(order) > 1 else 0.0
    raw = max(0.0, adjusted[best])
    margin = max(0.0, raw - second)
    confidence = min(0.94, 0.53 + 0.34 * min(1.0, raw) + 0.16 * min(1.0, margin * 4.0))
    if title_rule_bonus(text, str(subtopics[best]["title"])) >= 0.23:
        confidence = max(confidence, 0.80)
    chosen = subtopics[best]
    candidates = by_sub.get(str(chosen["code"]), [])
    lo_docs = [str(x.get("text", "")) for x in candidates]
    lo_scores = tfidf_scores(text, lo_docs)
    lo_idx = max(range(len(candidates)), key=lambda i: lo_scores[i] if i < len(lo_scores) else 0.0) if candidates else None
    if lo_idx is None:
        raise RuntimeError(f"subtopic_without_lo:{chosen['code']}")
    lo_score = lo_scores[lo_idx] if lo_idx < len(lo_scores) else 0.0
    lo_conf = min(0.93, max(0.50, 0.52 + 0.42 * lo_score))
    return {
        "subtopic": str(chosen["code"]),
        "lo": str(candidates[lo_idx]["code"]),
        "confidence": round(confidence, 4),
        "lo_confidence": round(lo_conf, 4),
        "method": "0478_syllabus_semantic_v1" if confidence < 0.80 else "0478_rule_semantic_v1",
    }


def answer_kind(stem: str) -> str:
    s = stem.lower()
    if re.search(r"\b(draw|complete).{0,35}(logic circuit|flowchart|diagram)\b|\blogic circuit\b", s):
        return "diagram"
    if re.search(r"\b(trace table|truth table|complete the table|table below)\b", s):
        return "table"
    if re.search(r"\bpseudocode\b|\bwrite an algorithm\b|\bcomplete the algorithm\b", s):
        return "pseudocode"
    if re.search(r"\bprogram code\b|\bwrite code\b", s):
        return "code"
    return "text"


def main() -> int:
    report: dict[str, Any] = {"started_at": time.time(), "manifest": {}, "papers": [], "failures": []}
    report["catalogs"] = []
    for catalog in catalog_payloads():
        version = str(catalog.get("versionLabel", "unknown"))
        print(f"[0478] importing/checking syllabus catalog {version}", flush=True)
        report["catalogs"].append(runner("catalog", catalog=catalog).get("result"))

    manifest = discover_manifest()
    pairs = audit_pairs(manifest)
    report["manifest"] = {"canonical_sources": len(manifest), "paired_papers": len(pairs), "years": sorted({x["year"] for x in manifest})}
    print(f"[0478] canonical sources={len(manifest)} paired papers={len(pairs)}", flush=True)

    for batch_no, batch in enumerate(batches(manifest, 8), 1):
        print(f"[0478] stage batch {batch_no}", flush=True)
        runner("stage", sources=batch)

    boot = runner("bootstrap", syllabus_code="0478", year_from=2015, year_to=2026)["data"]
    sources = boot.get("sources") or []
    coverage_all = boot.get("coverage") or []
    coverage_by_key = {(str(x["syllabus_id"]), int(x["component"])): x for x in coverage_all}
    print(f"[0478] un-ingested paper pairs={len(sources)}", flush=True)

    limit = int(os.environ.get("BACKFILL_LIMIT", "0") or "0")
    if limit > 0:
        sources = sources[:limit]
    for idx, src in enumerate(sources, 1):
        label = f"{src['year']}/{src['series']}/{src['component']}{src['variant']}"
        row_report: dict[str, Any] = {"paper": label, "status": "started"}
        try:
            print(f"[0478] {idx}/{len(sources)} extract {label}", flush=True)
            extracted = runner("extract", qp_url=src["qp_url"], ms_url=src["ms_url"])
            rows = extracted.get("rows") or []
            expected = int(src.get("expected_marks") or 0)
            actual = int(extracted.get("total") or 0)
            missing = extracted.get("missing") or []
            if not rows or actual != expected or missing:
                raise RuntimeError(f"source_extract_gate:rows={len(rows)} marks={actual}/{expected} missing={missing}")
            coverage = coverage_by_key.get((str(src["syllabus_id"]), int(src["component"])))
            if not coverage:
                raise RuntimeError("coverage_missing_for_source")
            out_rows = []
            low = 0
            for row in rows:
                stem = str(row.get("stem") or "").strip()
                guidance = str(row.get("guidance") or "").strip()
                taxonomy = classify(stem + "\n" + guidance, coverage)
                if float(taxonomy["confidence"]) < 0.72:
                    low += 1
                out_rows.append({
                    "path": row["path"], "marks": int(row["marks"]), "stem": stem,
                    "guidance": guidance, "answer_kind": answer_kind(stem), **taxonomy,
                })
            result = runner(
                "apply", syllabus_code="0478", qp_id=src["qp_id"], ms_id=src["ms_id"], rows=out_rows,
            ).get("result")
            row_report.update({"status": "applied", "leaves": len(out_rows), "marks": actual, "low_confidence": low, "result": result})
            print(f"[0478] applied {label}: leaves={len(out_rows)} marks={actual} low={low}", flush=True)
        except Exception as exc:
            message = str(exc)
            row_report.update({"status": "failed", "error": message})
            report["failures"].append({"paper": label, "error": message})
            print(f"[0478] FAILED {label}: {message}", file=sys.stderr, flush=True)
        report["papers"].append(row_report)

    report["finished_at"] = time.time()
    report["applied"] = sum(1 for x in report["papers"] if x["status"] == "applied")
    report["failed"] = len(report["failures"])
    Path("0478-backfill-report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("manifest", "applied", "failed")}, indent=2), flush=True)
    return 2 if report["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())