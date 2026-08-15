---
version: extract-markscheme.v2
purpose: extract_ms
model: claude-sonnet-4-6
output: json
---

You are extracting a mark scheme from a Cambridge 9618 mark scheme document.

This is the highest-risk step in the system. A question extracted wrongly is
obvious to the teacher who reads it. A mark scheme extracted wrongly is invisible
and mis-grades every student who ever answers that question.

## Input

Page images at 200 dpi and the `pdftotext -layout` text layer for the same pages.
Trust the text layer for wording; use the image for table structure and for which
column a mark belongs to.

## Task

For each question reference, produce a machine-readable marking structure.

## scheme_type — choose exactly one

- `all_required` — every mark point must be present; marks are the sum of matched points.
- `any_n_from_m` — "Any three from:" — award up to n points from a list of m.
  Create a group with `n_required = n`.
- `levels_of_response` — banded descriptors (Level 1/2/3). Common for Evaluate.
- `exact_match` — a specific value, calculation result, or completed table cell.
- `code_output` — program code judged by behaviour, not wording.
- `manual_only` — cannot be reliably decomposed; a teacher marks it by hand.

**When unsure between two scheme types, choose `manual_only` and set confidence
below 0.6. A wrong `scheme_type` causes silent mis-marking for every future
student. Choosing `manual_only` costs the teacher two minutes. Choosing wrong
costs a year.**

## Mark point rules

1. **One awardable idea = one mark point.** Never merge two ideas into one point,
   even when the scheme prints them on one line.
2. **`//` separates acceptable alternatives.** Cambridge uses it throughout:
   `uniquely identifies a record // no two records share this value`. The first
   becomes `text`, the rest go into `accept`.
3. Words after "accept", "allow", or "or" also go into `accept`.
4. **"do not accept", "not", "NOT" → `reject`.** This list is as valuable as the
   points themselves: it is Cambridge stating what looks right but earns nothing.
5. **"only if MP1 given", "provided MP2 awarded" → `requires: ["MP1"]`.**
6. `is_bod: true` when the scheme says "benefit of doubt" or similar.
7. **Preserve Cambridge's exact technical wording in `text`.** Do not paraphrase,
   simplify, modernise, or translate. Examiners award on specific terminology and
   the grading model compares against this string.
8. **General guidance goes in `guidance_md`, never into points.** "Max 2 if no
   example given" is a constraint on the whole question, not an awardable idea.
9. For `levels_of_response`, emit `levels` with the band descriptors verbatim.
   Do not invent mark points for a banded scheme.
10. `confidence` is per scheme, 0–1, and honest.

## Output — JSON only, no fences

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
          "accept": ["no two records have the same value"],
          "reject": ["makes searching faster"],
          "requires": [],
          "is_bod": false
        }
      ],
      "levels": [],
      "confidence": 0.91,
      "issues": []
    },
    {
      "question_ref": "5(d)",
      "path": "5.d",
      "scheme_type": "levels_of_response",
      "max_marks": 6,
      "guidance_md": "Award marks for the quality of the evaluation, not the number of points made.",
      "groups": [],
      "points": [],
      "levels": [
        {
          "level_number": 3,
          "min_marks": 5,
          "max_marks": 6,
          "descriptor_md": "A thorough evaluation with a justified conclusion. Both benefits and drawbacks are considered and weighed against each other."
        },
        {
          "level_number": 2,
          "min_marks": 3,
          "max_marks": 4,
          "descriptor_md": "Benefits and drawbacks are described. Some attempt at a conclusion, but it is not fully justified."
        },
        {
          "level_number": 1,
          "min_marks": 1,
          "max_marks": 2,
          "descriptor_md": "Statements are made about benefits or drawbacks with little or no development."
        },
        {
          "level_number": 0,
          "min_marks": 0,
          "max_marks": 0,
          "descriptor_md": "No creditable response."
        }
      ],
      "confidence": 0.88,
      "issues": []
    }
  ]
}
```

A banded scheme has `levels` and empty `groups` and `points`; a pointed scheme
has `points` and an empty `levels`. Never both. Each entry of `levels` is exactly
`level_number`, `min_marks`, `max_marks` and `descriptor_md`, and each entry of
`points` and `groups` is exactly the keys shown above -- any other key rejects
the whole extraction.
