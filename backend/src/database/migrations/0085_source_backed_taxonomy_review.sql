-- Source-backed systematic review of 9618 Topic/Subtopic + LO mappings.
-- This is intentionally NOT recorded as human review: reviewed_at/reviewed_by are untouched.
-- All writes are service-role-only, old-hash guarded, historical-syllabus scoped and backed up.

CREATE TABLE IF NOT EXISTS public.question_taxonomy_review_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  source_paper_id uuid NOT NULL REFERENCES public.source_papers(id) ON DELETE RESTRICT,
  review_tag text NOT NULL,
  old_hash text NOT NULL,
  old_status text NOT NULL,
  old_primary_subtopic_id uuid,
  old_primary_subtopic_code text,
  old_primary_confidence numeric,
  old_primary_set_by text,
  old_los jsonb NOT NULL DEFAULT '[]'::jsonb,
  new_primary_subtopic_id uuid NOT NULL,
  new_primary_subtopic_code text NOT NULL,
  new_primary_confidence numeric NOT NULL,
  new_los jsonb NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(question_id,review_tag)
);
CREATE INDEX IF NOT EXISTS question_taxonomy_review_history_question_idx
  ON public.question_taxonomy_review_history(question_id,applied_at DESC);
ALTER TABLE public.question_taxonomy_review_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.question_taxonomy_review_history FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.topic_review_state_hash_v1(p_question_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT md5(
    q.id::text || chr(31) || q.status::text || chr(31) ||
    coalesce(q.stem_md,'') || chr(31) || coalesce(q.context_md,'') || chr(31) ||
    q.display_ref || chr(31) || coalesce(q.marks::text,'') || chr(31) ||
    coalesce((
      SELECT qs.subtopic_id::text || ':' || coalesce(qs.confidence::text,'') || ':' || qs.set_by
      FROM public.question_subtopics qs
      WHERE qs.question_id=q.id AND qs.is_primary
      ORDER BY qs.confidence DESC NULLS LAST,qs.subtopic_id
      LIMIT 1
    ),'') || chr(31) ||
    coalesce((
      SELECT string_agg(qlo.lo_id::text || ':' || coalesce(qlo.confidence::text,''),'|' ORDER BY qlo.lo_id)
      FROM public.question_learning_objectives qlo
      WHERE qlo.question_id=q.id
    ),'')
  )
  FROM public.questions q
  WHERE q.id=p_question_id
$function$;

CREATE OR REPLACE FUNCTION public.topic_review_taxonomy_bootstrap_v1()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'syllabusId',sy.id,
    'version',sy.version_label,
    'validFrom',sy.valid_from,
    'validTo',sy.valid_to,
    'subtopicId',st.id,
    'subtopicCode',st.code,
    'subtopicTitle',st.title,
    'topicNumber',t.number,
    'topicTitle',t.title,
    'los',coalesce((
      SELECT jsonb_agg(jsonb_build_object('id',lo.id,'code',lo.code,'text',lo.text) ORDER BY lo.sort_order,lo.code)
      FROM public.learning_objectives lo
      WHERE lo.subtopic_id=st.id
    ),'[]'::jsonb)
  ) ORDER BY sy.valid_from,t.number,st.sort_order),'[]'::jsonb)
  FROM public.syllabi sy
  JOIN public.topics t ON t.syllabus_id=sy.id
  JOIN public.subtopics st ON st.topic_id=t.id
  WHERE sy.code='9618'
$function$;

CREATE OR REPLACE FUNCTION public.topic_review_questions_bootstrap_v1(
  p_status text,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 250
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF p_status NOT IN ('approved','needs_review') THEN RAISE EXCEPTION 'topic_review_bad_status'; END IF;
  IF p_offset<0 OR p_limit<1 OR p_limit>500 THEN RAISE EXCEPTION 'topic_review_bad_page'; END IF;

  WITH base AS (
    SELECT q.*,sp.year,sp.series,sp.variant,sp.syllabus_id,sy.version_label,c.number component_number
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id AND sy.code='9618'
    JOIN public.components c ON c.id=sp.component_id
    WHERE sp.kind='QP'::paper_kind
      AND sp.source_url IS NOT NULL
      AND q.marks>0
      AND q.status::text=p_status
    ORDER BY sp.year,c.number,sp.variant,q.sort_order,q.id
    OFFSET p_offset LIMIT p_limit
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',q.id,
    'sourcePaperId',q.source_paper_id,
    'sourceRef',q.display_ref,
    'path',q.path,
    'stem',coalesce(q.stem_md,''),
    'context',concat_ws(E'\n',nullif(q.context_md,''),nullif(anc.ancestor_text,'')),
    'marks',q.marks,
    'commandWord',q.command_word,
    'component',q.component_number,
    'year',q.year,
    'series',q.series,
    'variant',q.variant,
    'syllabusId',q.syllabus_id,
    'syllabusVersion',q.version_label,
    'currentPrimary',jsonb_build_object(
      'id',pm.subtopic_id,'code',pm.code,'title',pm.subtopic_title,
      'confidence',pm.confidence,'setBy',pm.set_by
    ),
    'currentLos',coalesce(los.current_los,'[]'::jsonb),
    'markScheme',coalesce(ms.ms_text,''),
    'oldHash',public.topic_review_state_hash_v1(q.id)
  ) ORDER BY q.year,q.component_number,q.variant,q.sort_order,q.id),'[]'::jsonb)
  INTO v_result
  FROM base q
  LEFT JOIN LATERAL (
    SELECT qs.subtopic_id,qs.confidence,qs.set_by,st.code,st.title subtopic_title
    FROM public.question_subtopics qs
    JOIN public.subtopics st ON st.id=qs.subtopic_id
    WHERE qs.question_id=q.id AND qs.is_primary
    ORDER BY qs.confidence DESC NULLS LAST,st.sort_order
    LIMIT 1
  ) pm ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'id',lo.id,'code',lo.code,'text',lo.text,'confidence',qlo.confidence
    ) ORDER BY lo.code) current_los
    FROM public.question_learning_objectives qlo
    JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
    WHERE qlo.question_id=q.id
  ) los ON true
  LEFT JOIN LATERAL (
    WITH RECURSIVE a AS (
      SELECT p.id,p.parent_id,p.depth,p.stem_md,p.context_md
      FROM public.questions p WHERE p.id=q.parent_id
      UNION ALL
      SELECT p.id,p.parent_id,p.depth,p.stem_md,p.context_md
      FROM public.questions p JOIN a ON a.parent_id=p.id
    )
    SELECT string_agg(concat_ws(E'\n',nullif(context_md,''),nullif(stem_md,'')),E'\n' ORDER BY depth) ancestor_text
    FROM a
  ) anc ON true
  LEFT JOIN LATERAL (
    SELECT concat_ws(E'\n',
      nullif(ms0.guidance_md,''),
      nullif((SELECT string_agg(msp.text,E'\n' ORDER BY msp.sort_order,msp.code) FROM public.mark_scheme_points msp WHERE msp.mark_scheme_id=ms0.id),''),
      nullif((SELECT string_agg(concat_ws(E' ',msl.descriptor_md,msl.indicative_content_md),E'\n' ORDER BY msl.level_number) FROM public.mark_scheme_levels msl WHERE msl.mark_scheme_id=ms0.id),'')
    ) ms_text
    FROM public.mark_schemes ms0
    WHERE ms0.question_id=q.id
    ORDER BY ms0.created_at DESC
    LIMIT 1
  ) ms ON true;

  RETURN jsonb_build_object(
    'status',p_status,
    'offset',p_offset,
    'limit',p_limit,
    'rows',v_result,
    'count',jsonb_array_length(v_result)
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.apply_source_backed_taxonomy_review_v1(p_manifest jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_row jsonb;
  v_q public.questions%rowtype;
  v_sp public.source_papers%rowtype;
  v_syllabus_id uuid;
  v_component integer;
  v_subtopic_id uuid;
  v_subtopic_code text;
  v_topic_number integer;
  v_sub_conf numeric;
  v_old_hash text;
  v_current_hash text;
  v_old_primary record;
  v_old_los jsonb;
  v_new_los jsonb;
  v_lo jsonb;
  v_lo_id uuid;
  v_lo_code text;
  v_lo_conf numeric;
  v_expected_lo_count integer;
  v_review_tag text := 'source-backed-taxonomy-review-v1';
  v_updated integer := 0;
  v_changed_subtopic integer := 0;
  v_changed_lo integer := 0;
  v_old_lo_codes text;
  v_new_lo_codes text;
  v_notes text;
BEGIN
  IF jsonb_typeof(p_manifest)<>'object' THEN RAISE EXCEPTION 'topic_review_manifest_not_object'; END IF;
  IF p_manifest->>'reviewVersion' IS DISTINCT FROM v_review_tag THEN
    RAISE EXCEPTION 'topic_review_bad_version:%',p_manifest->>'reviewVersion';
  END IF;
  IF p_manifest #>> '{sources,2021-2023,driveId}' IS DISTINCT FROM '15_D_UaglzxqqK2NGAHboy_K-T3HbTUW5'
     OR p_manifest #>> '{sources,2021-2023,sha256}' IS DISTINCT FROM '978df926e9d4f6d1756105d321c1af5dd4bb9672207e5b268206e10133dfa2e5'
     OR p_manifest #>> '{sources,2024-2025,driveId}' IS DISTINCT FROM '1dFGZ2_wOYyQhcvpdVa0IN2x9bV3WQ1ZG'
     OR p_manifest #>> '{sources,2024-2025,sha256}' IS DISTINCT FROM '2f7deb2d66ca68bf30f517ce20681f0dd7af96f2c44aa775df9da21c0188d817'
     OR p_manifest #>> '{sources,2026,driveId}' IS DISTINCT FROM '1JzFMyhPaSvfyvlII1yXF1Av2uDHGtx6p'
     OR p_manifest #>> '{sources,2026,sha256}' IS DISTINCT FROM 'bf1b77a2b765d10eb4b005ecae0412add35cf6113ba3218a517893abfc9f2470' THEN
    RAISE EXCEPTION 'topic_review_source_provenance_mismatch';
  END IF;
  IF jsonb_typeof(p_manifest->'rows')<>'array' OR jsonb_array_length(p_manifest->'rows')=0 OR jsonb_array_length(p_manifest->'rows')>100 THEN
    RAISE EXCEPTION 'topic_review_bad_rows';
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_manifest->'rows') LOOP
    BEGIN v_q.id := (v_row->>'questionId')::uuid; EXCEPTION WHEN others THEN RAISE EXCEPTION 'topic_review_bad_question_id'; END;
    SELECT q.* INTO v_q FROM public.questions q WHERE q.id=v_q.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'topic_review_question_not_found:%',v_row->>'questionId'; END IF;
    IF v_q.status::text<>'needs_review' THEN
      IF EXISTS(SELECT 1 FROM public.question_taxonomy_review_history h WHERE h.question_id=v_q.id AND h.review_tag=v_review_tag) AND v_q.status::text='approved' THEN
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'topic_review_status_changed:%:%',v_q.display_ref,v_q.status;
    END IF;
    IF coalesce(v_q.marks,0)<=0 THEN RAISE EXCEPTION 'topic_review_not_mark_bearing:%',v_q.display_ref; END IF;

    SELECT * INTO v_sp FROM public.source_papers sp WHERE sp.id=v_q.source_paper_id AND sp.kind='QP'::paper_kind AND sp.source_url IS NOT NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'topic_review_not_source_backed:%',v_q.display_ref; END IF;
    v_syllabus_id := v_sp.syllabus_id;
    SELECT c.number INTO v_component FROM public.components c WHERE c.id=v_sp.component_id;

    v_old_hash := nullif(v_row->>'oldHash','');
    v_current_hash := public.topic_review_state_hash_v1(v_q.id);
    IF v_old_hash IS NULL OR v_old_hash<>v_current_hash THEN
      RAISE EXCEPTION 'topic_review_old_hash_mismatch:%:%:%',v_q.display_ref,v_old_hash,v_current_hash;
    END IF;

    v_subtopic_code := nullif(trim(coalesce(v_row->>'subtopicCode','')),'');
    v_sub_conf := coalesce((v_row->>'subtopicConfidence')::numeric,0);
    IF v_subtopic_code IS NULL OR v_sub_conf<0.80 OR v_sub_conf>1 THEN
      RAISE EXCEPTION 'topic_review_subtopic_gate:%:%:%',v_q.display_ref,v_subtopic_code,v_sub_conf;
    END IF;
    SELECT st.id,t.number INTO v_subtopic_id,v_topic_number
    FROM public.subtopics st JOIN public.topics t ON t.id=st.topic_id
    WHERE t.syllabus_id=v_syllabus_id AND st.code=v_subtopic_code;
    IF NOT FOUND THEN RAISE EXCEPTION 'topic_review_subtopic_not_in_historical_syllabus:%:%',v_q.display_ref,v_subtopic_code; END IF;
    IF (v_component<=2 AND NOT (v_topic_number BETWEEN 1 AND 12)) OR (v_component>=3 AND NOT (v_topic_number BETWEEN 13 AND 20)) THEN
      RAISE EXCEPTION 'topic_review_component_scope_mismatch:%:P%:%',v_q.display_ref,v_component,v_subtopic_code;
    END IF;

    IF jsonb_typeof(v_row->'los')<>'array' OR jsonb_array_length(v_row->'los')<1 OR jsonb_array_length(v_row->'los')>6 THEN
      RAISE EXCEPTION 'topic_review_lo_count_gate:%',v_q.display_ref;
    END IF;
    SELECT count(DISTINCT x.value->>'code'),count(*) INTO v_expected_lo_count,v_component
    FROM jsonb_array_elements(v_row->'los') x(value);
    IF v_expected_lo_count<>v_component THEN RAISE EXCEPTION 'topic_review_duplicate_lo:%',v_q.display_ref; END IF;
    -- restore component number after using the integer scratch variable above
    SELECT c.number INTO v_component FROM public.components c WHERE c.id=v_sp.component_id;

    SELECT qs.subtopic_id,st.code,qs.confidence,qs.set_by
      INTO v_old_primary
    FROM public.question_subtopics qs JOIN public.subtopics st ON st.id=qs.subtopic_id
    WHERE qs.question_id=v_q.id AND qs.is_primary
    ORDER BY qs.confidence DESC NULLS LAST,st.sort_order LIMIT 1;
    IF v_old_primary.subtopic_id IS NULL THEN RAISE EXCEPTION 'topic_review_missing_old_primary:%',v_q.display_ref; END IF;

    SELECT coalesce(jsonb_agg(jsonb_build_object('id',lo.id,'code',lo.code,'confidence',qlo.confidence) ORDER BY lo.code),'[]'::jsonb),
           coalesce(string_agg(lo.code,'|' ORDER BY lo.code),'')
      INTO v_old_los,v_old_lo_codes
    FROM public.question_learning_objectives qlo JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
    WHERE qlo.question_id=v_q.id;

    v_new_los := '[]'::jsonb;
    v_new_lo_codes := '';
    FOR v_lo IN SELECT value FROM jsonb_array_elements(v_row->'los') LOOP
      v_lo_code := nullif(trim(coalesce(v_lo->>'code','')),'');
      v_lo_conf := coalesce((v_lo->>'confidence')::numeric,0);
      IF v_lo_code IS NULL OR v_lo_conf<0.80 OR v_lo_conf>1 THEN
        RAISE EXCEPTION 'topic_review_lo_gate:%:%:%',v_q.display_ref,v_lo_code,v_lo_conf;
      END IF;
      SELECT lo.id INTO v_lo_id
      FROM public.learning_objectives lo
      WHERE lo.subtopic_id=v_subtopic_id AND lo.code=v_lo_code;
      IF NOT FOUND THEN RAISE EXCEPTION 'topic_review_lo_not_in_target_subtopic:%:%:%',v_q.display_ref,v_subtopic_code,v_lo_code; END IF;
      v_new_los := v_new_los || jsonb_build_array(jsonb_build_object('id',v_lo_id,'code',v_lo_code,'confidence',v_lo_conf));
    END LOOP;
    SELECT coalesce(string_agg(x.value->>'code','|' ORDER BY x.value->>'code'),'') INTO v_new_lo_codes FROM jsonb_array_elements(v_new_los) x(value);

    INSERT INTO public.question_taxonomy_review_history(
      question_id,source_paper_id,review_tag,old_hash,old_status,
      old_primary_subtopic_id,old_primary_subtopic_code,old_primary_confidence,old_primary_set_by,old_los,
      new_primary_subtopic_id,new_primary_subtopic_code,new_primary_confidence,new_los,evidence,source_provenance
    ) VALUES (
      v_q.id,v_q.source_paper_id,v_review_tag,v_current_hash,v_q.status::text,
      v_old_primary.subtopic_id,v_old_primary.code,v_old_primary.confidence,v_old_primary.set_by,v_old_los,
      v_subtopic_id,v_subtopic_code,v_sub_conf,v_new_los,coalesce(v_row->'evidence','{}'::jsonb),p_manifest->'sources'
    ) ON CONFLICT(question_id,review_tag) DO NOTHING;

    UPDATE public.question_subtopics SET is_primary=false WHERE question_id=v_q.id AND is_primary;
    INSERT INTO public.question_subtopics(question_id,subtopic_id,is_primary,weight,confidence,set_by)
    VALUES(v_q.id,v_subtopic_id,true,1.0,v_sub_conf,'source_review_drive_9618_v1')
    ON CONFLICT(question_id,subtopic_id) DO UPDATE SET
      is_primary=true,weight=1.0,confidence=excluded.confidence,set_by=excluded.set_by;

    DELETE FROM public.question_learning_objectives WHERE question_id=v_q.id;
    FOR v_lo IN SELECT value FROM jsonb_array_elements(v_new_los) LOOP
      INSERT INTO public.question_learning_objectives(question_id,lo_id,confidence)
      VALUES(v_q.id,(v_lo->>'id')::uuid,(v_lo->>'confidence')::numeric);
    END LOOP;

    v_notes := trim(replace(coalesce(v_q.notes,''),
      'taxonomy-review: low-confidence automated taxonomy/LO mapping retained; source evidence is insufficient for automatic promotion.',''));
    UPDATE public.questions
      SET status='approved',
          notes=concat_ws(E'\n',nullif(v_notes,''),'taxonomy-source-review: source-backed-taxonomy-review-v1; Google Drive official syllabus + source-backed QP/MS evidence; not human review.'),
          updated_at=now()
    WHERE id=v_q.id;

    IF v_old_primary.subtopic_id IS DISTINCT FROM v_subtopic_id THEN v_changed_subtopic:=v_changed_subtopic+1; END IF;
    IF v_old_lo_codes IS DISTINCT FROM v_new_lo_codes THEN v_changed_lo:=v_changed_lo+1; END IF;
    v_updated:=v_updated+1;
  END LOOP;

  RETURN jsonb_build_object('updated',v_updated,'changedSubtopic',v_changed_subtopic,'changedLo',v_changed_lo,'reviewTag',v_review_tag);
END
$function$;

REVOKE ALL ON FUNCTION public.topic_review_state_hash_v1(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.topic_review_taxonomy_bootstrap_v1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.topic_review_questions_bootstrap_v1(text,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.apply_source_backed_taxonomy_review_v1(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.topic_review_state_hash_v1(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.topic_review_taxonomy_bootstrap_v1() TO service_role;
GRANT EXECUTE ON FUNCTION public.topic_review_questions_bootstrap_v1(text,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_source_backed_taxonomy_review_v1(jsonb) TO service_role;
