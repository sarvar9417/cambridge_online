-- Source-verified canonical content backfill contract for the official 0478/9618 QP corpus.
--
-- Archived development/demo papers are deliberately excluded. The runner must
-- download the original QP, verify its recorded SHA-256, locate the exact
-- printed question page, and prove the stored stem occurs in that source
-- segment before this contract accepts a canonical v1 document.

CREATE TABLE IF NOT EXISTS public.structured_content_backfill_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  source_paper_id uuid NOT NULL REFERENCES public.source_papers(id) ON DELETE CASCADE,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[0-9A-Fa-f]{64}$'),
  source_page integer NOT NULL CHECK (source_page > 0),
  parser_version text NOT NULL,
  evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(question_id, source_sha256, parser_version)
);

ALTER TABLE public.structured_content_backfill_audits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.structured_content_backfill_audits FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE public.structured_content_backfill_audits TO service_role;

CREATE OR REPLACE FUNCTION public.structured_content_backfill_bootstrap_v1(p_syllabus_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_paper_count integer;
  v_leaf_count integer;
  v_result jsonb;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported syllabus code';
  END IF;

  SELECT count(DISTINCT sp.id)::integer,count(q.id)::integer
  INTO v_paper_count,v_leaf_count
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.questions q ON q.source_paper_id=sp.id
  WHERE s.code=p_syllabus_code
    AND sp.kind='QP'::paper_kind
    AND sp.source_url IS NOT NULL
    AND nullif(btrim(sp.sha256),'') IS NOT NULL
    AND q.marks IS NOT NULL
    AND q.status IN ('approved','needs_review');

  IF p_syllabus_code='0478' AND (v_paper_count<>114 OR v_leaf_count<>2481) THEN
    RAISE EXCEPTION '0478 structured backfill baseline mismatch:%:%',v_paper_count,v_leaf_count;
  END IF;
  IF p_syllabus_code='9618' AND (v_paper_count<>118 OR v_leaf_count<>2985) THEN
    RAISE EXCEPTION '9618 structured backfill baseline mismatch:%:%',v_paper_count,v_leaf_count;
  END IF;

  SELECT jsonb_build_object(
    'version','structured-content-backfill-bootstrap-v1',
    'syllabusCode',p_syllabus_code,
    'paperCount',v_paper_count,
    'leafCount',v_leaf_count,
    'sources',coalesce(jsonb_agg(source_row ORDER BY (source_row->>'year')::integer,source_row->>'series',(source_row->>'component')::integer,(source_row->>'variant')::integer),'[]'::jsonb)
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'sourcePaperId',sp.id,
      'sourceUrl',sp.source_url,
      'sourceSha256',lower(sp.sha256),
      'syllabusCode',s.code,
      'component',c.number,
      'variant',sp.variant,
      'series',sp.series::text,
      'year',sp.year,
      'leaves',(
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'questionId',q.id,
          'path',q.path,
          'displayRef',q.display_ref,
          'stemMd',q.stem_md,
          'contextMd',q.context_md,
          'marks',q.marks,
          'answerKind',q.answer_kind::text,
          'answerLines',q.answer_lines,
          'status',q.status::text,
          'contentVersion',q.content_version,
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
              'id',qa.id,
              'kind',qa.kind::text,
              'contentMd',qa.content_md,
              'storagePath',qa.storage_path,
              'altText',qa.alt_text,
              'sortOrder',qa.sort_order,
              'sourcePage',qa.source_page,
              'sourceBbox',qa.source_bbox,
              'contentHash',qa.content_hash,
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
      AND EXISTS(
        SELECT 1 FROM public.questions q
        WHERE q.source_paper_id=sp.id AND q.marks IS NOT NULL
          AND q.status IN ('approved','needs_review')
      )
  ) sources;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.structured_content_backfill_bootstrap_v1(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.structured_content_backfill_bootstrap_v1(text) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_structured_content_backfill_v1(p_manifest jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_source public.source_papers%ROWTYPE;
  v_row jsonb;
  v_question public.questions%ROWTYPE;
  v_content jsonb;
  v_source_page integer;
  v_parser_version text;
  v_applied integer := 0;
  v_existing integer := 0;
  v_asset_id uuid;
BEGIN
  IF p_manifest IS NULL OR jsonb_typeof(p_manifest)<>'object'
     OR p_manifest->>'version'<>'structured-content-backfill-v1' THEN
    RAISE EXCEPTION 'invalid structured content backfill manifest';
  END IF;
  IF jsonb_typeof(p_manifest->'rows')<>'array' OR jsonb_array_length(p_manifest->'rows')=0
     OR jsonb_array_length(p_manifest->'rows')>100 THEN
    RAISE EXCEPTION 'structured content backfill rows must contain 1..100 items';
  END IF;
  IF coalesce(p_manifest->>'sourceSha256','') !~ '^[0-9A-Fa-f]{64}$' THEN
    RAISE EXCEPTION 'invalid structured content source SHA';
  END IF;
  v_parser_version := nullif(btrim(p_manifest->>'parserVersion'),'');
  IF v_parser_version IS NULL THEN RAISE EXCEPTION 'parser version is required'; END IF;

  SELECT * INTO v_source FROM public.source_papers
  WHERE id=(p_manifest->>'sourcePaperId')::uuid FOR SHARE;
  IF NOT FOUND OR v_source.kind<>'QP'::paper_kind THEN RAISE EXCEPTION 'source QP not found'; END IF;
  IF lower(coalesce(v_source.sha256,''))<>lower(p_manifest->>'sourceSha256') THEN
    RAISE EXCEPTION 'source SHA mismatch';
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_manifest->'rows')
  LOOP
    IF jsonb_typeof(v_row)<>'object' THEN RAISE EXCEPTION 'invalid structured row'; END IF;
    v_content := v_row->'content';
    v_source_page := (v_row->>'sourcePage')::integer;
    IF v_source_page IS NULL OR v_source_page<1 THEN RAISE EXCEPTION 'source page is required'; END IF;

    SELECT * INTO v_question FROM public.questions
    WHERE id=(v_row->>'questionId')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'question not found'; END IF;
    IF v_question.source_paper_id<>v_source.id THEN RAISE EXCEPTION 'question/source paper mismatch'; END IF;
    IF v_question.status NOT IN ('approved','needs_review') THEN RAISE EXCEPTION 'question is not in official active review scope'; END IF;

    IF EXISTS(
      SELECT 1 FROM public.validation_findings vf
      WHERE vf.ref_table='questions' AND vf.ref_id=v_question.id
        AND vf.resolved_at IS NULL AND vf.severity='error'
        AND vf.rule_code IN (
          'source_structure_required_but_missing_table',
          'source_structure_required_but_missing_layout',
          'source_visual_required_but_missing'
        )
    ) THEN
      RAISE EXCEPTION 'question still has unresolved source fidelity finding:%',v_question.id;
    END IF;

    IF jsonb_typeof(v_content)<>'object'
       OR v_content->>'version'<>'1'
       OR v_content->'source'->>'paperId'<>v_source.id::text
       OR lower(coalesce(v_content->'source'->>'sha256',''))<>lower(v_source.sha256) THEN
      RAISE EXCEPTION 'canonical content provenance mismatch';
    END IF;

    -- Every source asset referenced by canonical content must still belong to
    -- this exact question. This prevents a valid UUID from another paper being
    -- substituted into an otherwise source-pinned document.
    FOR v_asset_id IN
      SELECT (block->>'assetId')::uuid
      FROM jsonb_array_elements(v_content->'blocks') block
      WHERE block->>'type'='asset'
    LOOP
      IF NOT EXISTS(
        SELECT 1 FROM public.question_assets qa
        WHERE qa.id=v_asset_id AND qa.question_id=v_question.id
          AND qa.source_page IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'canonical asset does not belong to question:%',v_asset_id;
      END IF;
    END LOOP;

    IF v_question.content_json IS NOT NULL THEN
      IF v_question.content_json<>v_content THEN
        RAISE EXCEPTION 'existing canonical content differs:%',v_question.id;
      END IF;
      v_existing := v_existing + 1;
    ELSE
      PERFORM public.set_question_structured_content_v1(
        v_question.id,v_source.id,lower(v_source.sha256),v_content
      );
      v_applied := v_applied + 1;
    END IF;

    INSERT INTO public.structured_content_backfill_audits(
      question_id,source_paper_id,source_sha256,source_page,parser_version,evidence
    ) VALUES (
      v_question.id,v_source.id,lower(v_source.sha256),v_source_page,v_parser_version,
      coalesce(v_row->'evidence','{}'::jsonb)
    )
    ON CONFLICT(question_id,source_sha256,parser_version) DO UPDATE
      SET source_page=excluded.source_page,evidence=excluded.evidence,created_at=now();
  END LOOP;

  RETURN jsonb_build_object(
    'sourcePaperId',v_source.id,
    'applied',v_applied,
    'existing',v_existing,
    'rows',jsonb_array_length(p_manifest->'rows')
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_structured_content_backfill_v1(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_structured_content_backfill_v1(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.structured_question_content_audit_v2()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  WITH official AS (
    SELECT q.id,q.content_json,q.status,
      EXISTS(
        SELECT 1 FROM public.validation_findings vf
        WHERE vf.ref_table='questions' AND vf.ref_id=q.id
          AND vf.resolved_at IS NULL AND vf.severity='error'
          AND vf.rule_code IN (
            'source_structure_required_but_missing_table',
            'source_structure_required_but_missing_layout',
            'source_visual_required_but_missing'
          )
      ) unresolved_fidelity
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    WHERE s.code IN ('0478','9618')
      AND q.marks IS NOT NULL
      AND q.status IN ('approved','needs_review')
      AND sp.source_url IS NOT NULL
      AND nullif(btrim(sp.sha256),'') IS NOT NULL
  ), archived_demo AS (
    SELECT count(*)::integer n
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    WHERE s.code IN ('0478','9618') AND q.marks IS NOT NULL AND q.status='archived'
  )
  SELECT jsonb_build_object(
    'version','structured-question-content-v2',
    'officialTargetCount',count(*)::integer,
    'structuredCount',count(*) FILTER(WHERE content_json IS NOT NULL)::integer,
    'legacyCount',count(*) FILTER(WHERE content_json IS NULL)::integer,
    'unresolvedFidelityCount',count(*) FILTER(WHERE unresolved_fidelity)::integer,
    'structuredWithUnresolvedFidelityCount',count(*) FILTER(WHERE content_json IS NOT NULL AND unresolved_fidelity)::integer,
    'approvedStructuredCount',count(*) FILTER(WHERE content_json IS NOT NULL AND status='approved')::integer,
    'needsReviewStructuredCount',count(*) FILTER(WHERE content_json IS NOT NULL AND status='needs_review')::integer,
    'archivedDemoExcluded',(SELECT n FROM archived_demo)
  )
  FROM official;
$function$;

REVOKE ALL ON FUNCTION public.structured_question_content_audit_v2() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.structured_question_content_audit_v2() TO service_role;
