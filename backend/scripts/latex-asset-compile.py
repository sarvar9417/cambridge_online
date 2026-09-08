#!/usr/bin/env python3
"""Compile reviewed Cambridge LaTeX/TikZ asset snippets to SVG.

This is an operator/worker tool, not a public runtime endpoint. It accepts only a
LaTeX body snippet and wraps it in the project's fixed preamble. Full documents
and file/shell primitives are rejected so database-authored assets cannot replace
the worker preamble or read arbitrary files.
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

FORBIDDEN = re.compile(
    r"\\(?:documentclass|usepackage|input|include|includeonly|openin|openout|read|write|"
    r"immediate|write18|catcode|csname|newread|newwrite|loop)\b",
    re.IGNORECASE,
)

PREAMBLE = r"""\documentclass[tikz,border=4pt]{standalone}
\usepackage{amsmath,amssymb,array,booktabs}
\usepackage{tikz}
\usepackage[RPvoltages]{circuitikz}
\usetikzlibrary{arrows.meta,positioning,shapes.geometric,calc,matrix,fit,chains}
\begin{document}
"""
POSTAMBLE = "\\end{document}\n"


def executable(name: str) -> str:
    found = shutil.which(name)
    if not found:
        raise RuntimeError(f"Required executable not found: {name}")
    return found


def validate_snippet(source: str) -> None:
    if not source.strip():
        raise ValueError("LaTeX source is empty")
    match = FORBIDDEN.search(source)
    if match:
        raise ValueError(f"Forbidden LaTeX command: {match.group(0)}")


def run(command: list[str], cwd: Path, env: dict[str, str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=cwd,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )


def compile_svg(source: str, output: Path, engine: str = "pdflatex") -> None:
    validate_snippet(source)
    tex_engine = executable(engine)
    pdftocairo = executable("pdftocairo")
    output.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="cambridge-latex-") as temporary:
        work = Path(temporary)
        (work / "asset.tex").write_text(
            PREAMBLE + source.rstrip() + "\n" + POSTAMBLE,
            encoding="utf-8",
        )

        env = os.environ.copy()
        env["openin_any"] = "p"
        env["openout_any"] = "p"
        compiled = run(
            [
                tex_engine,
                "-no-shell-escape",
                "-halt-on-error",
                "-interaction=nonstopmode",
                "asset.tex",
            ],
            work,
            env,
        )
        pdf = work / "asset.pdf"
        if compiled.returncode != 0 or not pdf.exists():
            tail = "\n".join(compiled.stdout.splitlines()[-40:])
            raise RuntimeError(f"LaTeX compilation failed ({engine}):\n{tail}")

        converted = run([pdftocairo, "-svg", "asset.pdf", "asset.svg"], work, env)
        svg_path = work / "asset.svg"
        if converted.returncode != 0 or not svg_path.exists():
            tail = "\n".join(converted.stdout.splitlines()[-40:])
            raise RuntimeError(f"SVG conversion failed:\n{tail}")

        svg = svg_path.read_text(encoding="utf-8")
        if "<svg" not in svg:
            raise RuntimeError("SVG converter returned invalid output")
        output.write_text(svg, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compile a reviewed Cambridge LaTeX/TikZ snippet to SVG.",
    )
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument(
        "--engine",
        choices=("pdflatex", "lualatex"),
        default=os.getenv("LATEX_ENGINE", "pdflatex"),
    )
    args = parser.parse_args()

    try:
        compile_svg(
            args.input.read_text(encoding="utf-8"),
            args.output,
            args.engine,
        )
    except Exception as error:
        print(str(error), file=sys.stderr)
        return 1

    print(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
