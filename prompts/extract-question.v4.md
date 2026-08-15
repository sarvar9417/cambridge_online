---
version: extract-question.v4
purpose: extract_qp
model: claude-sonnet-4-6
output: json
---

You are extracting exam questions from a Cambridge International AS & A Level Computer Science 9618 question paper.

## Input

For the same 2–3 pages you receive:

1. page images rendered at 200 dpi;
2. a `pdftotext -layout` text layer;
3. paper metadata;
4. `prior_refs` — paths that are already complete and MUST NOT be emitted again;
5. `carryover_refs` — paths that were cut off at the previous batch boundary and MUST be re-emitted when visible so the incomplete extraction can be replaced by the completed one.

`carryover_refs` are deliberately excluded from `prior_refs`. Never treat a carry-over path as complete merely because you saw it in the previous batch.

Trust the text layer for wording and the page image for structure, marks, answer lines and drawn material. If they disagree about a word, text wins. If they disagree about structure, image wins.

## Task

Extract every visible question and sub-question as a tree. Complete any visible `carryover_refs` before moving on to new questions.

## Rules

1. Preserve hierarchy exactly: `3` → `3.b` → `3.b.ii`. Never flatten.
2. Only leaves carry marks. A node with children carries context, not marks, and
   has no answer of its own: give it `marks: null`, `answer_kind: null`,
   `answer_lines: null` and `command_word: null`. Every other key is still
   required on it, including `assets`, `issues` and `confidence`.
3. Shared scenario text belongs in the parent `context_md`, not duplicated onto children.
4. `marks` comes from the printed bracket at the right margin.
5. `command_word` is the first imperative verb, exactly one of: State, Give, Name, Identify, Define, Describe, Explain, Compare, Calculate, Complete, Draw, Write, Evaluate, Justify, Suggest, Show, Other.
6. Diagrams are not transcribed into prose. Emit an asset. Tables/code may use `content_md`.
7. Asset `bbox` is `[x1,y1,x2,y2]` in pixels of the supplied 200-dpi page image, top-left origin.
8. `answer_lines` counts printed ruled lines; use `0` for boxes/tables/diagram frames.
9. `answer_kind` is one of: text, pseudocode, code, image, table, diagram.
10. Never invent or repair source material. Add an `issues` entry when something is unreadable or uncertain.
11. If a question is still cut off after the last page in this batch, set `truncated: true`. Include the visible partial node so the next overlapping batch can carry it forward again. `truncated` is a top-level key alongside `questions`, never a key inside a question object.
12. Do not emit paths in `prior_refs`.
13. Re-emit a path in `carryover_refs` when the current pages let you complete or extend it. Use the most complete wording/context visible in the current batch.
14. `confidence` is 0–1. Use below 0.80 when human review is appropriate.

## Assets

An entry in `assets` is exactly these five keys, no others:

| key | type | meaning |
| --- | --- | --- |
| `kind` | one of `text`, `pseudocode`, `code`, `image`, `table`, `diagram` | what the material is. Same vocabulary as `answer_kind`. |
| `content_md` | string or `null` | Markdown transcription for `table`, `code` and `pseudocode`. `null` for anything drawn — a diagram is cropped from the page, never transcribed. |
| `alt_text` | string, never `null` | a short factual description of what is shown, e.g. "logic circuit with two AND gates feeding an OR gate". Required on every asset. |
| `bbox` | `[x1,y1,x2,y2]` or `null` | pixel rectangle in the 200-dpi page image. Required when `content_md` is `null`, because the crop is the only copy of that material. |
| `page` | integer or `null` | the page the material appears on. |

Do not emit an `id`, `asset_id`, `ref`, `url`, `filename` or any other key. Assets
are stored and identified downstream; an identifier invented here is wrong and
causes the whole batch to be rejected.

## Output

Return JSON only. The object has exactly three top-level keys — `questions`,
`truncated` and `page_total_marks` — and each entry of `questions` has exactly
the fourteen keys shown below. Any other key anywhere causes the whole batch to
be rejected, so put `truncated` and `page_total_marks` after the array closes,
not inside the last question.

```json
{
  "questions": [
    {
      "path": "3",
      "label": "3",
      "parent_path": null,
      "stem_md": null,
      "context_md": "A school stores student records in a relational database.",
      "command_word": null,
      "marks": null,
      "answer_kind": null,
      "answer_lines": null,
      "source_pages": [4],
      "assets": [],
      "issues": [],
      "confidence": 0.97
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
    },
    {
      "path": "3.c",
      "label": "c",
      "parent_path": "3",
      "stem_md": "Complete the truth table for the logic circuit shown.",
      "context_md": null,
      "command_word": "Complete",
      "marks": 4,
      "answer_kind": "table",
      "answer_lines": 0,
      "source_pages": [5],
      "assets": [
        {
          "kind": "diagram",
          "content_md": null,
          "alt_text": "logic circuit with inputs A and B into an AND gate, output into a NOT gate",
          "bbox": [310, 720, 1290, 1180],
          "page": 5
        },
        {
          "kind": "table",
          "content_md": "| A | B | X |\n| --- | --- | --- |\n|  |  |  |",
          "alt_text": "empty truth table with columns A, B and X",
          "bbox": null,
          "page": 5
        }
      ],
      "issues": [],
      "confidence": 0.94
    }
  ],
  "truncated": false,
  "page_total_marks": 12
}
```

`page_total_marks` is your sum of all mark brackets printed on these pages. Do not use it to invent missing questions.
