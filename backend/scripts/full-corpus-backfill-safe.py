#!/usr/bin/env python3
from __future__ import annotations

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
        import re
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


gdown.download = safe_download
runpy.run_path('backend/scripts/full-corpus-backfill.py', run_name='__main__')
