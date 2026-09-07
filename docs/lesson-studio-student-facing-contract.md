# Lesson Studio — student-facing classroom contract

Lesson Studio is a classroom presentation surface, not a teacher-method manual.

## Primary invariant

When a lesson is projected, the student should be able to learn from the screen itself. The lesson canvas must present the concept, vocabulary, explanation, worked reasoning, visual model, task and assessment material directly. Wording such as “ask learners…”, “tell students…”, “use this before teaching…” or internal corpus/source-audit instructions must not be the projected lesson.

Teacher operational controls may exist as chrome outside the learning canvas, but source provenance and implementation diagnostics must not compete with the lesson in Board mode.

## Learning sequence

A lesson should move through the following cycle where the source material supports it:

1. **Learn** — clear concept explanation and key vocabulary.
2. **See it** — worked example, table, diagram, code or other source-backed representation.
3. **Your turn** — a visible learner task or question; the model answer stays hidden until deliberately revealed.
4. **Explain** — learners articulate reasoning, not only recall a term.
5. **Cambridge practice** — real approved past-paper questions matched to the learning point.
6. **Check and improve** — mark scheme is revealed only after an attempt, then learners improve their response.

## Cambridge assessment contract

Past-paper practice must preserve the exact Cambridge occurrence and its source identity. The focused question workspace must retain required parent context, tables, diagrams/assets, structured question content, marks and source reference. Missing required visual/context fails closed rather than silently presenting an incomplete question.

The main lesson screen must not expose learning-objective IDs, source hashes, ingestion terminology or review/audit implementation detail to students. Such provenance remains available to teacher/system tooling.

Mark schemes are not shown before the attempt. In the student view the question dominates the board; teacher view may expose mark points and trust/provenance controls for controlled feedback.

## Content fidelity

The student-facing projection may change instructional voice (for example, “Ask learners to compare…” → “Compare…”), labels and presentation chrome. It must not rewrite program code, diagrams, source geometry, Cambridge question text, marks, source reference or academic meaning.

Source notes that contain an academically useful distinction are presented as an **Exam note** using learner-friendly labels such as **Coursebook wording** and **Exam-ready wording**. Raw source trace remains stored but is kept out of the student canvas.

## Board design

Board mode prioritises:

- large, high-contrast titles and explanatory text;
- one clear visual hierarchy per screen;
- tasks visible without opening a hidden teacher accordion;
- model answers hidden until requested;
- minimal operational chrome;
- readable tables, diagrams, code and question structures;
- consistent labels: LEARN, WORKED EXAMPLE, YOUR TURN, THINK / EXPLAIN, CAMBRIDGE PRACTICE, MODEL ANSWER.

Regression tests must protect the student-facing wording contract and source-fidelity separation.
