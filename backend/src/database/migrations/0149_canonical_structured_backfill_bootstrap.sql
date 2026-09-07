-- Structured-content backfill must operate on canonical physical QP trees once.
-- Exact equivalent official variants retain their provenance through
-- question_source_occurrences, but they must not be reparsed as a second question tree.
--
-- This replaces the pre-canonicalization bootstrap assumptions that every official
-- source_paper owns questions directly. apply_structured_content_backfill_v1 remains
-- deliberately strict: its sourcePaperId must be the canonical physical QP whose SHA
-- produced the structured content.

CREATE OR REPLACE FUNCTION public.structured_content_backfill_bootstrap_v1(
  p_syllabus_code text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_source_papers integer;
  v_papers_with_leaves integer;
  v_leaf_count integer;
  v_result jsonb;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported syllabus code';
  END IF;

  SELECT count(*)::integer INTO v_source_papers
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code=p_syllabus_code
    AND sp.kind='QP'::paper_kind
    AND sp.source_url IS NOT NULL
    AND nullif(btrim(sp.sha256),'') IS NOT NULL
    AND NOT EXISTS(
      SELECT 1 FROM public.source_paper_equivalences e
      WHERE e.source_paper_id=sp.id AND e.equivalence_kind='exact_content'
    );

  SELECT count(DISTINCT sp.id)::integer,count(q.id)::integer
  INTO v_papers_with_leaves,v_leaf_count
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.questions q ON q.source_paper_id=sp.id
  WHERE s.code=p_syllabus_code
    AND sp.kind='QP'::paper_kind
    AND sp.source_url IS NOT NULL
    AND nullif(btrim(sp.sha256),'') IS NOT NULL
    AND NOT EXISTS(
      SELECT 1 FROM public.source_paper_equivalences e
      WHERE e.source_paper_id=sp.id AND e.equivalence_kind='exact_content'
    )
    AND q.marks IS NOT NULL
    AND q.status IN ('approved','needs_review');

  IF v_source_papers=0 THEN RAISE EXCEPTION 'structured_backfill_scope_empty'; END IF;
  IF v_papers_with_leaves<>v_source_papers THEN
    RAISE EXCEPTION 'structured_backfill_uningested_canonical_sources:%/%',v_papers_with_leaves,v_source_papers;
  END IF;

  IF EXISTS(
    SELECT 1
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    WHERE s.code=p_syllabus_code
      AND sp.kind='QP'::paper_kind
      AND sp.source_url IS NOT NULL
      AND nullif(btrim(sp.sha256),'') IS NOT NULL
      AND NOT EXISTS(
        SELECT 1 FROM public.source_paper_equivalences e
        WHERE e.source_paper_id=sp.id AND e.equivalence_kind='exact_content'
      )
      AND (
        SELECT coalesce(sum(q.marks),0)
        FROM public.questions q
        WHERE q.source_paper_id=sp.id
          AND q.marks IS NOT NULL
          AND q.status IN ('approved','needs_review')
      )<>c.total_marks
  ) THEN
    RAISE EXCEPTION 'structured_backfill_canonical_paper_mark_gate_failed';
  END IF;

  SELECT jsonb_build_object(
    'version','structured-content-backfill-bootstrap-v1',
    'canonicalSourceMode',true,
    'syllabusCode',p_syllabus_code,
    'paperCount',v_source_papers,
    'leafCount',v_leaf_count,
    'sources',coalesce(jsonb_agg(source_row ORDER BY
      (source_row->>'year')::integer,source_row->>'series',
      (source_row->>'component')::integer,(source_row->>'variant')::integer
    ),'[]'::jsonb)
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'sourcePaperId',sp.id,'sourceUrl',sp.source_url,'sourceSha256',lower(sp.sha256),
      'syllabusCode',s.code,'component',c.number,'variant',sp.variant,
      'series',sp.series::text,'year',sp.year,
      'leaves',(
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'questionId',q.id,'path',q.path,'displayRef',q.display_ref,
          'stemMd',q.stem_md,'contextMd',q.context_md,'marks',q.marks,
          'answerKind',q.answer_kind::text,'answerLines',q.answer_lines,
          'status',q.status::text,'contentVersion',q.content_version,
          'hasOpenFidelityFinding',EXISTS(
            SELECT 1 FROM public.validation_findings vf
            WHERE vf.ref_table='questions' AND vf.ref_id=q.id
              AND vf.resolved_at IS NULL AND vf.severity='error'
              AND vf.rule_code IN (
                'source_structure_required_but_missing_table',
                'source_structure_required_but_missing_layout',
                'source_visual_required_but_missing'
              )
          ),
          'assets',(
            SELECT coalesce(jsonb_agg(jsonb_build_object(
              'id',qa.id,'kind',qa.kind::text,'contentMd',qa.content_md,
              'storagePath',qa.storage_path,'altText',qa.alt_text,
              'sortOrder',qa.sort_order,'sourcePage',qa.source_page,
              'sourceBbox',qa.source_bbox,'contentHash',qa.content_hash,
              'cropStatus',qa.crop_status
            ) ORDER BY qa.sort_order,qa.id),'[]'::jsonb)
            FROM public.question_assets qa WHERE qa.question_id=q.id
          )
        ) ORDER BY q.sort_order,q.id),'[]'::jsonb)
        FROM public.questions q
        WHERE q.source_paper_id=sp.id
          AND q.marks IS NOT NULL
          AND q.status IN ('approved','needs_review')
      )
    ) source_row
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    WHERE s.code=p_syllabus_code
      AND sp.kind='QP'::paper_kind
      AND sp.source_url IS NOT NULL
      AND nullif(btrim(sp.sha256),'') IS NOT NULL
      AND NOT EXISTS(
        SELECT 1 FROM public.source_paper_equivalences e
        WHERE e.source_paper_id=sp.id AND e.equivalence_kind='exact_content'
      )
  ) sources;

  RETURN v_result;
END
$function$;

CREATE OR REPLACE FUNCTION public.structured_content_backfill_bootstrap_v2(
  p_syllabus_code text,
  p_year_from int,
  p_year_to int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_source_papers integer;
  v_papers_with_leaves integer;
  v_leaf_count integer;
  v_result jsonb;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN RAISE EXCEPTION 'unsupported syllabus code'; END IF;
  IF p_year_from<2015 OR p_year_to<p_year_from OR p_year_to>2035 THEN
    RAISE EXCEPTION 'invalid_year_window:%-%',p_year_from,p_year_to;
  END IF;

  SELECT count(*)::integer INTO v_source_papers
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code=p_syllabus_code
    AND sp.kind='QP'::paper_kind
    AND sp.variant BETWEEN 1 AND 3
    AND sp.year BETWEEN p_year_from AND p_year_to
    AND sp.source_url IS NOT NULL
    AND nullif(btrim(sp.sha256),'') IS NOT NULL
    AND NOT EXISTS(
      SELECT 1 FROM public.source_paper_equivalences e
      WHERE e.source_paper_id=sp.id AND e.equivalence_kind='exact_content'
    );

  SELECT count(DISTINCT sp.id)::integer,count(q.id)::integer
  INTO v_papers_with_leaves,v_leaf_count
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.questions q ON q.source_paper_id=sp.id
  WHERE s.code=p_syllabus_code
    AND sp.kind='QP'::paper_kind
    AND sp.variant BETWEEN 1 AND 3
    AND sp.year BETWEEN p_year_from AND p_year_to
    AND sp.source_url IS NOT NULL
    AND nullif(btrim(sp.sha256),'') IS NOT NULL
    AND NOT EXISTS(
      SELECT 1 FROM public.source_paper_equivalences e
      WHERE e.source_paper_id=sp.id AND e.equivalence_kind='exact_content'
    )
    AND q.marks IS NOT NULL
    AND q.status IN ('approved','needs_review');

  IF v_source_papers=0 THEN RAISE EXCEPTION 'structured_backfill_scope_empty'; END IF;
  IF v_papers_with_leaves<>v_source_papers THEN
    RAISE EXCEPTION 'structured_backfill_uningested_canonical_sources:%/%',v_papers_with_leaves,v_source_papers;
  END IF;

  IF EXISTS(
    SELECT 1
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    WHERE s.code=p_syllabus_code
      AND sp.kind='QP'::paper_kind
      AND sp.variant BETWEEN 1 AND 3
      AND sp.year BETWEEN p_year_from AND p_year_to
      AND sp.source_url IS NOT NULL
      AND nullif(btrim(sp.sha256),'') IS NOT NULL
      AND NOT EXISTS(
        SELECT 1 FROM public.source_paper_equivalences e
        WHERE e.source_paper_id=sp.id AND e.equivalence_kind='exact_content'
      )
      AND (
        SELECT coalesce(sum(q.marks),0)
        FROM public.questions q
        WHERE q.source_paper_id=sp.id
          AND q.marks IS NOT NULL
          AND q.status IN ('approved','needs_review')
      )<>c.total_marks
  ) THEN
    RAISE EXCEPTION 'structured_backfill_canonical_paper_mark_gate_failed';
  END IF;

  SELECT jsonb_build_object(
    'version','structured-content-backfill-bootstrap-v2',
    'canonicalSourceMode',true,
    'syllabusCode',p_syllabus_code,'yearFrom',p_year_from,'yearTo',p_year_to,
    'paperCount',v_source_papers,'leafCount',v_leaf_count,
    'sources',coalesce(jsonb_agg(source_row ORDER BY
      (source_row->>'year')::integer,source_row->>'series',
      (source_row->>'component')::integer,(source_row->>'variant')::integer
    ),'[]'::jsonb)
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'sourcePaperId',sp.id,'sourceUrl',sp.source_url,'sourceSha256',lower(sp.sha256),
      'syllabusCode',s.code,'component',c.number,'variant',sp.variant,
      'series',sp.series::text,'year',sp.year,
      'leaves',(
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'questionId',q.id,'path',q.path,'displayRef',q.display_ref,
          'stemMd',q.stem_md,'contextMd',q.context_md,'marks',q.marks,
          'answerKind',q.answer_kind::text,'answerLines',q.answer_lines,
          'status',q.status::text,'contentVersion',q.content_version,
          'hasOpenFidelityFinding',EXISTS(
            SELECT 1 FROM public.validation_findings vf
            WHERE vf.ref_table='questions' AND vf.ref_id=q.id
              AND vf.resolved_at IS NULL AND vf.severity='error'
              AND vf.rule_code IN (
                'source_structure_required_but_missing_table',
                'source_structure_required_but_missing_layout',
                'source_visual_required_but_missing'
              )
          ),
          'assets',(
            SELECT coalesce(jsonb_agg(jsonb_build_object(
              'id',qa.id,'kind',qa.kind::text,'contentMd',qa.content_md,
              'storagePath',qa.storage_path,'altText',qa.alt_text,
              'sortOrder',qa.sort_order,'sourcePage',qa.source_page,
              'sourceBbox',qa.source_bbox,'contentHash',qa.content_hash,
              'cropStatus',qa.crop_status
            ) ORDER BY qa.sort_order,qa.id),'[]'::jsonb)
            FROM public.question_assets qa WHERE qa.question_id=q.id
          )
        ) ORDER BY q.sort_order,q.id),'[]'::jsonb)
        FROM public.questions q
        WHERE q.source_paper_id=sp.id
          AND q.marks IS NOT NULL
          AND q.status IN ('approved','needs_review')
      )
    ) source_row
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    WHERE s.code=p_syllabus_code
      AND sp.kind='QP'::paper_kind
      AND sp.variant BETWEEN 1 AND 3
      AND sp.year BETWEEN p_year_from AND p_year_to
      AND sp.source_url IS NOT NULL
      AND nullif(btrim(sp.sha256),'') IS NOT NULL
      AND NOT EXISTS(
        SELECT 1 FROM public.source_paper_equivalences e
        WHERE e.source_paper_id=sp.id AND e.equivalence_kind='exact_content'
      )
  ) sources;

  RETURN v_result;
END
$function$;

REVOKE ALL ON FUNCTION public.structured_content_backfill_bootstrap_v1(text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.structured_content_backfill_bootstrap_v1(text)
  TO service_role;

REVOKE ALL ON FUNCTION public.structured_content_backfill_bootstrap_v2(text,int,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.structured_content_backfill_bootstrap_v2(text,int,int)
  TO service_role;

-- Fail closed against the known historical window that was broken by physical
-- canonicalization before this compatibility migration.
DO $$
DECLARE
  v jsonb;
BEGIN
  v:=public.structured_content_backfill_bootstrap_v2('9618',2021,2024);
  IF coalesce((v->>'paperCount')::integer,0)=0
     OR coalesce((v->>'leafCount')::integer,0)=0
     OR coalesce((v->>'canonicalSourceMode')::boolean,false) IS NOT TRUE THEN
    RAISE EXCEPTION 'canonical structured backfill bootstrap verification failed: %',v;
  END IF;
END $$;
