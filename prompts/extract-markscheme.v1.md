---
version: extract-markscheme.v1
purpose: extract_ms
output: json
---

You are extracting a mark scheme from a Cambridge 9618 mark scheme document.

## Task

For each question reference, produce a machine-readable marking structure.

## scheme_type — choose exactly one

- `all_required` — Every mark point must be present. Marks = sum of matched points.
- `any_n_from_m` — "Any three from:" — award up to n points from a list of m.
  Create a group with `n_required = n`.
- `levels_of_response` — Banded descriptors (Level 1/2/3). Common for Evaluate questions.
- `exact_match` — A specific value, calculation result, or completed table cell.
- `code_output` — Program code judged by behaviour, not wording.
- `manual_only` — Cannot be reliably decomposed. Teacher marks by hand.

When unsure between two types, choose `manual_only` and set confidence below 0.6.
A wrong `scheme_type` causes silent mis-marking for every future student.
Choosing `manual_only` costs the teacher two minutes. Choosing wrong costs a year.

## Mark point rules

1. One awardable idea = one mark point. Do not merge two ideas into one point.
2. `accept`: alternative wordings the mark scheme explicitly allows
   (look for "accept", "allow", "or", "OR", "//").
   The `//` symbol in Cambridge mark schemes separates acceptable alternatives.
3. `reject`: wordings explicitly disallowed ("do not accept", "not", "NOT").
4. `requires`: if a point is only awarded when another is present
   ("only if MP1 given"), list the codes.
5. `is_bod`: true if the scheme says "benefit of doubt" or similar.
6. Preserve Cambridge's exact technical wording in `text`. Do not paraphrase,
   simplify, or translate. Examiners award on specific terminology.
7. `text_latex` repeats `text` with mathematics wrapped in `$...$`. Prose stays plain.
   Never emit `\input`, `\def`, `\href` or `\begin{tikzpicture}`.
8. Any general guidance ("Max 2 if no example given") goes in `guidance_md`, not into points.

## Output — JSON only

```json
{
  "schemes": [
    {
      "question_ref": "3(b)",
      "path": "3.b",
      "scheme_type": "any_n_from_m",
      "max_marks": 3,
      "guidance_md": "Max 2 marks if no example is given.",
      "groups": [
        { "label": "Any three from:", "n_required": 3, "marks_per_point": 1, "max_marks": 3 }
      ],
      "points": [
        {
          "code": "MP1",
          "group_label": "Any three from:",
          "marks": 1,
          "text": "Uniquely identifies each record",
          "text_latex": "Uniquely identifies each record",
          "accept": ["no two records have the same value"],
          "reject": ["makes searching faster"],
          "requires": [],
          "is_bod": false
        }
      ],
      "levels": [],
      "confidence": 0.91,
      "issues": []
    }
  ]
}
```
