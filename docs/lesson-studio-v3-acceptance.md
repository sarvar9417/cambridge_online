# Lesson Studio v3 acceptance checklist

> Current release-level interpretation and pending gates are tracked in
> [`../PROJECT-STATE.md`](../PROJECT-STATE.md). This checklist remains the detailed
> acceptance evidence consumed by `npm run project:state:check`.

- [x] Exact supplied-PDF source coverage remains enforced for 9618 Chapter 1 (26/26), 9618 Chapter 13 (24/24) and 0478 Chapter 7 (41/41).
- [x] Existing examples, activities, tables, figures, keywords and source diagnostics remain in presenter data.
- [x] Every Chapter 7 subtopic 7.1–7.9 retains an explicit Cambridge past-paper checkpoint.
- [x] 9618 checkpoints remain exact-LO and 2021–2025 scoped.
- [x] 0478 checkpoints remain explicit historical/current-LO mappings and do not substitute loosely related questions.
- [x] Exam checkpoint slides include a concise exam-focus teaching layer, separate from source-book content.
- [x] Past-paper opening resolves the exact Cambridge display reference, avoiding an implicit syllabus fallback.
- [x] Question display uses canonical structured content and fails closed when a required visual is unresolved.
- [x] Required parent context and source assets travel with the leaf question.
- [x] Staff mark-scheme detail exposes level descriptors and latest source-audit evidence.
- [x] `needs_review` mark schemes are visibly identified and are not promoted automatically.
- [x] Approved mark schemes remain the preferred staff scheme.
- [x] Accept/reject/requires/BOD details are retained in the teacher scheme workspace where present.
- [x] Existing progressive mark-point reveal, Student/Teacher view and Projector controls remain compatible.
- [x] Long source-complete lessons use a compact board-friendly slide scrubber rather than relying on dozens of tiny dots.
- [x] Presenter toolbar shows the exact supplied-PDF page audit count for the active chapter.
- [x] CI `npm run verify` — candidate SHA `4773ad49228ce39c7517e76011d7ecd336444586`, CI run #2494: success.
- [ ] Vercel preview / production deployment — verify after CI.
