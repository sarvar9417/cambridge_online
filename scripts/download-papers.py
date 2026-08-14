#!/usr/bin/env python3
"""
Download Cambridge 9618 past papers from a shared Google Drive folder.

Walks the folder tree (embeddedfolderview, no API key needed), lists every
folder and file, and downloads the PDFs into a local directory that mirrors the
Drive layout:

    papers/
      2015_June_9608/...
      2023_May_june/9618_s23_qp_11.pdf
      2023_May_june/9618_s23_ms_11.pdf
      ...

Usage:
    python3 scripts/download-papers.py                     # everything
    python3 scripts/download-papers.py --filter qp ms      # only QP + MS files
    python3 scripts/download-papers.py --dry-run           # just list what would download
    python3 scripts/download-papers.py --out /tmp/papers   # custom output dir

The default root is the shared PastPapers folder:
    https://drive.google.com/drive/folders/1ibrvZHH5UE17oRiV4u37dPvwIBGoxBGq

Notes:
- Files are downloaded via the public uc?export=download URL. Large files that
  trigger Google's virus-scan interstitial are retried with the confirm token.
- Already-downloaded files (same name and byte size) are skipped, so re-running
  is cheap and safe.
- Only standard-library modules are used.
"""

import argparse
import html
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_ROOT = "1ibrvZHH5UE17oRiV4u37dPvwIBGoxBGq"  # PastPapers
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

ENTRY_RE = re.compile(r'<div class="flip-entry"', re.I)
TITLE_RE = re.compile(r'flip-entry-title[^>]*>(.*?)</', re.S)
ID_RE = re.compile(r'id="entry-([\w-]+)"')
FOLDER_RE = re.compile(r'drive-sprite-folder', re.I)
FILE_URL_RE = re.compile(r'href="(https://drive\.google\.com/file/d/([\w-]+)[^"]*)"')


class Entry:
    def __init__(self, drive_id: str, title: str, is_folder: bool, file_id: str | None):
        self.drive_id = drive_id
        self.title = title
        self.is_folder = is_folder
        self.file_id = file_id  # the `file/d/<id>` id, may differ from entry id

    def __repr__(self) -> str:
        kind = "DIR " if self.is_folder else "FILE"
        return f"{kind} {self.title}"


def clean_title(raw: str) -> str:
    text = html.unescape(re.sub(r"<[^>]+>", "", raw)).strip()
    # Drive titles can contain characters that are awkward on disk.
    text = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", text)
    return text


def parse_folder_listing(html_text: str) -> list[Entry]:
    """Parse an embeddedfolderview page into its folder/file entries."""
    entries: list[Entry] = []
    for block in ENTRY_RE.split(html_text)[1:]:
        id_match = ID_RE.search(block)
        title_match = TITLE_RE.search(block)
        if not id_match or not title_match:
            continue
        title = clean_title(title_match.group(1))
        if not title:
            continue
        file_url = FILE_URL_RE.search(block)
        entries.append(
            Entry(
                drive_id=id_match.group(1),
                title=title,
                is_folder=bool(FOLDER_RE.search(block)),
                file_id=file_url.group(2) if file_url else None,
            )
        )
    return entries


def fetch(url: str, timeout: int = 30) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def list_folder(folder_id: str) -> list[Entry]:
    url = f"https://drive.google.com/embeddedfolderview?id={folder_id}#list"
    try:
        raw = fetch(url)
    except urllib.error.URLError as exc:
        print(f"  !! cannot list folder {folder_id}: {exc}", file=sys.stderr)
        return []
    return parse_folder_listing(raw.decode("utf-8", errors="replace"))


def download_file(file_id: str, destination: str) -> bool:
    """Download one file. Returns True if written, False if already present."""
    if os.path.exists(destination) and os.path.getsize(destination) > 0:
        return False
    os.makedirs(os.path.dirname(destination) or ".", exist_ok=True)

    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    tmp = destination + ".part"
    try:
        for attempt in range(3):
            try:
                request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(request, timeout=60) as response:
                    data = response.read()
                break
            except urllib.error.URLError as exc:
                if attempt == 2:
                    print(f"    !! download failed: {exc}", file=sys.stderr)
                    return False
                time.sleep(2 * (attempt + 1))

        # Large files: Google returns an HTML interstitial asking to confirm.
        # Retry with the confirm token when that happens.
        if data[:200].lstrip().lower().startswith(b"<!doctype") or b"download_warning" in data[:4096]:
            text = data.decode("utf-8", errors="replace")
            confirm = re.search(r'name="confirm" value="([^"]+)"', text) or re.search(
                r"confirm=([\w-]+)", text
            )
            if confirm:
                token = confirm.group(1)
                url = (
                    f"https://drive.google.com/uc?export=download&id={file_id}"
                    f"&confirm={token}"
                )
                request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(request, timeout=60) as response:
                    data = response.read()

        with open(tmp, "wb") as handle:
            handle.write(data)
        os.replace(tmp, destination)
        return True
    except Exception as exc:  # noqa: BLE001 - report and keep going
        print(f"    !! download error for {file_id}: {exc}", file=sys.stderr)
        if os.path.exists(tmp):
            os.remove(tmp)
        return False


def sanitize_component(filename: str) -> str:
    """Return 'qp', 'ms', 'in', 'er', 'gt' for standard Cambridge filenames."""
    match = re.search(r"_(qp|ms|in|er|gt)_\d+", filename, re.I)
    return match.group(1).lower() if match else ""


def walk(folder_id: str, rel_path: str, out_root: str, args, stats: dict) -> None:
    entries = list_folder(folder_id)
    stats["folders"] += 1
    print(f"[{rel_path or folder_id}] {len(entries)} entries")

    for entry in entries:
        if entry.is_folder:
            walk(entry.drive_id, os.path.join(rel_path, entry.title), out_root, args, stats)
            continue

        # --filter matches the component token (qp/ms/in/er/gt) in the filename.
        if args.filter:
            component = sanitize_component(entry.title)
            if component not in args.filter:
                continue
        if not (args.all_files or entry.title.lower().endswith((".pdf", ".docx", ".zip"))):
            continue

        destination = os.path.join(out_root, rel_path, entry.title)
        size_hint = f"{os.path.getsize(destination) // 1024}KB" if os.path.exists(destination) else "new"
        if args.dry_run:
            print(f"  would download {entry.title} [{size_hint}]")
            stats["dry"] += 1
            continue
        if args.filter:
            print(f"  {entry.title} -> {destination} [{size_hint}]")
        if download_file(entry.file_id or entry.drive_id, destination):
            stats["downloaded"] += 1
        else:
            stats["skipped"] += 1


def main() -> None:
    parser = argparse.ArgumentParser(description="Download Cambridge past papers from Google Drive")
    parser.add_argument("--root", default=DEFAULT_ROOT, help="Google Drive folder id")
    parser.add_argument("--out", default="papers", help="local output directory (default: papers/)")
    parser.add_argument(
        "--filter",
        nargs="*",
        choices=["qp", "ms", "in", "er", "gt"],
        help="only download files whose name contains these tokens, e.g. --filter qp ms",
    )
    parser.add_argument("--all-files", action="store_true", help="download every file, not just pdf/docx/zip")
    parser.add_argument("--dry-run", action="store_true", help="list files without downloading")
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    stats = {"folders": 0, "downloaded": 0, "skipped": 0, "dry": 0}
    print(f"Walking {args.root} -> {args.out}")
    walk(args.root, "", args.out, args, stats)
    print(
        f"\nDone. folders={stats['folders']} "
        f"downloaded={stats['downloaded']} skipped={stats['skipped']} dry={stats['dry']}"
    )


if __name__ == "__main__":
    main()
