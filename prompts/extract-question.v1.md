---
version: extract-question.v1
purpose: extract_qp
output: json
---

You are extracting exam questions from a Cambridge International AS & A Level
Computer Science 9618 question paper.

## Input

- Page image(s) at 200 dpi
- Text layer extracted from the same pages
- Paper metadata: {syllabus} {component} {year} {series} {variant}
- Questions already extracted from the previous batch: {prior_refs}

## Task

Extract every question and sub-question as a tree.

## Rules

1. Preserve the exact hierarchy: 3 → 3(b) → 3(b)(ii). Never flatten.
2. A parent that carries no marks of its own has `"marks": null`. Only leaves carry marks.
3. Shared scenario text (a table, a program listing, a description used by several
   sub-parts) goes in the PARENT's `context_latex`, never duplicated into each child.
4. `marks` comes from the bracketed number at the right margin, e.g. [3].
5. `command_word` is the FIRST imperative verb of the question stem.
   Use exactly one of: State, Give, Name, Identify, Define, Describe, Explain,
   Compare, Calculate, Complete, Draw, Write, Evaluate, Justify, Suggest, Show, Other.
6. Write `stem_latex` as LaTeX-flavoured text:
   - Prose stays plain. Only mathematics goes inside `$...$` (inline) or `$$...$$` (display).
   - Binary, hexadecimal and denary literals use `$\mathtt{...}_2$`, `$\mathtt{...}_{16}$`.
   - Powers use `$2^{10}$`. Do NOT use `\text`, `\href`, `\includegraphics` or `\input`.
   - Truth tables and matrices may use `\begin{array}{...}` inside `$$...$$`.
   - Never emit `\begin{tikzpicture}` — a diagram belongs in `assets`, not in the stem.
7. If the question contains a diagram, table, or code listing, do NOT transcribe it
   into `stem_latex`. Add an entry to `assets` with a bounding box and a description.
   Tables and code MAY be transcribed into `asset.content_md` as markdown; diagrams may not.
8. `answer_lines`: count the ruled answer lines printed under the question.
   Use 0 if the answer space is a box, table, or diagram.
9. `answer_kind`: text | pseudocode | code | table | diagram | image
10. Do not invent, complete, or correct anything. If text is unreadable, put the
    readable part in `stem_latex` and add "unreadable" to the `issues` array.
11. If a question continues past the last page of this batch, set `"truncated": true`.

## Output

Return ONLY a JSON object. No preamble, no markdown fences.

```json
{
  "questions": [
    {
      "path": "3",
      "label": "3",
      "parent_path": null,
      "stem_latex": "A company stores customer records in a relational database.",
      "context_latex": null,
      "command_word": null,
      "marks": null,
      "answer_kind": "text",
      "answer_lines": 0,
      "source_pages": [4],
      "assets": [
        {
          "kind": "table",
          "content_md": "| Field | Type |\n|---|---|\n",
          "alt_text": "Customer table structure",
          "bbox": [120, 340, 480, 520],
          "page": 4
        }
      ],
      "issues": [],
      "confidence": 0.96
    },
    {
      "path": "3.b",
      "label": "b",
      "parent_path": "3",
      "stem_latex": "Explain why a primary key is required.",
      "command_word": "Explain",
      "marks": 3,
      "answer_kind": "text",
      "answer_lines": 6,
      "source_pages": [4],
      "assets": [],
      "issues": [],
      "confidence": 0.98
    }
  ],
  "truncated": false,
  "page_total_marks": 12
}
```

`page_total_marks` is your own sum of the marks printed on these pages. It gives
the pipeline a free cross-check (validation rule V02).
