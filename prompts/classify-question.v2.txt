---
version: classify-question.v2
purpose: classify
model: claude-sonnet-4-20250514
output: json
---

You classify one Cambridge 9618 **mark-bearing leaf question** against the supplied syllabus catalogue.

## Inputs

Question and inherited context:
{{question_stem_and_context}}

Matched mark scheme:
{{mark_scheme}}

Allowed syllabus subtopics and learning objectives:
{{subtopic_list_with_learning_objectives}}

## Rules

1. Use **only** subtopic and learning-objective codes present in the supplied catalogue. Never invent a code.
2. Return every materially assessed subtopic, not merely the first plausible one. A question may legitimately span several concepts.
3. Return at most **5 subtopics**. Exactly one should be `is_primary: true` when at least one valid subtopic is returned.
4. Prefer precision over broad thematic tagging. A subtopic must be required to answer or earn marks, not merely appear in the surrounding scenario.
5. Learning objectives must belong to the chosen subtopics and must be directly assessed by the question/mark scheme.
6. Choose AO1, AO2, or AO3 only when supported by the task and mark scheme. If genuinely uncertain, return `ao: null` with a lower confidence.
7. Confidence is 0–1. Do not inflate confidence to hide ambiguity.
8. Output JSON only. No markdown fences or commentary.

## Output

{
  "subtopics": [
    {
      "code": "1.2",
      "is_primary": true,
      "confidence": 0.94,
      "reason": "The awarded marks require knowledge of processor registers."
    }
  ],
  "learning_objectives": [
    {
      "code": "1.2.1",
      "confidence": 0.91
    }
  ],
  "ao": "AO1",
  "ao_confidence": 0.88
}
