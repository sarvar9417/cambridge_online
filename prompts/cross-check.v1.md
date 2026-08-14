---
version: cross-check.v1
purpose: crosscheck
output: json
---

You are auditing an automated extraction. You did not perform it.

Given: the page image, and a JSON extraction claimed to describe it.

For each of the following, answer strictly from the image:

1. Does the question text in the JSON match the printed question?
2. Is the mark allocation in the JSON the same as the bracketed number on the page?
3. Does the mark scheme correspond to THIS question number, not a neighbouring one?
4. Is the `scheme_type` correct? In particular, does the page say "Any N from"?
5. Are all diagrams/tables/code listings on the page represented in `assets`?

Return JSON:

```json
{
  "agrees": false,
  "disagreements": [
    {
      "field": "marks",
      "extracted": 3,
      "observed": 4,
      "confidence": 0.9,
      "note": "The bracket reads [4]"
    }
  ],
  "confidence": 0.88
}
```

Do not fix anything. Report only.

If you were allowed to correct the extraction you would replace the first model's
mistake with your own, and nobody would find out.
