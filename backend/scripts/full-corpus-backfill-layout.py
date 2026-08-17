#!/usr/bin/env python3
from __future__ import annotations

import re
import runpy
import sys
import urllib.request
from pathlib import Path

# Load the shared classifier/apply implementation without running it.
impl = runpy.run_path('backend/scripts/full-corpus-backfill.py', run_name='corpus_backfill_impl')

PAGE_REF = re.compile(r'9618/\d+/(?:M/J|O/N)/\d+', re.I)


def drive_id(url: str) -> str:
    m = re.search(r'/d/([^/]+)', url or '') or re.search(r'[?&]id=([^&]+)', url or '')
    if not m:
        raise ValueError('bad_drive_url')
    return m.group(1)


def direct_download(url: str, path: Path) -> None:
    file_id = drive_id(url)
    direct = f'https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t'
    req = urllib.request.Request(direct, headers={'User-Agent': 'CamPathCorpusBackfill/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=45) as response, open(path, 'wb') as dst:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                dst.write(chunk)
    except Exception as exc:
        raise RuntimeError(f'direct_download_failed:{file_id}:{type(exc).__name__}') from exc
    if not path.exists() or path.stat().st_size < 1000:
        raise RuntimeError(f'direct_download_too_small:{file_id}')


def norm_path(raw: str) -> str:
    m = re.match(r'^(\d+)(.*)$', raw)
    if not m:
        return raw
    return '.'.join([m.group(1), *re.findall(r'\(([^)]+)\)', m.group(2))])


def robust_parse_ms(path: Path) -> list[dict]:
    lines = path.read_text(errors='ignore').splitlines()
    hits: list[dict] = []
    for i, line in enumerate(lines):
        m = re.match(r'^(\s*)(\d+(?:\([a-z]\))?(?:\([ivx]+\))?)\s+(.*?)\s+(\d{1,2})\s*$', line, re.I)
        if not m:
            continue
        indent = len(m.group(1))
        raw, middle, marks = m.group(2), m.group(3), int(m.group(4))
        main = int(re.match(r'\d+', raw).group())
        if not 1 <= main <= 20 or not 1 <= marks <= 20:
            continue
        # Cambridge legacy mark schemes sometimes use a bare row such as
        # "7 ... 5" for a whole-question mark allocation. Numeric data rows
        # inside worked tables are substantially more indented in -layout
        # extraction, so use column position rather than requiring answer text.
        if indent > 8:
            continue
        hits.append({'raw_path': raw, 'path': norm_path(raw), 'marks': marks, 'line': i})

    monotonic: list[dict] = []
    highest = 0
    for hit in hits:
        main = int(hit['path'].split('.')[0])
        if main < highest:
            continue
        highest = max(highest, main)
        monotonic.append(hit)
    hits = monotonic

    descendant_mains = {h['path'].split('.')[0] for h in hits if '.' in h['path']}
    hits = [h for h in hits if not ('.' not in h['path'] and h['path'] in descendant_mains)]

    out: list[dict] = []
    seen: set[str] = set()
    for h in hits:
        if h['path'] in seen:
            continue
        seen.add(h['path'])
        out.append(h)

    for j, h in enumerate(out):
        end = out[j + 1]['line'] if j + 1 < len(out) else len(lines)
        clean: list[str] = []
        for raw_line in lines[h['line']:end]:
            s = re.sub(r'\s+', ' ', raw_line).strip()
            if not s:
                continue
            if 'Cambridge International AS & A Level' in s or s.startswith('©') or s == 'PUBLISHED':
                continue
            if re.match(r'^9618/\d+', s) or re.match(r'^Page \d+ of \d+', s):
                continue
            if s.startswith('Question') and 'Answer' in s and 'Marks' in s:
                continue
            clean.append(s)
        h['guidance'] = '\n'.join(clean)
    return out


def clean_qp(lines: list[str]) -> str:
    out: list[str] = []
    for raw in lines:
        s = raw.strip()
        if s.startswith('Permission to reproduce items') or s.startswith('To avoid the issue of disclosure') or s.startswith('Cambridge Assessment International Education is part of'):
            break
        if not s or s == 'BLANK PAGE' or 'DO NOT WRITE IN THIS MARGIN' in s:
            continue
        if s.startswith('© UCLES') or s.startswith('© Cambridge') or PAGE_REF.search(s):
            continue
        if s in ('[Turn over', '[Turn over]') or (s.startswith('*') and s.endswith('*')):
            continue
        if re.fullmatch(r'[,.…\._ ]+', s):
            continue
        printable = sum(1 for ch in s if 32 <= ord(ch) < 127)
        if len(s) >= 12 and printable / len(s) < 0.55:
            continue
        s = re.sub(r'\.{8,}.*$', '', s).strip()
        s = re.sub(r'\s*\[(\d+)\]\s*$', '', s).strip()
        if s:
            out.append(s)
    return '\n'.join(out)


def prefixes(valid: set[str]) -> set[str]:
    out: set[str] = set()
    for path in valid:
        bits = path.split('.')
        for i in range(1, len(bits) + 1):
            out.add('.'.join(bits[:i]))
    return out


def robust_parse_qp(path: Path, ms_rows: list[dict]) -> dict[str, dict]:
    valid = {x['path'] for x in ms_rows}
    pref = prefixes(valid)
    lines = path.read_text(errors='ignore').splitlines()
    events: list[dict] = []
    current_q: str | None = None
    current_part: str | None = None

    # Critical legacy fix: real top-level Cambridge question numbers are at the
    # left margin in pdftotext -layout output. Indented numeric table/data rows
    # must never advance question state.
    main_re = re.compile(r'^(\d{1,2})\s+(.+)$')
    part_re = re.compile(r'^\s*\(([a-z])\)\s*(.*)$', re.I)
    roman_re = re.compile(r'^\s*\(([ivx]+)\)\s*(.*)$', re.I)

    for i, raw in enumerate(lines):
        if 'DO NOT WRITE IN THIS MARGIN' in raw:
            continue
        handled = False
        m = main_re.match(raw)
        if m:
            qq, rest = m.group(1), m.group(2)
            qnum = int(qq)
            current = int(current_q) if current_q is not None else 0
            sequential = (current_q is None and qnum == 1) or (current_q is not None and qnum == current + 1)
            genuine = sequential and bool(re.match(r'^(?:\([a-z]\)|[A-Za-z])', rest.strip())) and not re.match(r'^hour\b', rest.strip(), re.I)
            if qq in pref and genuine:
                current_q, current_part = qq, None
                mm = re.match(r'^\s*\(([a-z])\)\s*(?:\(([ivx]+)\)\s*)?(.*)$', rest, re.I)
                if mm:
                    current_part = mm.group(1).lower()
                    roman = mm.group(2).lower() if mm.group(2) else None
                    event_path = f'{qq}.{current_part}' + (f'.{roman}' if roman else '')
                    if event_path in pref:
                        events.append({'path': event_path, 'line': i, 'head': mm.group(3)})
                    else:
                        events.append({'path': qq, 'line': i, 'head': rest})
                else:
                    events.append({'path': qq, 'line': i, 'head': rest})
                handled = True
        if handled:
            continue

        m = part_re.match(raw)
        if m and current_q:
            part, rest = m.group(1).lower(), m.group(2)
            rr = re.match(r'^\s*\(([ivx]+)\)\s*(.*)$', rest, re.I)
            roman = rr.group(1).lower() if rr else None
            text = rr.group(2) if rr else rest
            event_path = f'{current_q}.{part}' + (f'.{roman}' if roman else '')
            if event_path in pref:
                current_part = part
                events.append({'path': event_path, 'line': i, 'head': text})
                continue

        m = roman_re.match(raw)
        if m and current_q and current_part:
            roman = m.group(1).lower()
            event_path = f'{current_q}.{current_part}.{roman}'
            if event_path in pref:
                events.append({'path': event_path, 'line': i, 'head': m.group(2)})

    deduped: list[dict] = []
    for e in events:
        if deduped and e['path'] == deduped[-1]['path'] and e['line'] - deduped[-1]['line'] < 3:
            continue
        deduped.append(e)
    events = deduped

    nodes: dict[str, str] = {}
    for idx, e in enumerate(events):
        end = events[idx + 1]['line'] if idx + 1 < len(events) else len(lines)
        text = clean_qp([e['head'], *lines[e['line'] + 1:end]])
        nodes.setdefault(e['path'], text)

    missing = sorted(valid - nodes.keys())
    if missing:
        raise RuntimeError('missing_qp_paths:' + ','.join(missing))

    result: dict[str, dict] = {}
    by_path = {x['path']: x for x in ms_rows}
    for path_key in valid:
        bits = path_key.split('.')
        context_parts = [nodes[a] for i in range(1, len(bits)) if (a := '.'.join(bits[:i])) in nodes and nodes[a]]
        own = nodes.get(path_key, '')
        full = '\n\n'.join([*context_parts, own]).strip()
        if not full:
            raise RuntimeError('empty_stem:' + path_key)
        result[path_key] = {**by_path[path_key], 'stem': full}
    return result


# Patch only extraction; classifier, coverage checks, OIDC and transactional apply
# stay centralized in the shared implementation.
impl['download'] = direct_download
impl['parse_ms'] = robust_parse_ms
impl['parse_qp'] = robust_parse_qp
raise SystemExit(impl['main']())
