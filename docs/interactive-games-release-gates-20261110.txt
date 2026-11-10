# Interactive Games release gates — 10 November 2026

**Status:** Development only. No merge, production migration, or deployment is authorized by this document.

## Database dependencies

1. Verify the existing 0214_interactive_game_practice_history.sql migration is applied and the private interactive_game_practice_runs table exists. It was **absent** in the production read-only check on 10 November 2026.
2. Choose **exactly one** of the competing 0215 spaced-review designs:
   - PR #392: 0215_interactive_game_spaced_review.sql (Leitner schedule, trigger, historical backfill, due-term Quiz).
   - PR #393: 0215_interactive_game_spaced_repetition.sql (adaptive ease, backend atomic CTE, explicit Flash Cards self-rating).
   Do not apply both migrations without an explicit reconciliation design; they create different schedule tables and semantics.
3. Review privacy wording before teacher aggregate reports are enabled. Individual student practice was previously described as private; PR #395 intentionally exposes only class-level aggregates after a five-participant threshold.
4. Test on an isolated database first. Inspect the migration ledger and row-level security, then request explicit production approval.

## Release acceptance checks

- Student saves a practice run once; replay of the same run UUID does not double-advance any schedule.
- Student cannot read another student's practice history or schedule.
- Teacher Classroom Mode runs without writing student grades or practice records.
- Teacher can read only assigned-class or same-school owner aggregates; students receive 403 and unrelated teachers receive 404.
- Reports stay hidden until five distinct current class members have participated within 30 days.
- Term-level difficulty requires five distinct learners for the same term.
- Self-rated Flash Cards never count as objectively scored first attempts or official mastery.
- Current syllabus and hidden/quarantined glossary rules remain enforced.
- Verify desktop and mobile browser behavior, full CI and migration tests.
- Have a rollback path for application code; do not drop practice data on a failed release.

## Merge sequencing (after approval)

- Resolve #392 versus #393 before merging either.
- Classroom Mode #394 can merge independently when CI and review pass.
- Class reports #395 require practice-history migration #0214 to be deployed before the endpoint is activated.
- Source audit #391 has no automatic right to promote quarantined definitions merely because the textbook mentions a concept.
