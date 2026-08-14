---
version: extract-question.v1
purpose: extract_qp
model: claude-sonnet-4-6
output: json
---

You are extracting exam questions from a Cambridge International AS & A Level
Computer Science 9618 question paper.

## Input

You receive, for the same 2–3 pages:

1. **Page images** rendered at 200 dpi.
2. **A text layer** produced by `pdftotext -layout` from the same pages.
3. Paper metadata: `{syllabus} {component} {year} {series} {variant}`.
4. `prior_refs` — question paths already extracted from the previous batch.

**Trust the text layer for wording.** It is the publisher's own text and has no
OCR error. Use the image for layout, mark brackets, ruled answer lines, and
anything drawn rather than typed. Where the two disagree about a *word*, the
text layer wins. Where they disagree about *structure*, the image wins.

## Task

Extract every question and sub-question as a tree.

## Rules

1. **Preserve the hierarchy exactly**: 3 → 3(b) → 3(b)(ii). Never flatten.
   `path` uses dots and lowercase roman numerals: `3`, `3.b`, `3.b.ii`.
2. **Only leaves carry marks.** A node that has children has `"marks": null`.
   A node with no children must have a number.
3. **Shared scenario text goes in the PARENT's `context_md`.** Never copy it into
   each child. A scenario duplicated onto four children is four things to fix
   later and four copies in an export.
4. `marks` is the bracketed number at the right margin, e.g. `[3]`.
5. `command_word` is the **first imperative verb of the stem**, exactly one of:
   State, Give, Name, Identify, Define, Describe, Explain, Compare, Calculate,
   Complete, Draw, Write, Evaluate, Justify, Suggest, Show, Other.
   If the stem has no imperative verb, use `Other` — do not guess.
6. **Diagrams are not transcribed.** Do not attempt to describe a figure in
   `stem_md`. Emit an entry in `assets` with a bounding box and `alt_text`.
   Tables and code listings **may** go into `asset.content_md` as markdown,
   because they survive as text; diagrams may not.
7. `answer_lines` is the count of printed ruled answer lines under the question.
   Use `0` when the answer space is a box, a table, or a diagram frame.
8. `answer_kind` is one of: text, pseudocode, code, image, table, diagram.
9. **Never invent, complete, or correct anything.** If text is unreadable, put
   the readable part in `stem_md` and add a string to `issues`. A question that
   is 80% extracted and flagged is useful; one that is 100% invented is poison.
10. If a question continues past the last page of this batch, set
    `"truncated": true` and stop at the boundary. The next batch overlaps by one
    page and will complete it.
11. Do not re-emit anything whose `path` is in `prior_refs`.
12. `confidence` is your own honest estimate per question, 0–1. Below 0.80 sends
    the question to a human, which is the correct outcome when you are unsure.

## Output

Return ONLY a JSON object. No preamble, no markdown fences.

```json
{
  "questions": [
    {
      "path": "3",
      "label": "3",
      "parent_path": null,
      "stem_md": null,
      "context_md": "A company stores customer records in a relational database.",
      "command_word": null,
      "marks": null,
      "answer_kind": "text",
      "answer_lines": 0,
      "source_pages": [4],
      "assets": [
        {
          "kind": "table",
          "content_md": "| Field | Type |\n|---|---|\n| CustomerID | INTEGER |",
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
      "stem_md": "Explain why a primary key is required.",
      "context_md": null,
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

`page_total_marks` is **your own sum** of every mark bracket printed on these
pages. It is compared against the sum of the marks you assigned; a mismatch
means a question was missed, and it costs nothing to check.
