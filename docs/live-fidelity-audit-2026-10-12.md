# Live Challenge source-fidelity audit — 2026-10-12

## Scope

Audit the full question-delivery path for Cambridge 9618 Live Challenge:

`database -> question serializer / portable snapshot -> Live API -> shared structured renderer -> teacher / student / projector UI`.

The acceptance target is source-faithful display for text, tables, code/pseudocode, diagrams/images, and dependent subquestions. Incomplete source content must fail closed rather than fall back to misleading OCR/repair prose.

## Current verified baseline

- Main branch Live Browser E2E is green on the latest Live-affecting main commit.
- Live uses `StructuredQuestionView` for canonical `content_json`.
- Required visual assets are checked by the source-visual readiness gate.
- Canonical structured content fails closed when invalid or when an asset URL is unresolved.
- Storage-backed or inline-SVG source visuals are preferred over semantic reconstruction.
- Legacy semantic tables/code can be enhanced into real table/code DOM instead of remaining flattened `<pre>` text.
- Wide tables and source visuals have dedicated overflow/readability CSS.

## Audit finding 1 — P0 regression-coverage gap

The current real browser Live E2E fixture is text-only: `9618/11/M/J/26 Q1(a)` (“Define the term binary number system.”).

That proves the Teacher -> Projector -> Student state flow, privacy boundary, draft recovery and ordinary canonical text rendering, but it does **not** prove the main source-fidelity failure modes that triggered this audit:

1. table / truth-table display,
2. source diagram / image display,
3. code / pseudocode display,
4. multi-part/dependency context display.

Unit/static tests cover parts of these paths, but there is no browser-level regression matrix that renders representative source-backed fixtures through the actual Live session flow.

## Required remediation

### P0
- Extend `db:seed:live-e2e` with deterministic, source-faithful fixture questions for:
  - semantic table/truth table,
  - source visual asset,
  - pseudocode/code,
  - dependent subquestion.
- Keep fixtures local-only and deterministic.
- Verify each fixture satisfies the same production readiness gates used by Live.
- Exercise each fixture in the Teacher + Projector + Student browser path.
- Assert:
  - no `.structured-question-invalid` or integrity error,
  - expected table/code/image DOM exists,
  - source image has non-zero natural size,
  - no document-level horizontal overflow,
  - dependency context appears before the dependent leaf,
  - no raw SVG/XML or pipe-table repair text leaks into the classroom UI.

### P1
- Capture screenshots for each archetype and publish them as the Live E2E artifact.
- Add a compact JSON evidence manifest recording ref, archetype, renderer path and pass/fail checks.
- Add a regression check that source-backed tables prefer the exact source image when a trusted URL exists.

### P2
- Add viewport coverage for projector, desktop student and narrow mobile student.
- Add a zoom/readability check for unusually tall/wide source diagrams.

## Completion conditions

This audit item is complete only when all four archetypes pass the real browser flow on CI and the evidence artifact contains screenshots + machine-readable assertions. A green text-only Live test is not sufficient evidence for source fidelity.
