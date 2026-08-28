# Question Bank → PDF/Word Milestone

## Goal

Make the Cambridge 9618 Question Bank directly useful for a teacher workflow:

**Topic/Subtopic search → select questions → preview → download PDF or editable Word (.docx).**

This milestone intentionally prioritizes teacher worksheet generation ahead of broader assignment/grading/analytics work.

## Existing foundation

- 2021–2025 supplied Cambridge 9618 corpus is present in production.
- 118/118 supplied QP/MS pairs.
- 2,985 mark-bearing question leaves.
- Question Bank already supports topic/subtopic, component, year, series, marks, command word, keyword and diagram/dependency filtering.
- Selection/basket and portable-question context handling already exist.
- PDF export infrastructure already exists for assignment/submission exports.

## Target user flow

1. Open Question Bank.
2. Filter by Paper, Topic, Subtopic, Year, Series, Marks, Command Word, keyword and diagram/dependency state.
3. Select one or more questions into a basket.
4. Review selected questions, total marks, source references and required context/dependencies.
5. Export directly from the selection without requiring an assignment.
6. Download one of:
   - Questions-only PDF
   - Questions + Mark Scheme PDF
   - Mark Scheme-only PDF
   - Editable Word (.docx) worksheet
   - Editable Word (.docx) worksheet + mark scheme where supported

## Delivery phases

### Phase 1 — Question Bank UX polish
- Keep existing topic/subtopic filters.
- Make selection state prominent.
- Show selected-count and total marks persistently.
- Add clear Preview / Download PDF / Download Word actions.
- Preserve source reference, topic/subtopic and marks in preview metadata.

### Phase 2 — Direct selection export API
- Add export target support for selections, not only assignments/submissions.
- Reuse portable snapshots/context and dependency preflight.
- Do not require a class or assignment to create a worksheet.
- Preserve fresh numbering separately from Cambridge source references.

### Phase 3 — PDF export
- Reuse existing HTML/Puppeteer renderer.
- Support questions-only, combined and mark-scheme-only outputs.
- Include title, optional teacher/school metadata, Name/Class/Date lines and total marks.
- Fail closed when a required diagram/context asset cannot be embedded.

### Phase 4 — DOCX export
- Add a real .docx generator.
- Keep document editable in Microsoft Word/LibreOffice.
- Preserve headings, numbering, marks, tables, code/pseudocode and images as faithfully as possible.
- Use the same canonical selection/export data as PDF so formats cannot drift semantically.

### Phase 5 — Asset/rendering quality gate
Audit questions with diagrams, tables, logic circuits, flowcharts, pseudocode, formulas and parent/dependency context.

Required checks:
- no missing required context;
- no silently dropped storage-only images;
- readable tables/code/formulas;
- fresh numbering stable;
- source references preserved;
- total marks exact.

### Phase 6 — E2E verification
Test at least:
- Paper 1 text question;
- Paper 1 diagram/table question;
- Paper 2 pseudocode/trace-table question;
- Paper 3 logic/database question;
- Paper 4 practical/programming question where export is defensible;
- multi-part family;
- dependency-bearing question;
- single-question export;
- 20+ question worksheet;
- PDF questions-only;
- PDF combined;
- DOCX editable export.

## Acceptance criteria

The milestone is complete only when a teacher can:

1. find questions by topic/subtopic;
2. select arbitrary questions;
3. review total marks and dependencies;
4. download a correct PDF directly from the selection;
5. download an editable DOCX directly from the selection;
6. receive an explicit blocking error instead of an incomplete document if required visual/context evidence is unavailable.

## Estimated engineering effort

- Question Bank UX polish: 3–5 h
- Selection workflow polish: 2–3 h
- Direct PDF export: 4–6 h
- DOCX export: 5–8 h
- Asset/table/formula quality handling: 4–8 h
- E2E tests and fixes: 4–6 h

**Estimated total: 22–36 engineering hours.**

## Branch

`feature/question-bank-pdf-word`
