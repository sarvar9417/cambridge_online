# Lesson Studio v3 acceptance checklist

> Current release-level interpretation and pending gates are tracked in
> [`../PROJECT-STATE.md`](../PROJECT-STATE.md). This checklist remains the detailed
> acceptance evidence consumed by `npm run project:state:check`.

- [x] Exact supplied-PDF source coverage plus the formal Book Completeness Audit remains enforced for 9618 Chapter 1 (26/26), 9618 Chapter 13 (24/24) and 0478 Chapter 7 (41/41); `Source Complete` is blocked if any audited category is incomplete.
- [x] Existing chapter objectives/prior knowledge, formal key terms, semantic/emphasised concepts, definitions, worked examples, activities, extension activities, figures, tables, source sidebars/`Find out more`/`Link` material where present, pseudocode/code evidence, chapter review and source diagnostics remain represented in presenter/source evidence; Cambridge Exam Lens enrichment is additive and separately checked.
- [x] Every Chapter 7 subtopic 7.1–7.9 retains an explicit Cambridge past-paper checkpoint.
- [x] 9618 checkpoints remain current-target/exact-compatibility mapped and 2021–2026 scoped.
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
- [x] Presenter toolbar shows the formal Book Completeness Audit result for the active chapter rather than treating page count alone as proof of completeness.
- [x] CI `npm run verify` — final scoped application-hardening main SHA `f3011e88bd3cd7fc59d11346815e306e2a2cd11f`, CI run #2673: success; App lifecycle extraction and all inventoried Lesson Studio import-time DOM lifecycle conversions are included in this verification.
- [ ] Vercel preview / production deployment — verify a READY deployment and smoke test for the release evidence SHA after CI; durable runtime storage remains a separate issue #135 gate.
