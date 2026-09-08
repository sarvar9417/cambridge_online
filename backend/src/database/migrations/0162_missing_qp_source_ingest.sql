-- Guarded ingestion for historical 9618 QP/MS pairs that are source-registered
-- (Drive URL + SHA-256) but have no scored question leaves yet.
--
-- The contract is deliberately narrow:
--   * only 9618 QP rows with zero positive-mark leaves are eligible;
--   * a matching SHA-backed MS source must exist for the exact paper key;
--   * the caller must provide source-derived leaves whose marks sum exactly to
--     the component total;
--   * QP and MS SHA-256 values are rechecked inside the transaction;
--   * inserted questions remain needs_review and are source-pinned structured
--     content, never silently approved;
--   * primary source occurrences and needs-review mark schemes are recorded;
--   * partial/replayed ingestion fails closed unless the full existing paper is
--     byte-semantically identical to the manifest.

CREATE OR REPLACE FUNCTION public.missing_qp_source_ingest_bootstrap_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'version','missing-qp-source-ingest-v1',
    'paperCount',count(*),
    'sources',coalesce(jsonb_agg(src ORDER BY (src->>'year')::int,src->>'series',(src->>'component')::int,(src->>'variant')::int),'[]'::jsonb)
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'sourcePaperId',qp.id,
      'sourceUrl',qp.source_url,
      'sourceSha256',lower(qp.sha256),
      'markSchemeSourcePaperId',ms.id,
      'markSchemeSourceUrl',ms.source_url,
      'markSchemeSha256',lower(ms.sha256),
      'syllabusCode',sy.code,
      'component',c.number,
      'variant',qp.variant,
      'series',qp.series::text,
      'year',qp.year,
      'expectedMarks',c.total_marks
    ) src
    FROM public.source_papers qp
    JOIN public.syllabi sy ON sy.id=qp.syllabus_id
    JOIN public.components c ON c.id=qp.component_id
    JOIN public.source_papers ms
      ON ms.syllabus_id=qp.syllabus_id
     AND ms.component_id=qp.component_id
     AND ms.year=qp.year
     AND ms.series=qp.series
     AND ms.variant=qp.variant
     AND ms.kind='MS'::paper_kind
    WHERE sy.code='9618'
      AND qp.kind='QP'::paper_kind
      AND qp.variant BETWEEN 1 AND 3
      AND qp.source_url IS NOT NULL
      AND nullif(btrim(qp.sha256),'') IS NOT NULL
      AND ms.source_url IS NOT NULL
      AND nullif(btrim(ms.sha256),'') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.questions q
        WHERE q.source_paper_id=qp.id AND q.marks>0
      )
  ) x;
  RETURN v_result;
END
$function$;

REVOKE ALL ON FUNCTION public.missing_qp_source_ingest_bootstrap_v1()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.missing_qp_source_ingest_bootstrap_v1()
  TO service_role;

CREATE OR REPLACE FUNCTION public.apply_missing_qp_source_ingest_v1(
  p_manifest jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_qp_id uuid;
  v_ms_id uuid;
  v_qp_sha text;
  v_ms_sha text;
  v_component_id uuid;
  v_component_number int;
  v_variant int;
  v_year int;
  v_series text;
  v_total_marks int;
  v_rows jsonb;
  v_row jsonb;
  v_question_id uuid;
  v_path text;
  v_display_ref text;
  v_stem text;
  v_context text;
  v_guidance text;
  v_label text;
  v_marks int;
  v_depth int;
  v_sort int := 0;
  v_blocks jsonb;
  v_existing_count int;
  v_existing_marks int;
  v_inserted int := 0;
  v_occurrences int := 0;
  v_schemes int := 0;
  v_mismatches int := 0;
BEGIN
  IF p_manifest IS NULL OR jsonb_typeof(p_manifest)<>'object' THEN
    RAISE EXCEPTION 'missing_qp_ingest_manifest_required';
  END IF;
  IF p_manifest->>'version'<>'missing-qp-source-ingest-v1' THEN
    RAISE EXCEPTION 'missing_qp_ingest_version_mismatch:%',p_manifest->>'version';
  END IF;

  BEGIN
    v_qp_id := (p_manifest->>'sourcePaperId')::uuid;
    v_ms_id := (p_manifest->>'markSchemeSourcePaperId')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'missing_qp_ingest_bad_source_ids';
  END;
  v_qp_sha:=lower(btrim(coalesce(p_manifest->>'sourceSha256','')));
  v_ms_sha:=lower(btrim(coalesce(p_manifest->>'markSchemeSha256','')));
  IF v_qp_sha !~ '^[0-9a-f]{64}$' OR v_ms_sha !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'missing_qp_ingest_bad_sha';
  END IF;

  SELECT qp.sha256,qp.component_id,c.number,qp.variant,qp.year,qp.series::text,c.total_marks
  INTO v_qp_sha,v_component_id,v_component_number,v_variant,v_year,v_series,v_total_marks
  FROM public.source_papers qp
  JOIN public.syllabi sy ON sy.id=qp.syllabus_id
  JOIN public.components c ON c.id=qp.component_id
  WHERE qp.id=v_qp_id
    AND sy.code='9618'
    AND qp.kind='QP'::paper_kind
    AND qp.variant BETWEEN 1 AND 3
    AND qp.source_url IS NOT NULL
    AND nullif(btrim(qp.sha256),'') IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'missing_qp_ingest_qp_not_eligible:%',v_qp_id; END IF;
  IF lower(v_qp_sha)<>lower(p_manifest->>'sourceSha256') THEN
    RAISE EXCEPTION 'missing_qp_ingest_qp_sha_mismatch:%',v_qp_id;
  END IF;

  SELECT ms.sha256 INTO v_ms_sha
  FROM public.source_papers ms
  WHERE ms.id=v_ms_id
    AND ms.kind='MS'::paper_kind
    AND ms.component_id=v_component_id
    AND ms.variant=v_variant
    AND ms.year=v_year
    AND ms.series::text=v_series
    AND ms.source_url IS NOT NULL
    AND nullif(btrim(ms.sha256),'') IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'missing_qp_ingest_ms_not_matching:%',v_ms_id; END IF;
  IF lower(v_ms_sha)<>lower(p_manifest->>'markSchemeSha256') THEN
    RAISE EXCEPTION 'missing_qp_ingest_ms_sha_mismatch:%',v_ms_id;
  END IF;

  IF coalesce(p_manifest->>'syllabusCode','')<>'9618'
     OR (p_manifest->>'component')::int<>v_component_number
     OR (p_manifest->>'variant')::int<>v_variant
     OR (p_manifest->>'year')::int<>v_year
     OR p_manifest->>'series'<>v_series
     OR (p_manifest->>'expectedMarks')::int<>v_total_marks THEN
    RAISE EXCEPTION 'missing_qp_ingest_metadata_mismatch:%',v_qp_id;
  END IF;

  v_rows:=p_manifest->'rows';
  IF jsonb_typeof(v_rows)<>'array' OR jsonb_array_length(v_rows)=0 OR jsonb_array_length(v_rows)>80 THEN
    RAISE EXCEPTION 'missing_qp_ingest_bad_rows';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_rows) r
    WHERE jsonb_typeof(r)<>'object'
      OR coalesce(r->>'path','') !~ '^[0-9]+(\.[a-z]+|\.(?:i|v|x)+)*$'
      OR nullif(btrim(coalesce(r->>'displayRef','')),'') IS NULL
      OR nullif(btrim(coalesce(r->>'stem','')),'') IS NULL
      OR coalesce(r->>'marks','') !~ '^[1-9][0-9]*$'
      OR (r->>'marks')::int>20
  ) THEN
    RAISE EXCEPTION 'missing_qp_ingest_invalid_leaf';
  END IF;
  IF (SELECT count(DISTINCT r->>'path') FROM jsonb_array_elements(v_rows) r)<>jsonb_array_length(v_rows)
     OR (SELECT count(DISTINCT r->>'displayRef') FROM jsonb_array_elements(v_rows) r)<>jsonb_array_length(v_rows) THEN
    RAISE EXCEPTION 'missing_qp_ingest_duplicate_leaf_identity';
  END IF;
  IF (SELECT coalesce(sum((r->>'marks')::int),0) FROM jsonb_array_elements(v_rows) r)<>v_total_marks THEN
    RAISE EXCEPTION 'missing_qp_ingest_mark_gate_failed:%',v_qp_id;
  END IF;

  SELECT count(*),coalesce(sum(q.marks),0)
  INTO v_existing_count,v_existing_marks
  FROM public.questions q
  WHERE q.source_paper_id=v_qp_id AND q.marks>0;

  IF v_existing_count>0 THEN
    IF v_existing_count<>jsonb_array_length(v_rows) OR v_existing_marks<>v_total_marks THEN
      RAISE EXCEPTION 'missing_qp_ingest_partial_existing_paper:%:%:%',v_qp_id,v_existing_count,v_existing_marks;
    END IF;
    SELECT count(*) INTO v_mismatches
    FROM jsonb_array_elements(v_rows) r
    LEFT JOIN public.questions q
      ON q.source_paper_id=v_qp_id AND q.path=r->>'path'
    WHERE q.id IS NULL
       OR q.marks<>(r->>'marks')::int
       OR q.display_ref IS DISTINCT FROM r->>'displayRef'
       OR q.stem_md IS DISTINCT FROM r->>'stem'
       OR q.context_md IS DISTINCT FROM nullif(r->>'context','');
    IF v_mismatches<>0 THEN
      RAISE EXCEPTION 'missing_qp_ingest_replay_mismatch:%:%',v_qp_id,v_mismatches;
    END IF;
    RETURN jsonb_build_object(
      'version','missing-qp-source-ingest-v1','sourcePaperId',v_qp_id,
      'replayed',true,'insertedQuestions',0,'leafCount',v_existing_count,'marks',v_existing_marks
    );
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(v_rows)
  LOOP
    v_path:=v_row->>'path';
    v_display_ref:=v_row->>'displayRef';
    v_stem:=v_row->>'stem';
    v_context:=nullif(v_row->>'context','');
    v_guidance:=nullif(v_row->>'msGuidance','');
    v_marks:=(v_row->>'marks')::int;
    v_depth:=greatest(array_length(string_to_array(v_path,'.'),1)-1,0);
    v_label:=CASE
      WHEN position('.' in v_path)=0 THEN v_path
      ELSE '('||split_part(v_path,'.',array_length(string_to_array(v_path,'.'),1))||')'
    END;
    v_blocks:=CASE WHEN v_context IS NULL THEN
      jsonb_build_array(jsonb_build_object('type','text','style','task','text',v_stem))
    ELSE
      jsonb_build_array(
        jsonb_build_object('type','text','style','context','text',v_context),
        jsonb_build_object('type','text','style','task','text',v_stem)
      )
    END;

    INSERT INTO public.questions(
      source_paper_id,component_id,parent_id,label,path,display_ref,depth,sort_order,
      stem_md,context_md,marks,status,extract_confidence,prompt_version,notes,
      content_json,content_version
    ) VALUES (
      v_qp_id,v_component_id,NULL,v_label,v_path,v_display_ref,v_depth,v_sort,
      v_stem,v_context,v_marks,'needs_review'::review_status,1.0,
      'missing-qp-source-ingest-v1',
      concat('source-ingest: QP ',v_qp_id::text,' SHA-256 ',lower(v_qp_sha),' / MS ',v_ms_id::text,' SHA-256 ',lower(v_ms_sha)),
      jsonb_build_object(
        'version',1,
        'source',jsonb_build_object('paperId',v_qp_id,'sha256',lower(v_qp_sha)),
        'blocks',v_blocks
      ),1
    ) RETURNING id INTO v_question_id;
    v_inserted:=v_inserted+1;

    INSERT INTO public.question_source_occurrences(
      question_id,source_paper_id,mark_scheme_source_paper_id,source_path,display_ref,
      is_primary,equivalence_basis,verified_at,evidence
    ) VALUES (
      v_question_id,v_qp_id,v_ms_id,v_path,v_display_ref,true,'primary_source',now(),
      jsonb_build_object(
        'ingest','missing-qp-source-ingest-v1',
        'qpSha256',lower(v_qp_sha),'msSha256',lower(v_ms_sha),
        'sourceAuthority','original_cambridge_qp_ms_pair'
      )
    );
    v_occurrences:=v_occurrences+1;

    INSERT INTO public.mark_schemes(
      question_id,source_paper_id,scheme_type,max_marks,guidance_md,status,
      extract_confidence,prompt_version
    ) VALUES (
      v_question_id,v_ms_id,'manual_only'::scheme_type,v_marks,v_guidance,
      'needs_review'::review_status,1.0,'missing-qp-source-ingest-v1'
    );
    v_schemes:=v_schemes+1;
    v_sort:=v_sort+1;
  END LOOP;

  IF (SELECT coalesce(sum(q.marks),0) FROM public.questions q WHERE q.source_paper_id=v_qp_id AND q.marks>0)<>v_total_marks THEN
    RAISE EXCEPTION 'missing_qp_ingest_post_mark_gate_failed:%',v_qp_id;
  END IF;

  RETURN jsonb_build_object(
    'version','missing-qp-source-ingest-v1','sourcePaperId',v_qp_id,
    'markSchemeSourcePaperId',v_ms_id,'replayed',false,
    'insertedQuestions',v_inserted,'sourceOccurrences',v_occurrences,
    'markSchemes',v_schemes,'marks',v_total_marks
  );
END
$function$;

REVOKE ALL ON FUNCTION public.apply_missing_qp_source_ingest_v1(jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_missing_qp_source_ingest_v1(jsonb)
  TO service_role;
