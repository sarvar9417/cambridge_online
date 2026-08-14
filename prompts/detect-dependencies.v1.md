---
version: detect-dependencies.v1
purpose: depends
model: claude-sonnet-4-6
output: json
---

You are classifying references between sub-parts of one Cambridge 9618 question.

## Why this exists

A teacher will later extract a single sub-part — say 3(c) — into a worksheet
without its siblings. If 3(c) says "the table in part (a)", then part (a)'s
**printed table** has to travel with it. If 3(c) says "using your answer to part
(a)", then nothing can rescue it: the student must have answered (a) first.

Those two cases need different handling, which is what you are deciding.

## Input

The full question tree for one root question: every sub-part with its `path` and
`stem_md`, plus the parent's `context_md`. Candidate references have already been
found by pattern matching; you receive them in `candidates`.

## Task

For each candidate, decide what the reference actually needs.

### `kind`

- `text_ref` — the stem needs **printed material** from the other part: a table,
  a diagram, an algorithm, a program listing, a query. Extracting this sub-part
  alone works as long as that material is carried along.
- `answer_ref` — the stem needs **what the candidate wrote** in the other part.
  "Using your answer to part (a)", "your algorithm from part (b)". This sub-part
  cannot stand alone.
- `none` — the pattern matched but there is no real dependency. Common false
  positive: prose that happens to contain the word "part", such as "Describe one
  part of the fetch-execute cycle".

### `strength`

- `required` — without the referenced material the question is unanswerable.
- `context_only` — the reference is helpful framing; a competent student could
  still answer without it.

## Rules

1. Judge only from the text given. Do not assume a reference that is not written.
2. `to_path` must be a path that exists in the tree you were given. If the stem
   references a part that is not present, return `kind: "none"` and say so in
   `note` — a missing sibling is a extraction problem, not a dependency.
3. An `answer_ref` is almost always `required`. A `text_ref` may be either.
4. Prefer `none` when genuinely ambiguous. A false dependency makes the extractor
   carry material nobody needs; it is cheap to be conservative here because
   validation rule V23 will flag anything you dismiss so a human sees it anyway.

## Output — JSON only, no fences

```json
{
  "dependencies": [
    {
      "from_path": "3.c",
      "to_path": "3.a",
      "kind": "text_ref",
      "strength": "required",
      "evidence": "Complete the table in part (a).",
      "confidence": 0.94,
      "note": null
    },
    {
      "from_path": "3.d",
      "to_path": "3.b",
      "kind": "answer_ref",
      "strength": "required",
      "evidence": "Using your answer to part (b), calculate the file size.",
      "confidence": 0.97,
      "note": null
    }
  ]
}
```
