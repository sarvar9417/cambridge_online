-- Reconcile stale visual-fidelity ledger rows after the v6 full-corpus audit.
--
-- The repair migration and runtime/source-visual v6 predicate were checked over
-- every answerable 9618 leaf for 2021-2026 before this ledger cleanup: zero
-- learner-facing visual blockers remained. This migration intentionally does
-- NOT promote question review status. Other taxonomy/source review reasons stay
-- authoritative and Live Challenge still enforces the runtime fail-closed guard.
UPDATE public.validation_findings vf
SET resolved_at=now(),
    resolution='source-visual v6 full-corpus reconciliation: current canonical visual-readiness contract reports no blocker; review status preserved.'
FROM public.questions q
JOIN public.source_papers sp
  ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
JOIN public.syllabi sy ON sy.id=sp.syllabus_id
WHERE vf.ref_table='questions'
  AND vf.ref_id=q.id
  AND vf.rule_code='source_visual_required_but_missing'
  AND vf.resolved_at IS NULL
  AND sy.code='9618'
  AND sp.year BETWEEN 2021 AND 2026;
