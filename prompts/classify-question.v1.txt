---
version: classify-question.v1
purpose: classify
output: json
---

Classify this 9618 exam question against the syllabus.

Question: {stem_latex}
Command word: {command_word}, Marks: {marks}
Paper: {component_name} ({level})
Mark scheme points: {ms_points_text}

Available subtopics for this component:
{subtopic_list_with_learning_objectives}

## Rules

- The mark scheme is stronger evidence than the question stem. What the examiner
  rewards tells you what is actually being tested.
- Return 1 primary subtopic, plus up to 2 secondary ones if the question genuinely
  spans them. Most questions have exactly one.
- Only propose a learning objective if the mark points map onto it directly.
- Do not force a match. If nothing fits above 0.6 confidence, return an empty array.

## Output

```json
{
  "subtopics": [
    { "code": "8.1", "is_primary": true, "confidence": 0.93, "reason": "Mark points are about entity integrity" }
  ],
  "learning_objectives": [{ "code": "8.1.2", "confidence": 0.85 }],
  "ao": "AO2",
  "ao_confidence": 0.8
}
```
