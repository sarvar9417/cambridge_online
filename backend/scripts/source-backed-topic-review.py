#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import subprocess
import tempfile
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity

AUDIENCE = "campath-topic-review"
REVIEW_VERSION = "source-backed-taxonomy-review-v1"
SET_BY = "source_review_drive_9618_v1"
RUNNER_URL = os.environ.get("TOPIC_REVIEW_RUNNER_URL", "https://mphmganorvhsnwvhcxyj.supabase.co/functions/v1/topic-review-runner")
APPLY = os.environ.get("TOPIC_REVIEW_APPLY", "0") == "1"
REPORT_DIR = Path(os.environ.get("TOPIC_REVIEW_REPORT_DIR", "artifacts/topic-review"))

SOURCES = {
    "2021-2023": {"driveId": "15_D_UaglzxqqK2NGAHboy_K-T3HbTUW5", "sha256": "978df926e9d4f6d1756105d321c1af5dd4bb9672207e5b268206e10133dfa2e5"},
    "2024-2025": {"driveId": "1dFGZ2_wOYyQhcvpdVa0IN2x9bV3WQ1ZG", "sha256": "2f7deb2d66ca68bf30f517ce20681f0dd7af96f2c44aa775df9da21c0188d817"},
    "2026": {"driveId": "1JzFMyhPaSvfyvlII1yXF1Av2uDHGtx6p", "sha256": "bf1b77a2b765d10eb4b005ecae0412add35cf6113ba3218a517893abfc9f2470"},
}
VERSION_SOURCE = {"2021-2023": "2021-2023", "2024-2025": "2024-2025", "2026-2028": "2026"}

# High-signal concepts distilled from the supplied official syllabus and corroborating
# Topical_Keywords docs. They are evidence boosts only; component scope + syllabus
# LO profiles + exam exemplars remain the primary classifier.
KEYWORDS: dict[str, tuple[str, ...]] = {
    "1.1": ("binary", "hexadecimal", "bcd", "ascii", "unicode", "kibibyte", "mebibyte", "two's complement", "twos complement", "overflow"),
    "1.2": ("bitmap", "bitmapped", "vector graphic", "pixel", "colour depth", "color depth", "image resolution", "sampling rate", "sampling resolution", "sound sample", "adc", "dac"),
    "1.3": ("compression", "lossless", "lossy", "run length", "rle", "jpeg", "mp3", "mp4"),
    "2.1": ("network", "lan", "wan", "router", "switch", "ethernet", "ip address", "ipv4", "ipv6", "dns", "www", "internet", "bit streaming", "packet", "topology", "mac address"),
    "3.1": ("ram", "rom", "sram", "dram", "ssd", "hdd", "optical", "storage device", "input device", "output device", "sensor", "embedded system", "laser printer", "inkjet", "touch screen"),
    "3.2": ("logic gate", "truth table", "and gate", "or gate", "xor", "nand", "nor", "logic circuit"),
    "4.1": ("cpu", "processor", "program counter", "memory address register", "memory data register", "current instruction register", "fetch decode execute", "address bus", "data bus", "control bus", "cache"),
    "4.2": ("assembly language", "opcode", "operand", "addressing mode", "immediate addressing", "direct addressing", "indirect addressing", "assembler"),
    "4.3": ("bit manipulation", "logical shift", "arithmetic shift", "cyclic shift", "bit mask", "masking"),
    "5.1": ("operating system", "process management", "memory management", "file management", "interrupt", "user interface", "multitasking"),
    "5.2": ("compiler", "interpreter", "assembler", "language translator", "ide", "debugger", "syntax error"),
    "6.1": ("malware", "virus", "worm", "trojan", "spyware", "firewall", "authentication", "password", "biometric", "security"),
    "6.2": ("validation", "verification", "check digit", "parity", "checksum", "arq", "echo check", "data integrity"),
    "7.1": ("ethics", "copyright", "licence", "license", "open source", "proprietary", "plagiarism", "intellectual property"),
    "8.1": ("database", "entity", "attribute", "primary key", "foreign key", "candidate key", "normalisation", "normalization", "relationship"),
    "8.2": ("dbms", "database management", "data dictionary", "access rights", "query processor", "referential integrity"),
    "8.3": ("sql", "ddl", "dml", "create table", "alter table", "select", "insert", "update", "delete from"),
    "9.1": ("decomposition", "abstraction", "pattern recognition", "computational thinking"),
    "9.2": ("algorithm", "pseudocode", "flowchart", "trace table", "dry run"),
    "10.1": ("data type", "integer", "real", "boolean", "char", "string", "record"),
    "10.2": ("array", "one dimensional", "two dimensional", "1d array", "2d array"),
    "10.3": ("file", "openfile", "readfile", "writefile", "closefile", "endoffile"),
    "10.4": ("abstract data type", "adt", "stack", "queue", "linked list", "pointer", "enqueue", "dequeue", "push", "pop"),
    "11.1": ("variable", "constant", "identifier", "assignment", "input", "output", "programming basics"),
    "11.2": ("selection", "iteration", "if", "case", "while", "repeat", "for loop", "loop construct"),
    "11.3": ("procedure", "function", "parameter", "local variable", "global variable", "scope", "structured programming", "module"),
    "12.1": ("program development life cycle", "development life cycle", "waterfall", "agile", "iterative development", "requirements", "analysis"),
    "12.2": ("structure chart", "state transition", "program design", "modular design", "stepwise refinement"),
    "12.3": ("testing", "test data", "normal data", "abnormal data", "extreme data", "black box", "white box", "maintenance", "corrective", "adaptive", "perfective"),
    "13.1": ("user-defined data type", "enumerated", "enum", "pointer type", "set type", "record type"),
    "13.2": ("file organisation", "file organization", "sequential access", "direct access", "random access", "serial file", "index sequential"),
    "13.3": ("floating point", "mantissa", "exponent", "normalise", "normalize", "normalised", "normalized"),
    "14.1": ("protocol", "tcp", "udp", "http", "https", "ftp", "smtp", "pop3", "imap", "protocol stack"),
    "14.2": ("circuit switching", "packet switching", "packet switched", "circuit switched"),
    "15.1": ("risc", "cisc", "parallel processing", "simd", "mimd", "virtual machine", "virtualisation", "virtualization", "processor"),
    "15.2": ("boolean algebra", "karnaugh", "de morgan", "flip flop", "flip-flop", "logic circuit", "sum of products", "sop"),
    "16.1": ("operating system", "process scheduling", "round robin", "paging", "segmentation", "virtual memory", "deadlock", "process state"),
    "16.2": ("compiler", "lexical analysis", "syntax analysis", "semantic analysis", "code generation", "optimisation", "optimization", "translation software"),
    "17.1": ("encryption", "symmetric", "asymmetric", "public key", "private key", "digital certificate", "tls", "ssl", "digital signature"),
    "18.1": ("artificial intelligence", "machine learning", "neural network", "deep learning", "expert system", "a*", "dijkstra", "heuristic"),
    "19.1": ("algorithm", "big o", "binary search", "linear search", "bubble sort", "insertion sort", "binary tree", "linked list", "stack", "queue", "hash table", "enqueue", "dequeue", "push", "pop"),
    "19.2": ("recursion", "recursive", "base case", "recursive call"),
    "20.1": ("object oriented", "object-oriented", "class", "object", "constructor", "inheritance", "polymorphism", "encapsulation", "declarative programming"),
    "20.2": ("exception", "try", "catch", "file processing", "file handling", "readline", "writeline", "end of file", "eof"),
}


def oidc_token() -> str:
    base = os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]
    sep = "&" if "?" in base else "?"
    request = urllib.request.Request(base + sep + "audience=" + AUDIENCE,
        headers={"Authorization": "bearer " + os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)["value"]


def runner(action: str, payload: dict | None = None, timeout: int = 180) -> dict:
    request = urllib.request.Request(RUNNER_URL,
        data=json.dumps({"action": action, **(payload or {})}, ensure_ascii=False).encode(), method="POST",
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + oidc_token()})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            data = json.load(response)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"runner_http_{exc.code}:{exc.read().decode(errors='ignore')[:4000]}") from exc
    if not data.get("ok"):
        raise RuntimeError("runner_error:" + str(data.get("error")))
    return data


def norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()


def compact(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (text or "").lower())


def question_text(row: dict) -> str:
    # Mark scheme is especially useful for terse stems such as "Complete the table".
    return "\n".join(filter(None, [row.get("stem", ""), row.get("context", ""), row.get("markScheme", "")]))


def allowed_topic(component: int, topic: int) -> bool:
    return ((component == 1 and 1 <= topic <= 8) or
            (component == 2 and 9 <= topic <= 12) or
            (component == 3 and 13 <= topic <= 20) or
            (component == 4 and 19 <= topic <= 20))


def drive_download(file_id: str, path: Path) -> None:
    url = f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t"
    request = urllib.request.Request(url, headers={"User-Agent": "CamPathTopicReview/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response, path.open("wb") as handle:
        while chunk := response.read(1024 * 1024): handle.write(chunk)
    if path.stat().st_size < 10000: raise RuntimeError(f"source_download_too_small:{file_id}:{path.stat().st_size}")


def fetch_all(status: str) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while True:
        page = runner("questions", {"status": status, "offset": offset, "limit": 250}, timeout=180)["data"]
        batch = page.get("rows") or []
        rows.extend(batch)
        if len(batch) < 250: break
        offset += len(batch)
    return rows


def source_catalog_gate(taxonomy: list[dict]) -> dict:
    by_version: dict[str, list[dict]] = defaultdict(list)
    for item in taxonomy: by_version[item["version"]].append(item)
    report: dict = {}
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        for version, rows in sorted(by_version.items()):
            source_key = VERSION_SOURCE.get(version)
            if not source_key: raise RuntimeError(f"no_drive_source_for_syllabus:{version}")
            source = SOURCES[source_key]
            pdf = root / f"{source_key}.pdf"
            txt = root / f"{source_key}.txt"
            drive_download(source["driveId"], pdf)
            actual = hashlib.sha256(pdf.read_bytes()).hexdigest()
            if actual != source["sha256"]: raise RuntimeError(f"syllabus_sha_mismatch:{version}:{actual}:{source['sha256']}")
            subprocess.run(["pdftotext", "-layout", str(pdf), str(txt)], check=True)
            source_compact = compact(txt.read_text(errors="ignore"))
            missing_subtopics: list[str] = []
            missing_los: list[str] = []
            checked_los = 0
            for item in rows:
                # Code + title is enough for subtopic structure; punctuation/case is normalized away.
                if compact(item["subtopicCode"] + " " + item["subtopicTitle"]) not in source_compact:
                    # Some syllabus headings wrap code/title separately. Fall back to title-only.
                    if compact(item["subtopicTitle"]) not in source_compact:
                        missing_subtopics.append(item["subtopicCode"])
                for lo in item.get("los") or []:
                    checked_los += 1
                    needle = compact(lo["text"])
                    if needle and needle not in source_compact:
                        missing_los.append(lo["code"])
            report[version] = {"sha256": actual, "subtopics": len(rows), "los": checked_los,
                               "missingSubtopics": missing_subtopics, "missingLos": missing_los}
            # Formatting revisions can make a handful of objective strings differ. A missing objective
            # is never silently ignored: it blocks automated apply and is surfaced in the report.
            if missing_subtopics or missing_los:
                raise RuntimeError(f"drive_catalog_mismatch:{version}:subtopics={missing_subtopics}:los={missing_los[:30]}")
    return report


def exact_map(approved: list[dict]) -> dict[str, str]:
    labels: dict[str, set[str]] = defaultdict(set)
    for row in approved:
        key = compact(row.get("stem", ""))
        code = (row.get("currentPrimary") or {}).get("code")
        if len(key) >= 20 and code: labels[key].add(code)
    return {key: next(iter(codes)) for key, codes in labels.items() if len(codes) == 1}


def strong_scores(text: str, allowed: set[str]) -> dict[str, float]:
    t = norm(text)
    scores: dict[str, float] = {}
    for code in allowed:
        terms = KEYWORDS.get(code, ())
        hits = sum(1 for term in terms if norm(term) in t)
        if hits: scores[code] = min(1.0, hits / max(2.0, math.sqrt(max(1, len(terms)))))
    return scores


def train_models(approved: list[dict]):
    models = {}
    for component in (1, 2, 3, 4):
        rows = [r for r in approved if int(r["component"]) == component and (r.get("currentPrimary") or {}).get("code")]
        texts = [question_text(r) for r in rows]
        labels = [(r.get("currentPrimary") or {})["code"] for r in rows]
        if len(set(labels)) < 2: raise RuntimeError(f"insufficient_component_labels:{component}")
        word = TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_df=0.995, sublinear_tf=True, max_features=50000)
        char = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=1, sublinear_tf=True, max_features=70000)
        xw = word.fit_transform(texts); xc = char.fit_transform(texts)
        mw = LogisticRegression(max_iter=2500, class_weight="balanced", C=4.0, random_state=9618).fit(xw, labels)
        mc = LogisticRegression(max_iter=2500, class_weight="balanced", C=3.0, random_state=9618).fit(xc, labels)
        models[component] = (word, mw, char, mc)
    return models


def profile_models(taxonomy: list[dict], all_rows: list[dict]):
    # Build one semantic profile per historical-syllabus subtopic using title + official LO text + keyword hints.
    profiles = {}
    for version in sorted({x["version"] for x in taxonomy}):
        items = [x for x in taxonomy if x["version"] == version]
        for component in (1, 2, 3, 4):
            scoped = [x for x in items if allowed_topic(component, int(x["topicNumber"]))]
            if not scoped: continue
            codes = [x["subtopicCode"] for x in scoped]
            ptexts = []
            for x in scoped:
                lo_text = " ".join(lo["text"] for lo in x.get("los") or [])
                hints = " ".join(KEYWORDS.get(x["subtopicCode"], ()))
                ptexts.append(" ".join([x["subtopicTitle"], lo_text, hints, hints]))
            corpus = ptexts + [question_text(r) for r in all_rows if r["syllabusVersion"] == version and int(r["component"]) == component]
            vec = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=1, max_features=60000)
            matrix = vec.fit_transform(corpus)
            profiles[(version, component)] = (codes, vec, matrix[:len(ptexts)])
    return profiles


def predict_subtopic(row: dict, models, profiles, exact: dict[str, str], taxonomy_by_version: dict[str, list[dict]]) -> dict:
    component = int(row["component"]); version = row["syllabusVersion"]; text = question_text(row)
    allowed_items = [x for x in taxonomy_by_version[version] if allowed_topic(component, int(x["topicNumber"]))]
    allowed = {x["subtopicCode"] for x in allowed_items}
    current = (row.get("currentPrimary") or {}).get("code")

    key = compact(row.get("stem", ""))
    if key in exact and exact[key] in allowed:
        code = exact[key]
        return {"code": code, "confidence": 0.99, "tier": "exact-approved-stem", "margin": 1.0,
                "signals": {"exact": code, "current": current}}

    word, mw, char, mc = models[component]
    pw = dict(zip(mw.classes_, mw.predict_proba(word.transform([text]))[0]))
    pc = dict(zip(mc.classes_, mc.predict_proba(char.transform([text]))[0]))
    pcodes, pvec, pmat = profiles[(version, component)]
    sims = cosine_similarity(pvec.transform([text]), pmat)[0]
    ps = dict(zip(pcodes, sims))
    ks = strong_scores(text, allowed)

    combined: dict[str, float] = {}
    for code in allowed:
        # Current mapping is deliberately only a 3% prior.
        combined[code] = 0.39 * pw.get(code, 0.0) + 0.29 * pc.get(code, 0.0) + 0.22 * ps.get(code, 0.0) + 0.07 * ks.get(code, 0.0) + 0.03 * (1.0 if current == code else 0.0)
    ranked = sorted(combined.items(), key=lambda x: (-x[1], x[0]))
    code, score = ranked[0]; second_code, second = ranked[1] if len(ranked) > 1 else ("", 0.0)
    margin = score - second
    winners = [max(pw, key=pw.get), max(pc, key=pc.get), max(ps, key=ps.get)]
    keyword_winner = max(ks, key=ks.get) if ks else None
    consensus = sum(1 for winner in winners if winner == code)
    if keyword_winner == code and ks.get(code, 0) >= 0.35: consensus += 1

    if consensus >= 3 and margin >= 0.055:
        conf, tier = 0.95, "ensemble-consensus"
    elif consensus >= 2 and margin >= 0.035:
        conf, tier = 0.91, "ensemble-majority"
    elif margin >= 0.075 and code in winners:
        conf, tier = 0.88, "clear-margin"
    elif current == code and consensus >= 2 and margin >= 0.018:
        conf, tier = 0.86, "source-confirmed-prior"
    elif keyword_winner == code and ks.get(code, 0) >= 0.65 and margin >= 0.015:
        conf, tier = 0.90, "strong-syllabus-keyword"
    else:
        conf, tier = 0.79, "ambiguous"
    return {"code": code, "confidence": conf, "tier": tier, "margin": round(float(margin), 6),
            "signals": {"word": max(pw, key=pw.get), "char": max(pc, key=pc.get), "syllabus": max(ps, key=ps.get),
                        "keyword": keyword_winner, "current": current, "second": second_code,
                        "score": round(float(score), 6), "secondScore": round(float(second), 6)}}


def choose_los(row: dict, subtopic_code: str, taxonomy_by_version: dict[str, list[dict]]) -> list[dict]:
    version = row["syllabusVersion"]
    item = next(x for x in taxonomy_by_version[version] if x["subtopicCode"] == subtopic_code)
    los = item.get("los") or []
    if not los: raise RuntimeError(f"subtopic_has_no_los:{version}:{subtopic_code}")
    if len(los) == 1: return [{"code": los[0]["code"], "confidence": 0.99}]
    text = question_text(row)
    objective_texts = [lo["text"] for lo in los]
    vec = TfidfVectorizer(ngram_range=(1, 2), analyzer="word", sublinear_tf=True)
    matrix = vec.fit_transform(objective_texts + [text])
    sims = cosine_similarity(matrix[-1], matrix[:-1])[0]
    ranked = sorted(zip(los, sims), key=lambda x: (-x[1], x[0]["code"]))
    current_codes = {x["code"] for x in (row.get("currentLos") or []) if x.get("code")}
    selected: list[tuple[dict, float]] = [ranked[0]]
    # Preserve a source-compatible current secondary LO when it remains among the strongest candidates.
    top_score = float(ranked[0][1])
    for lo, score in ranked[1:3]:
        if lo["code"] in current_codes and float(score) >= max(0.01, top_score * 0.72): selected.append((lo, score))
    result = []
    for idx, (lo, score) in enumerate(selected):
        if lo["code"] in current_codes and idx == 0: conf = 0.92
        elif idx == 0: conf = 0.87
        else: conf = 0.83
        result.append({"code": lo["code"], "confidence": conf, "similarity": round(float(score), 6)})
    return result


def cross_validate(approved: list[dict], taxonomy: list[dict]) -> dict:
    # Year-held-out evaluation prevents same-series variants from making the benchmark look artificially easy.
    years = sorted({int(r["year"]) for r in approved})
    results = []
    for year in years:
        train = [r for r in approved if int(r["year"]) != year]
        test = [r for r in approved if int(r["year"]) == year]
        if not train or not test: continue
        models = train_models(train)
        profiles = profile_models(taxonomy, train + test)
        by_version = defaultdict(list)
        for x in taxonomy: by_version[x["version"]].append(x)
        ex = exact_map(train)
        correct = 0; total = 0; by_component = defaultdict(lambda: [0, 0])
        for row in test:
            actual = (row.get("currentPrimary") or {}).get("code")
            if not actual: continue
            pred = predict_subtopic(row, models, profiles, ex, by_version)["code"]
            total += 1; by_component[int(row["component"])][1] += 1
            if pred == actual: correct += 1; by_component[int(row["component"])][0] += 1
        results.append({"year": year, "correct": correct, "total": total,
                        "accuracy": round(correct / total, 4) if total else None,
                        "components": {str(c): {"correct": v[0], "total": v[1], "accuracy": round(v[0]/v[1],4) if v[1] else None} for c,v in sorted(by_component.items())}})
    total = sum(x["total"] for x in results); correct = sum(x["correct"] for x in results)
    return {"years": results, "correct": correct, "total": total, "accuracy": round(correct/total,4) if total else None}


def main() -> int:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    taxonomy = runner("taxonomy", timeout=120)["data"]
    approved = fetch_all("approved")
    review = fetch_all("needs_review")
    if len(approved) != 1241 or len(review) != 1744 or len(approved) + len(review) != 2985:
        raise RuntimeError(f"corpus_gate_failed:approved={len(approved)}:review={len(review)}")

    source_gate = source_catalog_gate(taxonomy)
    by_version: dict[str, list[dict]] = defaultdict(list)
    for x in taxonomy: by_version[x["version"]].append(x)
    models = train_models(approved)
    profiles = profile_models(taxonomy, approved + review)
    ex = exact_map(approved)
    cv = cross_validate(approved, taxonomy)

    proposals = []
    ambiguous = []
    changed_subtopic = 0; changed_lo = 0
    tier_counts = Counter()
    for row in review:
        sub = predict_subtopic(row, models, profiles, ex, by_version)
        los = choose_los(row, sub["code"], by_version)
        old_code = (row.get("currentPrimary") or {}).get("code")
        old_los = sorted(x["code"] for x in (row.get("currentLos") or []) if x.get("code"))
        new_los = sorted(x["code"] for x in los)
        if old_code != sub["code"]: changed_subtopic += 1
        if old_los != new_los: changed_lo += 1
        tier_counts[sub["tier"]] += 1
        proposal = {
            "questionId": row["id"], "sourceRef": row["sourceRef"], "oldHash": row["oldHash"],
            "subtopicCode": sub["code"], "subtopicConfidence": sub["confidence"],
            "los": [{"code": x["code"], "confidence": x["confidence"]} for x in los],
            "evidence": {"tier": sub["tier"], "margin": sub["margin"], "signals": sub["signals"],
                         "oldSubtopic": old_code, "oldLos": old_los,
                         "loEvidence": [{"code": x["code"], "similarity": x.get("similarity")} for x in los],
                         "syllabusVersion": row["syllabusVersion"], "sourceRef": row["sourceRef"]},
        }
        proposals.append(proposal)
        if sub["confidence"] < 0.80 or any(x["confidence"] < 0.80 for x in proposal["los"]):
            ambiguous.append({**proposal, "stem": row.get("stem", ""), "context": row.get("context", ""), "markScheme": row.get("markScheme", "")[:1200]})

    summary = {
        "reviewVersion": REVIEW_VERSION, "applyRequested": APPLY,
        "corpus": {"approvedBefore": len(approved), "needsReviewBefore": len(review), "total": len(approved)+len(review)},
        "sourceCatalogGate": source_gate, "crossValidation": cv,
        "proposal": {"rows": len(proposals), "ambiguous": len(ambiguous), "changedSubtopic": changed_subtopic,
                     "changedLo": changed_lo, "tiers": dict(sorted(tier_counts.items()))},
    }
    (REPORT_DIR / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    (REPORT_DIR / "ambiguous.json").write_text(json.dumps(ambiguous, indent=2, ensure_ascii=False))
    (REPORT_DIR / "proposals.json").write_text(json.dumps(proposals, indent=2, ensure_ascii=False))
    print(json.dumps(summary, ensure_ascii=False, separators=(",", ":")))

    # Never partially approve an ambiguous corpus. Refine rules/evidence first.
    if ambiguous:
        print(json.dumps({"event": "apply_blocked", "ambiguous": len(ambiguous)}, separators=(",", ":")))
        return 2
    if not APPLY:
        print(json.dumps({"event": "dry_run_pass", "rows": len(proposals)}, separators=(",", ":")))
        return 0

    applied = {"updated": 0, "changedSubtopic": 0, "changedLo": 0}
    for start in range(0, len(proposals), 100):
        manifest = {"reviewVersion": REVIEW_VERSION, "sources": SOURCES, "rows": proposals[start:start+100]}
        result = runner("apply", {"manifest": manifest}, timeout=240)["result"]
        for key in applied: applied[key] += int(result.get(key, 0))
        print(json.dumps({"event": "batch_applied", "start": start, "result": result}, ensure_ascii=False, separators=(",", ":")))
    summary["applied"] = applied
    (REPORT_DIR / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    print(json.dumps({"event": "apply_complete", **applied}, ensure_ascii=False, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
