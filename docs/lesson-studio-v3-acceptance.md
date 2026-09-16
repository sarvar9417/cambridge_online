# Lesson Studio v3 acceptance checklist

> Current release-level interpretation and pending gates are tracked in
> [`../PROJECT-STATE.md`](../PROJECT-STATE.md). This checklist remains the detailed
> acceptance evidence consumed by `npm run project:state:check`.

- [x] Teacher Lesson Studio exposes the source-backed Cambridge 9618 Chapter 1–20 catalog and keeps Cambridge 0478 Chapter 7 as a separate course-aware route; Student Study Mode mirrors 9618 Chapter 1–20; every active 9618 chapter stays inside its exact Hodder chapter range and course-wide CI fails if a printed Hodder page disappears. The stricter independently inventoried Book Completeness Audit remains enforced for 9618 Chapter 1 (26/26), 9618 Chapter 13 (24/24) and 0478 Chapter 7 (41/41).
- [x] Existing chapter objectives/prior knowledge, formal key terms, semantic/emphasised concepts, definitions, worked examples, activities, extension activities, figures, tables, source sidebars/`Find out more`/`Link` material where present, pseudocode/code evidence, chapter review and source diagnostics remain represented in presenter/source evidence; every declared subtopic remains reachable through the semantic Chapter → Topic → Page model, active 9618 slide IDs remain globally unique, presentation beats stay chapter-scoped, and printed 9608 review material cannot silently become live current `examPractice`.
- [x] Every 0478 Chapter 7 subtopic 7.1–7.9 retains an explicit Cambridge past-paper checkpoint.
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
- [x] Presenter toolbar shows the formal Book Completeness Audit result where that stricter semantic inventory applies rather than treating page count alone as proof of completeness.
- [x] CI `npm run verify` — course-wide lesson static hardening through merged main SHA `a523acec971c7883651e4d80097e2ee15c8702f4` passed; this includes complete Hodder page coverage, declared-subtopic routing integrity, presentation isolation, historical-review practice protection and the existing application test/build gates.
- [ ] Vercel preview / production deployment — verify in the intentionally deferred final preview/runtime pass after provider rate-limit window and durable-storage configuration.
