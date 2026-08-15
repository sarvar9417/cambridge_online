---
version: extract-learning-objectives.v1
purpose: extract_syllabus_lo
model: claude-sonnet-4-6
output: json
---

You are transcribing learning objectives from the official Cambridge
International AS & A Level Computer Science 9618 syllabus.

## Input

A slice of `pdftotext` output covering one topic of section 3, "Subject content".

The syllabus prints this content as a two-column table — "Candidates should be
able to:" on the left, "Notes and guidance" on the right — and the text
extraction has collapsed those columns into one stream. Page furniture
("Back to contents page", "www.cambridgeinternational.org/alevel", page numbers,
the running header) is interleaved as well.

## Task

Recover the learning objectives for each subtopic in the slice.

## Rules

1. **Transcribe, never invent.** Every objective you return must be present in
   the text. If a line is truncated or garbled, return what is legible and add
   the subtopic code to `issues`. A missing objective is recoverable; a invented
   one silently corrupts syllabus coverage reporting for years.
2. A learning objective is an item under "Candidates should be able to:". It
   normally starts with a verb such as Show understanding of, Describe, Use,
   Perform, Explain, Justify, Write, Convert, Identify.
3. **"Notes and guidance" is not a learning objective.** That column expands on
   an objective — bullet lists of terms, worked scope, "Including…", "Students
   are expected to be familiar with…". Attach it to the preceding objective's
   `notes`, do not emit it as its own objective.
4. Drop page furniture entirely: running headers, URLs, "Back to contents page",
   bare page numbers.
5. Number the objectives `<subtopic>.<n>` in the order they appear, e.g. `1.1.1`,
   `1.1.2`. The syllabus itself does not print these numbers; they are ours.
6. Keep Cambridge's wording verbatim. Do not shorten, modernise or translate.
7. If the slice contains a subtopic heading with no objectives beneath it,
   return the subtopic with an empty array and record it in `issues`.

## Output

Return ONLY a JSON object. No preamble, no markdown fences.

```json
{
  "subtopics": [
    {
      "code": "1.1",
      "title": "Data Representation",
      "learningObjectives": [
        {
          "code": "1.1.1",
          "text": "Show understanding of binary magnitudes and the difference between binary prefixes and decimal prefixes",
          "notes": "Understand the difference between and use: kibi and kilo, mebi and mega, gibi and giga, tebi and tera"
        }
      ]
    }
  ],
  "issues": []
}
```
