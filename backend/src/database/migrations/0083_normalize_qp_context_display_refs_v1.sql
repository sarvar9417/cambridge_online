-- Canonicalise non-mark-bearing QP parent/context references used by portable
-- exports. Leaf references are handled by 0081. Parent and leaf may intentionally
-- share the same printed reference (notably 9618/11/M/J/23 Q6), so uniqueness is
-- required only for leaf refs, not for this context-node migration.

CREATE TEMP TABLE _qp_context_ref_normalization ON COMMIT DROP AS
SELECT
  q.id question_id,
  q.source_paper_id,
  sp.sha256 source_sha256,
  q.stem_md,
  q.context_md,
  q.display_ref old_display_ref,
  '9618/'||c.number::text||sp.variant::text||'/'||
    CASE sp.series::text WHEN 'MJ' THEN 'M/J' WHEN 'ON' THEN 'O/N' WHEN 'FM' THEN 'F/M' ELSE sp.series::text END||'/'||
    right(sp.year::text,2)||' Q'||split_part(q.path,'.',1)||
    CASE WHEN array_length(string_to_array(q.path,'.'),1)>=2 THEN '('||split_part(q.path,'.',2)||')' ELSE '' END||
    CASE WHEN array_length(string_to_array(q.path,'.'),1)>=3 THEN '('||split_part(q.path,'.',3)||')' ELSE '' END new_display_ref
FROM public.questions q
JOIN public.source_papers sp ON sp.id=q.source_paper_id
JOIN public.components c ON c.id=q.component_id
JOIN public.syllabi s ON s.id=sp.syllabus_id
WHERE sp.kind='QP'::paper_kind
  AND s.code='9618'
  AND q.marks IS NULL;

INSERT INTO public.question_source_repair_history(
  question_id,source_paper_id,repair_tag,source_sha256,
  old_hash,new_hash,old_stem_md,old_context_md,old_display_ref,
  new_stem_md,new_context_md,new_display_ref
)
SELECT
  n.question_id,n.source_paper_id,'canonical-context-ref-v1',n.source_sha256,
  md5(coalesce(n.stem_md,'')||chr(31)||coalesce(n.context_md,'')||chr(31)||coalesce(n.old_display_ref,'')),
  md5(coalesce(n.stem_md,'')||chr(31)||coalesce(n.context_md,'')||chr(31)||n.new_display_ref),
  n.stem_md,n.context_md,n.old_display_ref,
  n.stem_md,n.context_md,n.new_display_ref
FROM _qp_context_ref_normalization n
WHERE n.old_display_ref IS DISTINCT FROM n.new_display_ref;

UPDATE public.questions q
SET display_ref=n.new_display_ref,
    updated_at=now()
FROM _qp_context_ref_normalization n
WHERE q.id=n.question_id
  AND q.display_ref IS DISTINCT FROM n.new_display_ref;

DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM _qp_context_ref_normalization n
    JOIN public.questions q ON q.id=n.question_id
    WHERE q.display_ref IS DISTINCT FROM n.new_display_ref
  ) THEN RAISE EXCEPTION 'canonical_qp_context_ref_post_gate_failed'; END IF;
END $$;
