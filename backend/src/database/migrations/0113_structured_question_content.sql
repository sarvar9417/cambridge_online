-- Canonical, source-backed structured question content foundation.
--
-- This is additive and deliberately leaves stem_md/context_md/question_assets in
-- place as the legacy compatibility path. Structured content becomes available
-- per question only after a source-hash-verified writer stores a valid v1
-- document. This migration does not approve questions or resolve fidelity
-- findings: source reconstruction and review remain fail-closed.

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS content_json jsonb,
  ADD COLUMN IF NOT EXISTS content_version smallint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='questions_structured_content_pair'
      AND conrelid='public.questions'::regclass
  ) THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT questions_structured_content_pair CHECK (
        (content_json IS NULL AND content_version IS NULL)
        OR (
          content_json IS NOT NULL
          AND content_version=1
          AND jsonb_typeof(content_json)='object'
          AND content_json->>'version'='1'
          AND jsonb_typeof(content_json->'source')='object'
          AND nullif(btrim(content_json->'source'->>'paperId'),'') IS NOT NULL
          AND (content_json->'source'->>'sha256') ~ '^[0-9A-Fa-f]{64}$'
          AND jsonb_typeof(content_json->'blocks')='array'
          AND jsonb_array_length(content_json->'blocks')>0
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS questions_structured_content_version_idx
  ON public.questions(content_version)
  WHERE content_json IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_question_structured_content_v1(
  p_question_id uuid,
  p_source_paper_id uuid,
  p_source_sha256 text,
  p_content jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_question public.questions%ROWTYPE;
  v_source public.source_papers%ROWTYPE;
BEGIN
  IF p_content IS NULL OR jsonb_typeof(p_content)<>'object' THEN
    RAISE EXCEPTION 'structured content must be a JSON object';
  END IF;
  IF p_content->>'version'<>'1' THEN
    RAISE EXCEPTION 'structured content version must be 1';
  END IF;
  IF jsonb_typeof(p_content->'source')<>'object' THEN
    RAISE EXCEPTION 'structured content source is required';
  END IF;
  IF jsonb_typeof(p_content->'blocks')<>'array' OR jsonb_array_length(p_content->'blocks')=0 THEN
    RAISE EXCEPTION 'structured content blocks must be a non-empty array';
  END IF;
  IF p_source_sha256 IS NULL OR p_source_sha256 !~ '^[0-9A-Fa-f]{64}$' THEN
    RAISE EXCEPTION 'source SHA-256 is invalid';
  END IF;
  IF p_content->'source'->>'paperId'<>p_source_paper_id::text THEN
    RAISE EXCEPTION 'structured content source paper does not match requested paper';
  END IF;
  IF lower(p_content->'source'->>'sha256')<>lower(p_source_sha256) THEN
    RAISE EXCEPTION 'structured content source SHA-256 does not match requested SHA-256';
  END IF;

  SELECT * INTO v_question
  FROM public.questions
  WHERE id=p_question_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'question not found';
  END IF;
  IF v_question.source_paper_id<>p_source_paper_id THEN
    RAISE EXCEPTION 'question does not belong to requested source paper';
  END IF;

  SELECT * INTO v_source
  FROM public.source_papers
  WHERE id=p_source_paper_id;
  IF NOT FOUND OR v_source.kind<>'QP' THEN
    RAISE EXCEPTION 'source paper is not a question paper';
  END IF;
  IF lower(coalesce(v_source.sha256,''))<>lower(p_source_sha256) THEN
    RAISE EXCEPTION 'source SHA-256 does not match recorded question paper';
  END IF;

  UPDATE public.questions
  SET content_json=p_content,
      content_version=1,
      updated_at=now()
  WHERE id=p_question_id;

  RETURN jsonb_build_object(
    'questionId',p_question_id,
    'sourcePaperId',p_source_paper_id,
    'sourceSha256',lower(p_source_sha256),
    'contentVersion',1,
    'blockCount',jsonb_array_length(p_content->'blocks'),
    'status',v_question.status,
    'fidelityFindingsResolved',false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.set_question_structured_content_v1(uuid,uuid,text,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_question_structured_content_v1(uuid,uuid,text,jsonb)
  TO service_role;

-- Read-only migration dashboard for the source-backed Cambridge QP corpus.
CREATE OR REPLACE FUNCTION public.structured_question_content_audit_v1()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  WITH leaves AS (
    SELECT q.id,q.content_json,
      EXISTS (
        SELECT 1
        FROM public.validation_findings vf
        WHERE vf.ref_table='questions'
          AND vf.ref_id=q.id
          AND vf.resolved_at IS NULL
          AND vf.severity='error'
          AND vf.rule_code IN (
            'source_structure_required_but_missing_table',
            'source_structure_required_but_missing_layout',
            'source_visual_required_but_missing'
          )
      ) unresolved_fidelity
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
    WHERE q.marks IS NOT NULL
  )
  SELECT jsonb_build_object(
    'version','structured-question-content-v1',
    'leafCount',count(*)::integer,
    'structuredCount',count(*) FILTER (WHERE content_json IS NOT NULL)::integer,
    'legacyCount',count(*) FILTER (WHERE content_json IS NULL)::integer,
    'unresolvedFidelityCount',count(*) FILTER (WHERE unresolved_fidelity)::integer,
    'structuredWithUnresolvedFidelityCount',count(*) FILTER (
      WHERE content_json IS NOT NULL AND unresolved_fidelity
    )::integer
  )
  FROM leaves;
$function$;

REVOKE ALL ON FUNCTION public.structured_question_content_audit_v1()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.structured_question_content_audit_v1()
  TO service_role;
