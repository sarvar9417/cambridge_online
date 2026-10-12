# Live Challenge operations runbook

This runbook covers operational monitoring and retention for the existing `live_exam_*` model. It does not authorize deletion of assessment evidence.

## Correlation and privacy-safe HTTP logs

Every API response receives an `x-request-id`. A valid incoming request ID is reused; otherwise the API generates one. Completion/error logs use the same ID so a classroom incident can be traced across Vercel/runtime logs.

HTTP logs deliberately exclude request/response bodies, answer text, join codes and raw UUID path segments. Paths are normalized before logging. Error logs carry category, error class/code, status and request ID rather than serializing arbitrary exception messages that could contain student input or SQL context.

## Owner dashboard signals

`/api/v1/admin/system` exposes aggregate Live signals to owners only:

- active non-terminal sessions;
- question-open sessions already beyond the authoritative database deadline + 10 second grace;
- active participants whose heartbeat is older than two minutes;
- Live event count during the last hour;
- terminal sessions not yet archived;
- archived session count;
- timestamp of the oldest active session update.

An expired open round or stale participant count above zero is an investigation cue, not permission to mutate data directly. First check application/runtime errors and `/api/v1/ready`, then use the normal Live controls or deadline reconciliation path.

## Retention and archive policy

The conservative production policy is:

1. Only `finished` or `cancelled` Live sessions may be archived.
2. Archive is a reversible-history operation at the application level: it sets `archived_at` and `archived_by`; it does not delete questions, answers, reviews, review points, events, score overrides or learning evidence.
3. Assessment evidence has **no automatic deletion job**. Permanent deletion must go through an explicitly authorized privacy/data-governance workflow because it can affect minors, assessment auditability and mastery provenance.
4. Join codes remain protected from reuse for 24 hours after terminal closure, then can safely return to the pool under the existing database guard.
5. Operational cleanup must never delete a non-terminal session or rewrite immutable question/mark-scheme snapshots.

This policy intentionally prefers evidence preservation over an invented time-based deletion period. A legal/business retention period can be introduced later only with an owner-approved policy and a separately tested migration/job.

## Incident sequence

For a classroom incident:

1. Capture the affected request ID from the response/header or runtime log.
2. Check `/api/v1/ready` and the owner System → Live Challenge status panel.
3. If a timed round appears expired but open, call the normal heartbeat/snapshot path or maintenance reconciliation; do not edit the row manually.
4. If database connectivity is failing, stop repeated classroom mutations and recover the database/pooler first.
5. If a session must be terminated, use the authenticated cancel action. Archive only after it is terminal.
6. After recovery, verify the session event versions, final answer/review state and learning evidence before declaring the incident closed.

## Release evidence

LG-P1-10 requires all of the following to stay green:

- privacy-safe request-ID middleware tests;
- owner-only Live operations summary tests;
- existing real PostgreSQL archive acceptance proving terminal-only soft archive preserves evidence;
- full `npm run verify`;
- preview/production readiness and runtime smoke at release time.
