-- Final, replay-safe schema for the source-faithful QP repair workflow.
-- The temporary anon upload gate used during the one-off production repair is
-- intentionally NOT reproduced here. All repair RPCs remain service-role only.

CREATE TABLE IF NOT EXISTS public.question_source_repair_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  source_paper_id uuid NOT NULL REFERENCES public.source_papers(id) ON DELETE RESTRICT,
  repair_tag text NOT NULL,
  source_sha256 text,
  old_hash text NOT NULL,
  new_hash text NOT NULL,
  old_stem_md text,
  old_context_md text,
  old_display_ref text,
  new_stem_md text,
  new_context_md text,
  new_display_ref text,
  repaired_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS question_source_repair_history_question_idx
  ON public.question_source_repair_history(question_id,repaired_at DESC);
ALTER TABLE public.question_source_repair_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.question_source_repair_history FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_qp_source_repair_v2(
  p_qp_id uuid,
  p_rows jsonb,
  p_source_sha256 text,
  p_prompt text DEFAULT 'source-backed-qp-source-repair-v2'::text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_qp public.source_papers%rowtype;
  v_row jsonb;
  v_q public.questions%rowtype;
  v_expected_rows integer;
  v_expected_marks integer;
  v_rows integer;
  v_marks integer;
  v_updated integer := 0;
  v_unchanged integer := 0;
  v_new_stem text;
  v_new_context text;
  v_new_ref text;
  v_old_hash text;
  v_current_hash text;
  v_new_hash text;
  v_text text;
BEGIN
  SELECT * INTO v_qp
  FROM public.source_papers
  WHERE id=p_qp_id AND kind='QP'::paper_kind
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'qp_not_found'; END IF;

  IF jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows)=0 THEN
    RAISE EXCEPTION 'empty_rows';
  END IF;
  IF nullif(trim(coalesce(p_source_sha256,'')),'') IS NULL THEN
    RAISE EXCEPTION 'missing_source_sha256';
  END IF;
  IF v_qp.sha256 IS DISTINCT FROM p_source_sha256 THEN
    RAISE EXCEPTION 'qp_source_repair_source_sha_mismatch:%:%',p_source_sha256,v_qp.sha256;
  END IF;

  SELECT count(*),coalesce(sum(q.marks),0)
    INTO v_expected_rows,v_expected_marks
  FROM public.questions q
  WHERE q.source_paper_id=p_qp_id AND q.marks>0;

  SELECT count(*),coalesce(sum((x.value->>'marks')::integer),0)
    INTO v_rows,v_marks
  FROM jsonb_array_elements(p_rows) x(value);

  IF v_rows<>v_expected_rows THEN
    RAISE EXCEPTION 'qp_source_repair_leaf_count_mismatch:%:%',v_rows,v_expected_rows;
  END IF;
  IF v_marks<>v_expected_marks OR v_expected_marks<>75 THEN
    RAISE EXCEPTION 'qp_source_repair_mark_sum_mismatch:%:%',v_marks,v_expected_marks;
  END IF;
  IF EXISTS(
    SELECT 1 FROM (
      SELECT x.value->>'path' path,count(*) n
      FROM jsonb_array_elements(p_rows) x(value)
      GROUP BY 1 HAVING count(*)>1
    ) d
  ) THEN RAISE EXCEPTION 'duplicate_qp_source_repair_path'; END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    v_new_stem := nullif(trim(coalesce(v_row->>'stem','')),'');
    v_new_context := nullif(trim(coalesce(v_row->>'context','')),'');
    v_new_ref := nullif(trim(coalesce(v_row->>'displayRef','')),'');
    v_old_hash := nullif(trim(coalesce(v_row->>'oldHash','')),'');

    IF v_new_stem IS NULL THEN RAISE EXCEPTION 'empty_qp_source_repair_stem:%',v_row->>'path'; END IF;
    IF v_new_ref IS NULL THEN RAISE EXCEPTION 'empty_qp_source_repair_ref:%',v_row->>'path'; END IF;
    IF v_old_hash IS NULL THEN RAISE EXCEPTION 'missing_qp_source_repair_old_hash:%',v_row->>'path'; END IF;

    SELECT q.* INTO v_q
    FROM public.questions q
    WHERE q.source_paper_id=p_qp_id
      AND q.path=v_row->>'path'
      AND q.marks=(v_row->>'marks')::integer
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'qp_source_repair_path_or_mark_mismatch:%',v_row->>'path';
    END IF;

    v_text := coalesce(v_new_context,'') || E'\n' || v_new_stem;
    IF position('DONOTWRITEINTHISMARGIN' in upper(regexp_replace(v_text,'[[:space:]]+','','g'))) > 0 THEN
      RAISE EXCEPTION 'qp_source_repair_margin_artifact:%',v_row->>'path';
    END IF;
    IF lower(v_text) ~ '(publisher will be pleased|make amends at the earliest possible opportunity|after the live examination series|cambridge local examinations syndicate|copyright acknowledgements|reasonable effort has been made)' THEN
      RAISE EXCEPTION 'qp_source_repair_footer_artifact:%',v_row->>'path';
    END IF;
    IF v_text ~ '©[[:space:]]*(UCLES|Cambridge)' THEN
      RAISE EXCEPTION 'qp_source_repair_copyright_artifact:%',v_row->>'path';
    END IF;
    IF v_new_stem ~ ('\[[[:space:]]*' || (v_row->>'marks') || '[[:space:]]*\][[:space:]]*$') THEN
      RAISE EXCEPTION 'qp_source_repair_trailing_mark:%',v_row->>'path';
    END IF;

    IF v_q.stem_md IS NOT DISTINCT FROM v_new_stem
       AND v_q.context_md IS NOT DISTINCT FROM v_new_context
       AND v_q.display_ref IS NOT DISTINCT FROM v_new_ref THEN
      v_unchanged := v_unchanged + 1;
      CONTINUE;
    END IF;

    v_current_hash := md5(coalesce(v_q.stem_md,'') || chr(31) || coalesce(v_q.context_md,'') || chr(31) || coalesce(v_q.display_ref,''));
    IF v_current_hash<>v_old_hash THEN
      RAISE EXCEPTION 'qp_source_repair_old_hash_mismatch:%:%:%',v_row->>'path',v_old_hash,v_current_hash;
    END IF;

    v_new_hash := md5(v_new_stem || chr(31) || coalesce(v_new_context,'') || chr(31) || v_new_ref);
    INSERT INTO public.question_source_repair_history(
      question_id,source_paper_id,repair_tag,source_sha256,
      old_hash,new_hash,old_stem_md,old_context_md,old_display_ref,
      new_stem_md,new_context_md,new_display_ref
    ) VALUES (
      v_q.id,p_qp_id,p_prompt,p_source_sha256,
      v_current_hash,v_new_hash,v_q.stem_md,v_q.context_md,v_q.display_ref,
      v_new_stem,v_new_context,v_new_ref
    );

    UPDATE public.questions
    SET stem_md=v_new_stem,
        context_md=v_new_context,
        display_ref=v_new_ref,
        prompt_version=p_prompt,
        extract_confidence=greatest(coalesce(extract_confidence,0),0.99),
        updated_at=now()
    WHERE id=v_q.id;
    v_updated := v_updated + 1;
  END LOOP;

  IF EXISTS(
    SELECT 1
    FROM jsonb_array_elements(p_rows) x(value)
    JOIN public.questions q
      ON q.source_paper_id=p_qp_id
     AND q.path=x.value->>'path'
     AND q.marks=(x.value->>'marks')::integer
    WHERE q.stem_md IS DISTINCT FROM nullif(trim(coalesce(x.value->>'stem','')),'')
       OR q.context_md IS DISTINCT FROM nullif(trim(coalesce(x.value->>'context','')),'')
       OR q.display_ref IS DISTINCT FROM nullif(trim(coalesce(x.value->>'displayRef','')),'')
  ) THEN RAISE EXCEPTION 'qp_source_repair_post_gate_failed'; END IF;

  RETURN jsonb_build_object(
    'paper_id',p_qp_id,
    'leaves',v_expected_rows,
    'marks',v_expected_marks,
    'updated',v_updated,
    'unchanged',v_unchanged,
    'source_sha256',p_source_sha256
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.apply_qp_source_repair_manifest_v2(p_manifest jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_qp_id uuid;
  v_source_sha text;
  v_db_sha text;
  v_rows jsonb;
  v_enriched jsonb;
  v_manifest_leaves integer;
  v_manifest_marks integer;
  v_rows_count integer;
  v_rows_marks integer;
BEGIN
  IF jsonb_typeof(p_manifest)<>'object' THEN
    RAISE EXCEPTION 'qp_repair_manifest_not_object';
  END IF;
  IF p_manifest->>'parserVersion' IS DISTINCT FROM 'qp-source-repair-v2' THEN
    RAISE EXCEPTION 'qp_repair_manifest_parser_version:%',p_manifest->>'parserVersion';
  END IF;

  BEGIN
    v_qp_id := (p_manifest->>'sourcePaperId')::uuid;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'qp_repair_manifest_bad_source_paper_id';
  END;
  v_source_sha := nullif(trim(coalesce(p_manifest->>'sourceSha256','')),'');
  IF v_source_sha IS NULL THEN RAISE EXCEPTION 'qp_repair_manifest_missing_source_sha'; END IF;

  SELECT sp.sha256 INTO v_db_sha
  FROM public.source_papers sp
  WHERE sp.id=v_qp_id AND sp.kind='QP'::paper_kind;
  IF NOT FOUND THEN RAISE EXCEPTION 'qp_repair_manifest_qp_not_found'; END IF;
  IF v_db_sha IS DISTINCT FROM v_source_sha THEN
    RAISE EXCEPTION 'qp_repair_manifest_source_sha_mismatch:%:%',v_source_sha,v_db_sha;
  END IF;

  v_rows := p_manifest->'rows';
  IF jsonb_typeof(v_rows)<>'array' OR jsonb_array_length(v_rows)=0 THEN
    RAISE EXCEPTION 'qp_repair_manifest_rows_empty';
  END IF;

  v_manifest_leaves := coalesce((p_manifest->>'leaves')::integer,-1);
  v_manifest_marks := coalesce((p_manifest->>'marks')::integer,-1);
  SELECT count(*),coalesce(sum((x.value->>'marks')::integer),0)
    INTO v_rows_count,v_rows_marks
  FROM jsonb_array_elements(v_rows) x(value);
  IF v_manifest_leaves<>v_rows_count THEN
    RAISE EXCEPTION 'qp_repair_manifest_leaf_metadata_mismatch:%:%',v_manifest_leaves,v_rows_count;
  END IF;
  IF v_manifest_marks<>v_rows_marks OR v_manifest_marks<>75 THEN
    RAISE EXCEPTION 'qp_repair_manifest_mark_metadata_mismatch:%:%',v_manifest_marks,v_rows_marks;
  END IF;

  SELECT jsonb_agg(
    x.value || jsonb_build_object(
      'oldHash',md5(coalesce(q.stem_md,'') || chr(31) || coalesce(q.context_md,'') || chr(31) || coalesce(q.display_ref,''))
    ) ORDER BY q.sort_order,q.id
  ) INTO v_enriched
  FROM jsonb_array_elements(v_rows) x(value)
  JOIN public.questions q
    ON q.source_paper_id=v_qp_id
   AND q.path=x.value->>'path'
   AND q.marks=(x.value->>'marks')::integer;

  IF jsonb_array_length(coalesce(v_enriched,'[]'::jsonb))<>v_rows_count THEN
    RAISE EXCEPTION 'qp_repair_manifest_path_mark_join_mismatch';
  END IF;

  RETURN public.apply_qp_source_repair_v2(
    v_qp_id,
    v_enriched,
    v_source_sha,
    'source-backed-qp-source-repair-v2'
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.qp_source_repair_runner_bootstrap_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.source_papers sp
    JOIN public.components c ON c.id=sp.component_id
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    WHERE sp.kind='QP'::paper_kind
      AND s.code='9618'
      AND sp.series='MJ'::exam_series
      AND (
        (sp.year=2021 AND c.number=1 AND sp.variant=1) OR
        (sp.year=2022 AND c.number=2 AND sp.variant=2) OR
        (sp.year=2024 AND c.number IN (1,2,3) AND sp.variant IN (1,2,3))
      )
      AND (
        SELECT coalesce(sum(q.marks),0)
        FROM public.questions q
        WHERE q.source_paper_id=sp.id AND q.marks>0
      ) <> 75
  ) THEN
    RAISE EXCEPTION 'qp_source_repair_bootstrap_non_75_paper';
  END IF;

  SELECT jsonb_build_object(
    'parserVersion','qp-source-repair-v2',
    'sources',coalesce(jsonb_agg(src ORDER BY (src->>'year')::int,(src->>'component')::int,(src->>'variant')::int),'[]'::jsonb)
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'sourcePaperId',sp.id,
      'sourceUrl',sp.source_url,
      'sourceSha256',sp.sha256,
      'syllabusCode',s.code,
      'component',c.number,
      'variant',sp.variant,
      'series',sp.series,
      'year',sp.year,
      'expectedMarks',75,
      'leaves',(
        SELECT jsonb_agg(jsonb_build_object('path',q.path,'marks',q.marks) ORDER BY q.sort_order,q.id)
        FROM public.questions q
        WHERE q.source_paper_id=sp.id AND q.marks>0
      )
    ) src
    FROM public.source_papers sp
    JOIN public.components c ON c.id=sp.component_id
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    WHERE sp.kind='QP'::paper_kind
      AND s.code='9618'
      AND sp.series='MJ'::exam_series
      AND sp.source_url IS NOT NULL
      AND nullif(trim(sp.sha256),'') IS NOT NULL
      AND (
        (sp.year=2021 AND c.number=1 AND sp.variant=1) OR
        (sp.year=2022 AND c.number=2 AND sp.variant=2) OR
        (sp.year=2024 AND c.number IN (1,2,3) AND sp.variant IN (1,2,3))
      )
  ) x;

  IF jsonb_array_length(v_result->'sources')<>11 THEN
    RAISE EXCEPTION 'qp_source_repair_bootstrap_expected_11:%',jsonb_array_length(v_result->'sources');
  END IF;
  RETURN v_result;
END
$function$;

REVOKE ALL ON FUNCTION public.apply_qp_source_repair_v2(uuid,jsonb,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_qp_source_repair_manifest_v2(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.qp_source_repair_runner_bootstrap_v2() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_qp_source_repair_v2(uuid,jsonb,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_qp_source_repair_manifest_v2(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.qp_source_repair_runner_bootstrap_v2() TO service_role;
