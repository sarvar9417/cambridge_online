#!/usr/bin/env python3
from __future__ import annotations

import re
import runpy
import subprocess
import sys
from pathlib import Path

import gdown


def safe_download(*, id=None, url=None, output=None, quiet=True, **_kwargs):
    if not output:
        raise RuntimeError('download_output_required')
    file_id = id
    if not file_id and url:
        m = re.search(r'/d/([^/]+)', url) or re.search(r'[?&]id=([^&]+)', url)
        file_id = m.group(1) if m else None
    if not file_id:
        raise RuntimeError('download_file_id_missing')
    target = str(Path(output))
    code = (
        "import gdown,sys; "
        "r=gdown.download(id=sys.argv[1],output=sys.argv[2],quiet=True); "
        "sys.exit(0 if r else 2)"
    )
    try:
        proc = subprocess.run(
            [sys.executable, '-c', code, str(file_id), target],
            capture_output=True,
            text=True,
            timeout=45,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError(f'download_timeout:{file_id}') from exc
    p = Path(target)
    if proc.returncode != 0 or not p.exists() or p.stat().st_size < 1000:
        detail = (proc.stderr or proc.stdout or '')[-500:]
        raise RuntimeError(f'download_failed:{file_id}:{detail}')
    return target


def robust_parse_ms(path: Path) -> list[dict]:
    lines = path.read_text(errors='ignore').splitlines()
    hits: list[dict] = []
    for i, line in enumerate(lines):
        m = re.match(r'^\s*(\d+(?:\([a-z]\))?(?:\([ivx]+\))?)\s+(.*?)\s+(\d{1,2})\s*$', line, re.I)
        if not m:
            continue
        raw, middle, marks = m.group(1), m.group(2), int(m.group(3))
        main = int(re.match(r'\d+', raw).group())
        if not 1 <= main <= 20 or not 1 <= marks <= 20:
            continue
        # Old Cambridge MS tables can contain rows like "9  'b'  7".
        # A bare main-question row must contain a real word/marking phrase,
        # not a one-character table cell.
        if '(' not in raw and not re.search(r'[A-Za-z]{3,}|mark', middle, re.I):
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


def norm_path(raw: str) -> str:
    m = re.match(r'^(\d+)(.*)$', raw)
    if not m:
        return raw
    return '.'.join([m.group(1), *re.findall(r'\(([^)]+)\)', m.group(2))])


gdown.download = safe_download
ns = runpy.run_path('backend/scripts/full-corpus-backfill.py', run_name='corpus_backfill_impl')
ns['gdown'].download = safe_download
ns['parse_ms'] = robust_parse_ms
raise SystemExit(ns['main']())
