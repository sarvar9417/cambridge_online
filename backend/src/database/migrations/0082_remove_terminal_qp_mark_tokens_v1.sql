-- Remove published terminal [marks] annotations that were retained in a small
-- Paper 4 practical subset. Scope is deliberately narrow and the token must
-- exactly equal the leaf's DB mark. Every changed value is backed up first.

CREATE TEMP TABLE _qp_terminal_mark_cleanup ON COMMIT DROP AS
SELECT
  q.id question_id,
  q.source_paper_id,
  sp.sha256 source_sha256,
  q.stem_md old_stem_md,
  q.context_md,
  q.display_ref,
  regexp_replace(q.stem_md,'[[:space:]]*\[[[:space:]]*'||q.marks::text||'[[:space:]]*\][[:space:]]*$','','g') new_stem_md
FROM public.questions q
JOIN public.source_papers sp ON sp.id=q.source_paper_id
JOIN public.components c ON c.id=q.component_id
JOIN public.syllabi s ON s.id=sp.syllabus_id
WHERE sp.kind='QP'::paper_kind
  AND s.code='9618'
  AND sp.series='MJ'::exam_series
  AND sp.year IN (2021,2024)
  AND c.number=4
  AND q.marks>0
  AND q.stem_md ~ ('\[[[:space:]]*'||q.marks::text||'[[:space:]]*\][[:space:]]*$');

INSERT INTO public.question_source_repair_history(
  question_id,source_paper_id,repair_tag,source_sha256,
  old_hash,new_hash,old_stem_md,old_context_md,old_display_ref,
  new_stem_md,new_context_md,new_display_ref
)
SELECT
  x.question_id,x.source_paper_id,'remove-terminal-qp-mark-token-v1',x.source_sha256,
  md5(coalesce(x.old_stem_md,'')||chr(31)||coalesce(x.context_md,'')||chr(31)||coalesce(x.display_ref,'')),
  md5(coalesce(x.new_stem_md,'')||chr(31)||coalesce(x.context_md,'')||chr(31)||coalesce(x.display_ref,'')),
  x.old_stem_md,x.context_md,x.display_ref,
  x.new_stem_md,x.context_md,x.display_ref
FROM _qp_terminal_mark_cleanup x
WHERE x.old_stem_md IS DISTINCT FROM x.new_stem_md;

UPDATE public.questions q
SET stem_md=x.new_stem_md,
    updated_at=now()
FROM _qp_terminal_mark_cleanup x
WHERE q.id=x.question_id
  AND q.stem_md IS DISTINCT FROM x.new_stem_md;

DO $$
BEGIN
  IF EXISTS(
    SELECT 1
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id
    JOIN public.components c ON c.id=q.component_id
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    WHERE sp.kind='QP'::paper_kind
      AND s.code='9618'
      AND sp.series='MJ'::exam_series
      AND sp.year IN (2021,2024)
      AND c.number=4
      AND q.marks>0
      AND q.stem_md ~ ('\[[[:space:]]*'||q.marks::text||'[[:space:]]*\][[:space:]]*$')
  ) THEN RAISE EXCEPTION 'terminal_qp_mark_cleanup_post_gate_failed'; END IF;
END $$;
