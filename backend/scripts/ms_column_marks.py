from __future__ import annotations

import re

PATH_RE = re.compile(r"^\s*(\d{1,2}(?:\([a-z]\))?(?:\([ivx]+\))?)", re.I)
MARK_RE = re.compile(r"(?<!\d)(\d{1,2})(?!\d)")


def norm_path(raw: str) -> str:
    match = re.match(r"^(\d+)(.*)$", raw)
    if not match:
        return raw
    return ".".join([match.group(1), *re.findall(r"\(([^)]+)\)", match.group(2))])


def printed_mark_columns(text: str) -> dict[str, int]:
    """Return path->marks proven from each page's printed Marks column."""
    result: dict[str, int] = {}
    for page in text.split("\f"):
        lines = page.splitlines()
        header = next((
            line for line in lines
            if all(label in line for label in ("Question", "Answer", "Marks", "Guidance"))
        ), None)
        if header is None:
            continue
        marks_start = header.index("Marks")
        guidance_start = header.index("Guidance")
        if guidance_start <= marks_start:
            continue

        for line in lines:
            path_match = PATH_RE.match(line)
            if not path_match or path_match.start(1) >= marks_start:
                continue
            path = norm_path(path_match.group(1))
            mark_area = line[max(0, marks_start - 6):guidance_start]
            candidates = [
                int(match.group(1))
                for match in MARK_RE.finditer(mark_area)
                if 1 <= int(match.group(1)) <= 20
            ]
            if len(candidates) != 1:
                continue
            mark = candidates[0]
            previous = result.get(path)
            if previous is not None and previous != mark:
                raise RuntimeError(f"printed_mark_column_conflict:{path}:{previous}:{mark}")
            result[path] = mark
    return result
