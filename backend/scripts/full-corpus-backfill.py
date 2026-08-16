#!/usr/bin/env python3
from __future__ import annotations

import collections
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

import gdown
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

AUDIENCE = "cambridge-corpus"
ROMANS = {"i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"}
PAGE_REF = re.compile(r"9618/\d+/(?:M/J|O/N)/\d+", re.I)


def drive_id(url: str) -> str:
    m = re.search(r"/d/([^/]+)", url or "") or re.search(r"[?&]id=([^&]+)", url or "")
    if not m:
        raise ValueError("bad_drive_url")
    return m.group(1)


def download(url: str, path: Path) -> None:
    result = gdown.download(id=drive_id(url), output=str(path), quiet=True, fuzzy=True)
    if not result or not path.exists() or path.stat().st_size < 1000:
        raise RuntimeError("download_failed")


def extract_text(pdf: Path, txt: Path) -> None:
    result = subprocess.run(["pdftotext", "-layout", str(pdf), str(txt)], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError("pdftotext:" + result.stderr[-500:])


def norm_path(raw: str) -> str:
    m = re.match(r"^(\d+)(.*)$", raw)
    if not m:
        return raw
    return ".".join([m.group(1), *re.findall(r"\(([^)]+)\)", m.group(2))])


def parse_ms(path: Path) -> list[dict]:
    lines = path.read_text(errors="ignore").splitlines()
    hits: list[dict] = []
    for i, line in enumerate(lines):
        m = re.match(r"^\s*(\d+(?:\([a-z]\))?(?:\([ivx]+\))?)\s+(.*?)\s+(\d{1,2})\s*$", line, re.I)
        if not m:
            continue
        raw, middle, marks = m.group(1), m.group(2), int(m.group(3))
        main = int(re.match(r"\d+", raw).group())
        if not 1 <= main <= 20 or not 1 <= marks <= 20:
            continue
        if "(" not in raw and not re.search(r"[A-Za-z]|mark", middle, re.I):
            continue
        hits.append({"raw_path": raw, "path": norm_path(raw), "marks": marks, "line": i})

    monotonic: list[dict] = []
    highest = 0
    for hit in hits:
        main = int(hit["path"].split(".")[0])
        if main < highest:
            continue
        highest = max(highest, main)
        monotonic.append(hit)
    hits = monotonic

    descendant_mains = {h["path"].split(".")[0] for h in hits if "." in h["path"]}
    hits = [h for h in hits if not ("." not in h["path"] and h["path"] in descendant_mains)]

    out: list[dict] = []
    seen: set[str] = set()
    for h in hits:
        if h["path"] in seen:
            continue
        seen.add(h["path"])
        out.append(h)

    for j, h in enumerate(out):
        end = out[j + 1]["line"] if j + 1 < len(out) else len(lines)
        clean: list[str] = []
        for raw in lines[h["line"]:end]:
            s = re.sub(r"\s+", " ", raw).strip()
            if not s:
                continue
            if "Cambridge International AS & A Level" in s or s.startswith("©") or s == "PUBLISHED":
                continue
            if re.match(r"^9618/\d+", s) or re.match(r"^Page \d+ of \d+", s):
                continue
            if s.startswith("Question") and "Answer" in s and "Marks" in s:
                continue
            clean.append(s)
        h["guidance"] = "\n".join(clean)
    return out


def clean_qp(lines: list[str]) -> str:
    out: list[str] = []
    for raw in lines:
        s = raw.strip()
        if s.startswith("Permission to reproduce items") or s.startswith("To avoid the issue of disclosure") or s.startswith("Cambridge Assessment International Education is part of"):
            break
        if not s or s == "BLANK PAGE" or "DO NOT WRITE IN THIS MARGIN" in s:
            continue
        if s.startswith("© UCLES") or s.startswith("© Cambridge") or PAGE_REF.search(s):
            continue
        if s in ("[Turn over", "[Turn over]") or (s.startswith("*") and s.endswith("*")):
            continue
        if re.fullmatch(r"[,.…\._ ]+", s):
            continue
        printable = sum(1 for ch in s if 32 <= ord(ch) < 127)
        if len(s) >= 12 and printable / len(s) < 0.55:
            continue
        s = re.sub(r"\.{8,}.*$", "", s).strip()
        s = re.sub(r"\s*\[(\d+)\]\s*$", "", s).strip()
        if s:
            out.append(s)
    return "\n".join(out)


def prefixes(valid: set[str]) -> set[str]:
    out: set[str] = set()
    for path in valid:
        bits = path.split(".")
        for i in range(1, len(bits) + 1):
            out.add(".".join(bits[:i]))
    return out


def parse_qp(path: Path, ms_rows: list[dict]) -> dict[str, dict]:
    valid = {x["path"] for x in ms_rows}
    pref = prefixes(valid)
    lines = path.read_text(errors="ignore").splitlines()
    events: list[dict] = []
    current_q: str | None = None
    current_part: str | None = None
    main_re = re.compile(r"^\s*(\d{1,2})\s+(.+)$")
    part_re = re.compile(r"^\s*\(([a-z])\)\s*(.*)$", re.I)
    roman_re = re.compile(r"^\s*\(([ivx]+)\)\s*(.*)$", re.I)

    for i, raw in enumerate(lines):
        if "DO NOT WRITE IN THIS MARGIN" in raw:
            continue
        handled = False
        m = main_re.match(raw)
        if m:
            qq, rest = m.group(1), m.group(2)
            rest_clean = rest.strip()
            qnum = int(qq)
            current = int(current_q) if current_q is not None else 0
            sequential = (current_q is None and qnum == 1) or (current_q is not None and qnum == current + 1)
            genuine = sequential and bool(re.match(r"^(?:\([a-z]\)|[A-Za-z])", rest_clean)) and not re.match(r"^hour\b", rest_clean, re.I)
            if qq in pref and genuine:
                current_q, current_part = qq, None
                mm = re.match(r"^\s*\(([a-z])\)\s*(?:\(([ivx]+)\)\s*)?(.*)$", rest, re.I)
                if mm:
                    current_part = mm.group(1).lower()
                    roman = mm.group(2).lower() if mm.group(2) else None
                    event_path = f"{qq}.{current_part}" + (f".{roman}" if roman else "")
                    if event_path in pref:
                        events.append({"path": event_path, "line": i, "head": mm.group(3)})
                    else:
                        events.append({"path": qq, "line": i, "head": rest})
                else:
                    events.append({"path": qq, "line": i, "head": rest})
                handled = True
        if handled:
            continue
        m = part_re.match(raw)
        if m and current_q:
            part, rest = m.group(1).lower(), m.group(2)
            rr = re.match(r"^\s*\(([ivx]+)\)\s*(.*)$", rest, re.I)
            roman = rr.group(1).lower() if rr else None
            text = rr.group(2) if rr else rest
            event_path = f"{current_q}.{part}" + (f".{roman}" if roman else "")
            if event_path in pref:
                current_part = part
                events.append({"path": event_path, "line": i, "head": text})
                continue
        m = roman_re.match(raw)
        if m and current_q and current_part:
            roman = m.group(1).lower()
            event_path = f"{current_q}.{current_part}.{roman}"
            if event_path in pref:
                events.append({"path": event_path, "line": i, "head": m.group(2)})

    deduped: list[dict] = []
    for e in events:
        if deduped and e["path"] == deduped[-1]["path"] and e["line"] - deduped[-1]["line"] < 3:
            continue
        deduped.append(e)
    events = deduped

    nodes: dict[str, str] = {}
    for idx, e in enumerate(events):
        end = events[idx + 1]["line"] if idx + 1 < len(events) else len(lines)
        text = clean_qp([e["head"], *lines[e["line"] + 1:end]])
        nodes.setdefault(e["path"], text)

    missing = sorted(valid - nodes.keys())
    if missing:
        raise RuntimeError("missing_qp_paths:" + ",".join(missing))

    result: dict[str, dict] = {}
    by_path = {x["path"]: x for x in ms_rows}
    for path_key in valid:
        bits = path_key.split(".")
        context_parts = [nodes[a] for i in range(1, len(bits)) if (a := ".".join(bits[:i])) in nodes and nodes[a]]
        own = nodes.get(path_key, "")
        full = "\n\n".join([*context_parts, own]).strip()
        if not full:
            raise RuntimeError("empty_stem:" + path_key)
        result[path_key] = {**by_path[path_key], "stem": full}
    return result


def fit_model(rows: list[tuple[str, str]]) -> Pipeline | None:
    if len(rows) < 10 or len({label for _, label in rows}) < 2:
        return None
    model = Pipeline([
        ("v", TfidfVectorizer(ngram_range=(1, 2), max_features=50000, sublinear_tf=True, strip_accents="unicode")),
        ("m", LogisticRegression(max_iter=1500, class_weight="balanced", C=4.0)),
    ])
    model.fit([text for text, _ in rows], [label for _, label in rows])
    return model


def choose_model(model: Pipeline | None, text: str, allowed: set[str]) -> tuple[str | None, float]:
    if model is None:
        return None, 0.0
    probs = model.predict_proba([text])[0]
    classes = list(model.classes_)
    order = np.argsort(probs)[::-1]
    for i in order:
        label = str(classes[int(i)])
        if label in allowed:
            return label, float(probs[int(i)])
    return None, 0.0


def choose_lo_fallback(text: str, candidates: list[dict], counts: collections.Counter) -> tuple[str, float]:
    if not candidates:
        raise RuntimeError("no_allowed_lo")
    candidate_codes = {str(x["code"]) for x in candidates}
    for code, _ in counts.most_common():
        if code in candidate_codes:
            return code, 0.52
    docs = [text, *[str(x.get("text") or "") for x in candidates]]
    try:
        matrix = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, strip_accents="unicode").fit_transform(docs)
        scores = (matrix[1:] @ matrix[0].T).toarray().ravel()
        idx = int(np.argmax(scores))
        return str(candidates[idx]["code"]), float(min(0.72, 0.48 + scores[idx] * 0.5))
    except ValueError:
        return str(candidates[0]["code"]), 0.45


def strong_subtopic_rule(component: int, text: str, allowed: set[str]) -> tuple[str | None, float]:
    t = text.lower()
    rules: list[tuple[str, str, float]] = []
    if component == 4:
        rules = [
            (r"recurs|base case", "19.2", .97),
            (r"binary tree|linked list|\bstack\b|\bqueue\b|enqueue|dequeue|push\(|pop\(|binary search|linear search|bubble sort|insertion sort|hash", "19.1", .96),
            (r"class declaration|constructor|object.?oriented|\boop\b|inherit|polymorph|encapsul", "20.1", .96),
            (r"open.+file|read.+file|write.+file|text file|file processing|exception", "20.2", .94),
        ]
    elif component == 3:
        rules = [
            (r"recurs|base case", "19.2", .96),
            (r"binary tree|linked list|binary search|linear search|bubble sort|insertion sort|big o", "19.1", .95),
            (r"karnaugh|k.?map|boolean algebra|flip.?flop|sum.?of.?products", "15.2", .96),
            (r"floating.?point|mantissa|exponent", "13.3", .96),
            (r"dijkstra|\ba\*\b|neural network|machine learning|deep learning", "18.1", .96),
        ]
    elif component == 2:
        rules = [
            (r"linked list|\bstack\b|\bqueue\b|abstract data type|\badt\b", "10.4", .96),
            (r"openfile|readfile|writefile|open.+file|read.+file|write.+file|save file|filename", "10.3", .94),
            (r"structure chart|state.?transition", "12.2", .96),
            (r"development life cycle|waterfall|agile|iterative development", "12.1", .95),
        ]
    for pattern, code, confidence in rules:
        if code in allowed and re.search(pattern, t, re.I):
            return code, confidence
    return None, 0.0


def answer_kind(component: int, stem: str) -> str:
    s = stem.lower()
    if component == 4:
        return "image" if re.search(r"screenshot|test your program|evidence", s) else "code"
    if re.search(r"draw.*(?:circuit|diagram|flowchart|graph|tree)|complete.*diagram|karnaugh|k.?map", s):
        return "diagram"
    if re.search(r"complete.*table|truth table|table shows|write.*table", s):
        return "table"
    if re.search(r"pseudocode|write.*algorithm", s):
        return "pseudocode"
    return "text"


def oidc_token() -> str:
    base = os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]
    sep = "&" if "?" in base else "?"
    req = urllib.request.Request(
        base + sep + "audience=" + AUDIENCE,
        headers={"Authorization": "bearer " + os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)["value"]


def runner(action: str, payload: dict | None = None, timeout: int = 150) -> dict:
    url = os.environ["CORPUS_RUNNER_URL"]
    body = {"action": action, **(payload or {})}
    req = urllib.request.Request(
        url,
        data=json.dumps(body, ensure_ascii=False).encode(),
        method="POST",
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + oidc_token()},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            data = json.load(response)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="ignore")[:3000]
        raise RuntimeError(f"runner_http_{exc.code}:{detail}") from exc
    if not data.get("ok"):
        raise RuntimeError("runner_error:" + str(data.get("error")))
    return data


def main() -> int:
    boot = runner("bootstrap", timeout=150)["data"]
    sources = list(boot.get("sources") or [])
    train_sub = list(boot.get("training_subtopics") or [])
    train_lo = list(boot.get("training_los") or [])
    coverage_rows = list(boot.get("coverage") or [])

    year_filter = os.getenv("BACKFILL_YEAR", "").strip()
    series_filter = os.getenv("BACKFILL_SERIES", "").strip()
    limit = int(os.getenv("BACKFILL_LIMIT", "500"))
    if year_filter:
        sources = [x for x in sources if int(x["year"]) == int(year_filter)]
    if series_filter:
        sources = [x for x in sources if str(x["series"]) == series_filter]
    sources = sources[:limit]

    sub_training: dict[int, list[tuple[str, str]]] = collections.defaultdict(list)
    sub_counts: dict[int, collections.Counter] = collections.defaultdict(collections.Counter)
    for r in train_sub:
        component = int(r["component"])
        text = f"PATH {r.get('path','')} {r.get('stem','')} {r.get('guidance','')}"
        label = str(r["subtopic"])
        sub_training[component].append((text, label))
        sub_counts[component][label] += 1
    sub_models = {c: fit_model(rows) for c, rows in sub_training.items()}

    lo_training: dict[str, list[tuple[str, str]]] = collections.defaultdict(list)
    lo_counts: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for r in train_lo:
        subtopic = str(r["subtopic"])
        text = f"PATH {r.get('path','')} {r.get('stem','')} {r.get('guidance','')}"
        label = str(r["lo"])
        lo_training[subtopic].append((text, label))
        lo_counts[subtopic][label] += 1
    lo_models = {s: fit_model(rows) for s, rows in lo_training.items()}

    coverage: dict[tuple[str, str], dict] = {}
    for r in coverage_rows:
        coverage[(str(r["syllabus_id"]), str(r["component_id"]))] = r

    print(json.dumps({"event":"bootstrap","remaining_sources":len(boot.get("sources") or []),"selected":len(sources),"training_subtopics":len(train_sub),"training_los":len(train_lo)}, separators=(",",":")))
    succeeded: list[dict] = []
    failed: list[dict] = []

    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        for source in sources:
            key = f"{source['year']}-{source['series']}-{source['component']}{source['variant']}"
            try:
                qp_pdf = root / f"{key}-qp.pdf"
                ms_pdf = root / f"{key}-ms.pdf"
                qp_txt = root / f"{key}-qp.txt"
                ms_txt = root / f"{key}-ms.txt"
                download(str(source["qp_url"]), qp_pdf)
                download(str(source["ms_url"]), ms_pdf)
                extract_text(qp_pdf, qp_txt)
                extract_text(ms_pdf, ms_txt)
                ms_rows = parse_ms(ms_txt)
                if sum(int(x["marks"]) for x in ms_rows) != 75:
                    raise RuntimeError("mark_scheme_total_not_75")
                qp_rows = parse_qp(qp_txt, ms_rows)
                if len(qp_rows) != len(ms_rows):
                    raise RuntimeError("leaf_count_mismatch")

                cov = coverage.get((str(source["syllabus_id"]), str(source["component_id"])))
                if not cov:
                    raise RuntimeError("coverage_missing")
                allowed_subtopics = {str(x) for x in cov.get("subtopics") or []}
                allowed_los_by_sub: dict[str, list[dict]] = collections.defaultdict(list)
                for lo in cov.get("los") or []:
                    allowed_los_by_sub[str(lo["subtopic"])].append(lo)

                component = int(source["component"])
                rows: list[dict] = []
                low: list[list] = []
                for ms in ms_rows:
                    path_key = str(ms["path"])
                    stem = str(qp_rows[path_key]["stem"])
                    guidance = str(ms.get("guidance") or "")
                    text = f"PATH {path_key} {stem} {guidance}"
                    subtopic, sub_conf = choose_model(sub_models.get(component), text, allowed_subtopics)
                    rule_sub, rule_conf = strong_subtopic_rule(component, text, allowed_subtopics)
                    if rule_sub and (subtopic is None or sub_conf < 0.56 or rule_conf >= sub_conf + 0.18):
                        subtopic, sub_conf = rule_sub, rule_conf
                    if subtopic is None:
                        for candidate, _count in sub_counts[component].most_common():
                            if candidate in allowed_subtopics:
                                subtopic, sub_conf = candidate, 0.50
                                break
                    if subtopic is None:
                        raise RuntimeError("no_allowed_subtopic:" + path_key)

                    allowed_los = allowed_los_by_sub.get(subtopic, [])
                    allowed_lo_codes = {str(x["code"]) for x in allowed_los}
                    lo, lo_conf = choose_model(lo_models.get(subtopic), text, allowed_lo_codes)
                    if lo is None:
                        lo, lo_conf = choose_lo_fallback(text, allowed_los, lo_counts[subtopic])

                    row = {
                        "path": path_key,
                        "marks": int(ms["marks"]),
                        "stem": stem,
                        "guidance": guidance,
                        "subtopic": subtopic,
                        "lo": lo,
                        "answer_kind": answer_kind(component, stem),
                        "confidence": round(max(0.45, min(0.99, sub_conf)), 4),
                        "lo_confidence": round(max(0.40, min(0.99, lo_conf)), 4),
                        "method": "tfidf-logreg+component-coverage-v2",
                    }
                    rows.append(row)
                    if row["confidence"] < 0.62 or row["lo_confidence"] < 0.52:
                        low.append([path_key, subtopic, row["confidence"], lo, row["lo_confidence"]])

                if sum(r["marks"] for r in rows) != 75:
                    raise RuntimeError("rows_total_not_75")
                result = runner("apply", {"qp_id": source["qp_id"], "ms_id": source["ms_id"], "rows": rows}, timeout=150)
                summary = {"paper": key, "leaves": len(rows), "marks": 75, "low": low[:12], "result": result.get("result")}
                succeeded.append(summary)
                print(json.dumps({"event":"paper_ok", **summary}, separators=(",",":"), default=str))
            except Exception as exc:
                failure = {"paper": key, "error": str(exc)[:2000]}
                failed.append(failure)
                print(json.dumps({"event":"paper_failed", **failure}, separators=(",",":")), file=sys.stderr)

    final = {"event":"final","selected":len(sources),"succeeded":len(succeeded),"failed":len(failed),"failed_papers":failed}
    print(json.dumps(final, separators=(",",":"), default=str))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
