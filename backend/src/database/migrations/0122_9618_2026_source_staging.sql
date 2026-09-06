-- Stage the official Cambridge 9618 source corpus for 2026+ without losing the
-- archived Phase-0 demo questions that historical assignments still reference.
--
-- The old manual 2026 M/J 11 QP/MS rows are moved to an internal variant 0
-- identity. Their UUIDs, archived questions, answer references and assignment
-- references remain unchanged. This frees the real 2026 M/J 11 identity for the
-- SHA-verified Cambridge source pair.

DO $$
DECLARE
  v_qp public.source_papers%ROWTYPE;
  v_ms public.source_papers%ROWTYPE;
  v_question_count integer;
  v_live_count integer;
  v_before jsonb;
BEGIN
  SELECT sp.* INTO v_qp
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  WHERE s.code='9618'
    AND sp.kind='QP'::paper_kind
    AND sp.year=2026
    AND sp.series='MJ'::exam_series
    AND c.number=1
    AND sp.variant=1
    AND sp.storage_path='manual/phase-0-qp.pdf'
    AND sp.source_url IS NULL;

  SELECT sp.* INTO v_ms
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  WHERE s.code='9618'
    AND sp.kind='MS'::paper_kind
    AND sp.year=2026
    AND sp.series='MJ'::exam_series
    AND c.number=1
    AND sp.variant=1
    AND sp.storage_path='manual/phase-0-ms.pdf'
    AND sp.source_url IS NULL;

  IF v_qp.id IS NULL AND v_ms.id IS NULL THEN
    -- Clean installs and already-migrated databases need no legacy relocation.
    RETURN;
  END IF;
  IF v_qp.id IS NULL OR v_ms.id IS NULL THEN
    RAISE EXCEPTION 'phase0_2026_source_pair_incomplete';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.source_papers sp
    WHERE sp.syllabus_id=v_qp.syllabus_id
      AND sp.component_id=v_qp.component_id
      AND sp.year=2026
      AND sp.series='MJ'::exam_series
      AND sp.variant=0
      AND sp.kind IN ('QP'::paper_kind,'MS'::paper_kind)
  ) THEN
    RAISE EXCEPTION 'phase0_legacy_variant_already_occupied';
  END IF;

  SELECT count(*),count(*) FILTER (WHERE status<>'archived'::review_status)
  INTO v_question_count,v_live_count
  FROM public.questions
  WHERE source_paper_id=v_qp.id;
  IF v_question_count<>40 OR v_live_count<>0 THEN
    RAISE EXCEPTION 'phase0_2026_seed_not_safely_archived:%:%',v_question_count,v_live_count;
  END IF;

  v_before:=jsonb_build_object(
    'qp',to_jsonb(v_qp),
    'ms',to_jsonb(v_ms),
    'questionCount',v_question_count
  );

  UPDATE public.source_papers
  SET variant=0,storage_path='legacy/manual/phase-0-qp.pdf'
  WHERE id=v_qp.id;
  UPDATE public.source_papers
  SET variant=0,storage_path='legacy/manual/phase-0-ms.pdf'
  WHERE id=v_ms.id;

  INSERT INTO public.audit_log(action,ref_table,ref_id,before,after)
  VALUES(
    'archive_phase0_9618_2026_source_identity',
    'source_papers',
    v_qp.id,
    v_before,
    jsonb_build_object(
      'qpId',v_qp.id,'msId',v_ms.id,'legacyVariant',0,
      'reason','Preserve historical demo references while freeing official 9618/11/M/J/26 identity'
    )
  );
END $$;

CREATE OR REPLACE FUNCTION public.stage_9618_remote_source_v1(
  p_year int,
  p_series text,
  p_component int,
  p_variant int,
  p_kind text,
  p_filename text,
  p_source_url text,
  p_sha256 text,
  p_page_count int DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_syllabus uuid;
  v_component uuid;
  v_id uuid;
  v_expected_name text;
  v_letter text;
  v_kind text;
BEGIN
  IF p_year<2021 OR p_year>2029 THEN RAISE EXCEPTION '9618_year_out_of_range:%',p_year; END IF;
  IF p_series NOT IN ('FM','MJ','ON') THEN RAISE EXCEPTION '9618_bad_series:%',p_series; END IF;
  IF p_component NOT IN (1,2,3,4) OR p_variant NOT IN (1,2,3) THEN
    RAISE EXCEPTION '9618_bad_paper:%/%',p_component,p_variant;
  END IF;
  v_kind:=upper(p_kind);
  IF v_kind NOT IN ('QP','MS') THEN RAISE EXCEPTION '9618_bad_kind:%',p_kind; END IF;
  IF p_source_url IS NULL OR p_source_url !~ '^https://drive\.google\.com/' THEN
    RAISE EXCEPTION '9618_bad_source_url';
  END IF;
  IF lower(coalesce(p_sha256,'')) !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION '9618_bad_sha256'; END IF;

  v_letter:=CASE p_series WHEN 'FM' THEN 'm' WHEN 'MJ' THEN 's' ELSE 'w' END;
  v_expected_name:=format(
    '9618_%s%s_%s_%s%s.pdf',v_letter,right(p_year::text,2),lower(v_kind),p_component,p_variant
  );
  IF lower(p_filename)<>v_expected_name THEN
    RAISE EXCEPTION '9618_filename_metadata_mismatch:%!=%',p_filename,v_expected_name;
  END IF;

  SELECT s.id INTO v_syllabus
  FROM public.syllabi s
  WHERE s.code='9618' AND p_year BETWEEN s.valid_from AND s.valid_to
  ORDER BY s.valid_from DESC LIMIT 1;
  IF v_syllabus IS NULL THEN RAISE EXCEPTION '9618_syllabus_version_missing:%',p_year; END IF;

  SELECT c.id INTO v_component
  FROM public.components c
  WHERE c.syllabus_id=v_syllabus AND c.number=p_component;
  IF v_component IS NULL THEN RAISE EXCEPTION '9618_component_missing:%:%',p_year,p_component; END IF;

  INSERT INTO public.source_papers(
    syllabus_id,component_id,year,series,variant,kind,storage_path,sha256,page_count,source_url
  ) VALUES(
    v_syllabus,v_component,p_year,p_series::exam_series,p_variant,v_kind::paper_kind,
    format('remote/9618/%s/%s/%s',p_year,p_series,v_expected_name),lower(p_sha256),p_page_count,p_source_url
  )
  ON CONFLICT(syllabus_id,component_id,year,series,variant,kind)
  DO UPDATE SET
    storage_path=excluded.storage_path,
    sha256=excluded.sha256,
    page_count=coalesce(excluded.page_count,public.source_papers.page_count),
    source_url=excluded.source_url
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id',v_id,'year',p_year,'series',p_series,'component',p_component,
    'variant',p_variant,'kind',v_kind,'filename',v_expected_name,'sha256',lower(p_sha256)
  );
END
$$;

REVOKE ALL ON FUNCTION public.stage_9618_remote_source_v1(int,text,int,int,text,text,text,text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stage_9618_remote_source_v1(int,text,int,int,text,text,text,text,int)
  TO service_role;
