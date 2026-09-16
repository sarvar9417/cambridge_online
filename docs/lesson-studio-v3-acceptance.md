# Lesson Studio v3 acceptance checklist

> Current release-level interpretation and pending gates are tracked in
> [`../PROJECT-STATE.md`](../PROJECT-STATE.md). This checklist remains the detailed
> acceptance evidence consumed by `npm run project:state:check`.

- [x] Teacher Lesson Studio exposes the source-backed Cambridge 9618 Chapter 1–20 catalog and keeps Cambridge 0478 Chapter 7 as a separate course-aware route; the overlapping Chapter 7 routes remain isolated by course and slide identity.
- [x] Student Study Mode mirrors the complete 9618 Chapter 1–20 lesson catalog. The separate 0478 Chapter 7 route is preserved for a future explicit course-aware student extension rather than being conflated with 9618 Chapter 7.
- [x] Every active 9618 chapter is locked to its exact Hodder chapter range, and course-wide CI fails if any printed Hodder page disappears from active lesson provenance.
- [x] The formal Book Completeness Audit remains enforced for the independently inventoried exact extracts: 9618 Chapter 1 (26/26), 9618 Chapter 13 (24/24) and 0478 Chapter 7 (41/41); `Source Complete` is blocked if any audited category is incomplete.
- [x] Existing chapter objectives/prior knowledge, formal key terms, semantic/emphasised concepts, definitions, worked examples, activities, extension activities, figures, tables, source sidebars/`Find out more`/`Link` material where present, pseudocode/code evidence, chapter review and source diagnostics remain represented in presenter/source evidence; Cambridge Exam Lens enrichment is additive and separately checked.
- [x] Every declared lesson subtopic remains reachable through the semantic Chapter → Topic → Page model with at least one content page; duplicate or cross-chapter topic codes fail CI.
- [x] Active 9618 slide IDs are globally unique, presentation beats remain chapter-scoped, and chapter source-page declarations stay within their named provenance boundary.
- [x] Printed Cambridge 9608 review questions remain source-backed study/review material and cannot silently become live current `examPractice`.
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
- [ ] Vercel preview / production deployment — intentionally deferred for the final preview/runtime pass after provider and durable-storage readiness are handled.
