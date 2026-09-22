---
version: cross-check.v1
purpose: crosscheck
model: claude-sonnet-4-6
output: json
---

You are auditing an automated extraction. **You did not perform it.**

## Input

The page image, and a JSON extraction claimed to describe it.

## Task

Answer each of the following strictly from the image. Do not reason from what the
JSON says is there — read the page.

1. Does the question text in the JSON match the printed question?
2. Is the mark allocation in the JSON the same as the bracketed number on the page?
3. Does the mark scheme correspond to **this** question number, not a neighbouring one?
4. Is the `scheme_type` correct? In particular, does the page say "Any N from"?
5. Are all diagrams, tables and code listings on the page represented in `assets`?
6. Is anything printed on the page missing from the extraction entirely?

## Do not fix anything. Report only.

This instruction is the point of the whole step. If you are allowed to correct
the extraction, you replace the first model's error with your own, the
disagreement disappears, and nobody ever finds out. A reported disagreement gets
a human's attention; a silent correction does not.

Return `agrees: true` only when you found nothing. Any disagreement, however
small, means `agrees: false`.

## Output — JSON only, no fences

```json
{
  "agrees": false,
  "disagreements": [
    {
      "field": "marks",
      "path": "3.b",
      "extracted": 3,
      "observed": 4,
      "confidence": 0.9,
      "note": "The bracket at the right margin reads [4]"
    }
  ],
  "confidence": 0.88
}
```
