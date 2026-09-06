# Lesson Studio v3 implementation notes

This branch intentionally keeps the existing source-complete chapter data intact and changes the teaching/exam surface around it.

Review focus:

1. `lesson-exam-workspace-v3.ts` replaces the legacy Lesson Studio card action after the existing enhancer has attached it, so other Question Bank consumers remain unchanged.
2. The replacement resolves by exact `display_ref` through `/questions/by-ref`, removing the 0478 checkpoint re-query that previously omitted `syllabusCode`.
3. Canonical `content_json` is mandatory for the new workspace. Missing structured content or unresolved required visuals fail closed.
4. Staff question detail now returns mark-scheme levels and latest `mark_scheme_source_audits` evidence. Student visibility rules are unchanged.
5. `needs_review` schemes stay `needs_review`; the UI explains the trust state instead of treating them as reviewed.
6. `lesson-exam-insights.ts` is additive teacher guidance. It is deliberately separated from the source-book reconstruction and from the per-question mark scheme.
7. `lesson-studio-professional-controls.ts` keeps the existing React lesson implementation but progressively replaces the long dot strip with a range scrubber and adds the supplied-PDF audit badge.
