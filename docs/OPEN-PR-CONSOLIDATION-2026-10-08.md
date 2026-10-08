# Open PR consolidation — 2026-10-08

This document records the one-time consolidation of the repository's outstanding pull requests onto the current `main` line. The rule for this pass is conservative: do not merge stale branches wholesale; retain only changes that are still useful, compatible with current architecture, and covered by current CI.

## Retained into the consolidated branch

| PR | Decision | Retained work |
|---|---|---|
| #298 | Keep | Live browser smoke now verifies KaTeX + MathML + accessible Boolean-expression rendering in teacher/projector/student contexts. |
| #290 | Keep, adapted | Real-browser Live Challenge E2E with local PostgreSQL, deterministic question selection, teacher/projector/three-student flow, screenshots and browser/API error checks. Its local migration runner is updated through current Live migrations 0204 and 0205. |
| #265 | Keep selected additions | Source-backed Chapter 11 and 12 classroom visuals plus their responsive CSS and regression coverage. |
| #168 | Keep parser fix only | Headerless Cambridge mark-scheme pages are accepted only with explicit mark/marks evidence in a far-right mark zone. The old scroll-controller code is not retained because current main already has a newer lifecycle implementation. |
| #50 | Keep | Login rate-limit buckets refund 5xx server failures while still counting 4xx credential failures. |

## Intentionally not merged

| PR | Disposition | Reason |
|---|---|---|
| #277 | Separate unfinished research branch | Large draft visual-fidelity execution branch is behind current main and contains migration numbering that collides with the current production migration line. It must not be imported without a fresh source-by-source rebase and migration renumbering. |
| #276 | Superseded by later visual-fidelity work | Draft evidence programme predates current generic visual-integrity guards and later source repairs. |
| #275 | Historical audit | Audit-only artifact predates later execution and current production state. |
| #272 | Superseded by newer approved mainline work | This PR removed Chapter 4/5 real decks at 11:39 on 2026-09-21, but current main later added the verified Chapter 4 deck at 11:42 and the verified Chapter 5 deck at 12:03, followed by high-resolution WebP upgrades. The newer mainline decks are therefore retained. |
| #267 | Superseded by current Live Challenge | Old release candidate is far behind the unified Live implementation now on main, including later DB/browser/peer-marking/source-fidelity hardening. |
| #262 | Superseded explicitly by #267 and then current main | Do not reintroduce an older Live service/UI implementation. |
| #258 | Superseded architecture | Split-service Live convergence experiment conflicts with the current unified service and route model. |
| #257 | Superseded architecture | Earlier convergence layer is obsolete relative to current main. |
| #256 | Stale acceptance documentation | Documentation-only change predates the current Lesson Studio catalog/state. |
| #181 | Superseded original Live Challenge implementation | Separate legacy `live-challenge-*` stack would duplicate the current `live-exam-*` runtime. |
| #197 | Stale presentation rebuild | Large draft is hundreds of commits behind current presentation/Lesson Studio architecture and would replace newer source-complete content. |
| #194 | Superseded Chapter 13 presentation work | Current Chapter 13 route has moved beyond this old three-file draft. |
| #21 | Superseded UI redesign | Very old global shell/CSS redesign is over one thousand commits behind current UI. |

## Current release principle

The consolidated branch starts from current `main` and carries only the retained deltas above. It does not import old Live architectures, stale global UI rewrites, stale presentation replacements, or draft visual-fidelity migrations. The branch must pass normal repository CI, real-database Live acceptance, current browser acceptance, and the retained full-stack Live browser E2E before merge.
