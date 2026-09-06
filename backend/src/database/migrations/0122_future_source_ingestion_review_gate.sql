-- Future source ingestion must remain fail-closed until canonical source evidence
-- exists. Reuse the proven v3 transactional importer, but force new leaves into
-- needs_review before the deferred structured-content gate can evaluate them.
-- Their real taxonomy confidence is restored after insertion and is not used as
-- an approval shortcut.

CREATE OR REPLACE FUNCTION public.ingest_source_backfill_paper_v4(
  p_qp_id uuid,
  p_ms_id uuid,
  p_rows jsonb,
  p_prompt text DEFAULT 'source-backed-oidc-v2'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_safe_rows jsonb;
  v_result jsonb;
  v_row jsonb;
  v_qid uuid;
  v_code text;
  v_leaf_count integer;
  v_review_count integer;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows)=0 THEN
    RAISE EXCEPTION 'empty_rows';
  END IF;

  SELECT s.code INTO v_code
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE sp.id=p_qp_id AND sp.kind='QP'::paper_kind;
  IF v_code NOT IN ('0478','9618') THEN RAISE EXCEPTION 'unsupported_source_syllabus:%',v_code; END IF;

  SELECT jsonb_agg(
    jsonb_set(value,'{confidence}',to_jsonb(0.0::numeric),true)
    ORDER BY ordinality
  ) INTO v_safe_rows
  FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS rows(value,ordinality);

  v_result:=public.ingest_source_backfill_paper_v3(p_qp_id,p_ms_id,v_safe_rows,p_prompt);

  -- v3 intentionally used a zero review confidence only to prevent premature
  -- approval. Restore the classifier evidence and source-derived context now.
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    SELECT q.id INTO v_qid
    FROM public.questions q
    WHERE q.source_paper_id=p_qp_id AND q.path=v_row->>'path';
    IF v_qid IS NULL THEN RAISE EXCEPTION 'ingested_leaf_missing:%',v_row->>'path'; END IF;

    UPDATE public.questions q
    SET context_md=nullif(btrim(v_row->>'context'),''),
        extract_confidence=coalesce((v_row->>'confidence')::numeric,0),
        notes=jsonb_build_object(
          'taxonomy_method',coalesce(v_row->>'method','semantic'),
          'taxonomy_confidence',coalesce((v_row->>'confidence')::numeric,0),
          'lo_confidence',coalesce((v_row->>'lo_confidence')::numeric,0),
          'source_fidelity','pending-canonical-source-review'
        )::text,
        updated_at=now()
    WHERE q.id=v_qid;

    UPDATE public.question_subtopics qs
    SET confidence=coalesce((v_row->>'confidence')::numeric,.60),
        set_by='source-backed-'||v_code
    WHERE qs.question_id=v_qid AND qs.is_primary;
  END LOOP;

  SELECT count(*),count(*) FILTER (WHERE status='needs_review'::review_status)
  INTO v_leaf_count,v_review_count
  FROM public.questions
  WHERE source_paper_id=p_qp_id AND marks IS NOT NULL;
  IF v_leaf_count<>v_review_count THEN
    RAISE EXCEPTION 'future_ingestion_review_gate_failed:%/%',v_review_count,v_leaf_count;
  END IF;

  RETURN v_result || jsonb_build_object(
    'syllabusCode',v_code,
    'reviewState','needs_review',
    'sourceReviewRequired',true
  );
END
$$;

REVOKE ALL ON FUNCTION public.ingest_source_backfill_paper_v4(uuid,uuid,jsonb,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_source_backfill_paper_v4(uuid,uuid,jsonb,text)
  TO service_role;

-- Keep bootstrap training source-backed and reviewed. Newly ingested 2026 leaves
-- are needs_review and therefore can never train the classifier that labels the
-- remaining 2026 papers in the same run.
CREATE OR REPLACE FUNCTION public.corpus_runner_bootstrap_v2(
  p_syllabus_code text,
  p_year_from int,
  p_year_to int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_sources jsonb;
  v_train_sub jsonb;
  v_train_lo jsonb;
  v_coverage jsonb;
BEGIN
  IF p_syllabus_code NOT IN ('9618','0478') THEN
    RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code;
  END IF;
  IF p_year_from<2015 OR p_year_to<p_year_from OR p_year_to>2035 THEN
    RAISE EXCEPTION 'invalid_year_window:%-%',p_year_from,p_year_to;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'qp_id',q.id,'ms_id',m.id,'year',q.year,'series',q.series::text,
    'component',c.number,'variant',q.variant,'qp_url',q.source_url,
    'ms_url',m.source_url,'syllabus_id',q.syllabus_id,'component_id',q.component_id,
    'expected_marks',c.total_marks,'version_label',s.version_label
  ) ORDER BY q.year,q.series,c.number,q.variant),'[]'::jsonb)
  INTO v_sources
  FROM public.source_papers q
  JOIN public.syllabi s ON s.id=q.syllabus_id AND s.code=p_syllabus_code
  JOIN public.components c ON c.id=q.component_id
  JOIN public.source_papers m ON m.kind='MS'::paper_kind
    AND m.syllabus_id=q.syllabus_id AND m.component_id=q.component_id
    AND m.year=q.year AND m.series=q.series AND m.variant=q.variant
  WHERE q.kind='QP'::paper_kind
    AND q.year BETWEEN p_year_from AND p_year_to
    AND q.variant BETWEEN 1 AND 3
    AND q.source_url IS NOT NULL AND m.source_url IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.questions x WHERE x.source_paper_id=q.id);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'syllabus_id',sp.syllabus_id,'component',c.number,'path',q.path,
    'stem',left(coalesce(q.stem_md,''),1600),
    'guidance',left(coalesce(ms.guidance_md,''),1200),'subtopic',st.code
  )),'[]'::jsonb)
  INTO v_train_sub
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id AND s.code=p_syllabus_code
  JOIN public.components c ON c.id=q.component_id
  JOIN public.question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  JOIN public.subtopics st ON st.id=qs.subtopic_id
  LEFT JOIN public.mark_schemes ms ON ms.question_id=q.id
  WHERE q.marks>0
    AND q.status='approved'::review_status
    AND sp.source_url IS NOT NULL
    AND sp.variant BETWEEN 1 AND 3
    AND sp.year BETWEEN p_year_from AND p_year_to;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'syllabus_id',sp.syllabus_id,'component',c.number,'subtopic',st.code,
    'path',q.path,'stem',left(coalesce(q.stem_md,''),1600),
    'guidance',left(coalesce(ms.guidance_md,''),1200),'lo',lo.code
  )),'[]'::jsonb)
  INTO v_train_lo
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id AND s.code=p_syllabus_code
  JOIN public.components c ON c.id=q.component_id
  JOIN public.question_subtopics qs ON qs.question_id=q.id AND qs.is_primary
  JOIN public.subtopics st ON st.id=qs.subtopic_id
  JOIN public.question_learning_objectives qlo ON qlo.question_id=q.id
  JOIN public.learning_objectives lo ON lo.id=qlo.lo_id
  LEFT JOIN public.mark_schemes ms ON ms.question_id=q.id
  WHERE q.marks>0
    AND q.status='approved'::review_status
    AND sp.source_url IS NOT NULL
    AND sp.variant BETWEEN 1 AND 3
    AND sp.year BETWEEN p_year_from AND p_year_to;

  SELECT coalesce(jsonb_agg(x.obj ORDER BY x.valid_from,x.component),'[]'::jsonb)
  INTO v_coverage
  FROM (
    SELECT s.valid_from,c.number component,jsonb_build_object(
      'syllabus_id',s.id,'version',s.version_label,'valid_from',s.valid_from,
      'valid_to',s.valid_to,'component_id',c.id,'component',c.number,
      'expected_marks',c.total_marks,
      'subtopics',coalesce((
        SELECT jsonb_agg(jsonb_build_object('code',st.code,'title',st.title) ORDER BY st.sort_order,st.code)
        FROM public.component_topics ct
        JOIN public.topics tp2 ON tp2.id=ct.topic_id
        JOIN public.subtopics st ON st.topic_id=tp2.id
        WHERE ct.component_id=c.id
      ),'[]'::jsonb),
      'los',coalesce((
        SELECT jsonb_agg(jsonb_build_object('subtopic',st.code,'code',lo.code,'text',lo.text)
          ORDER BY st.sort_order,lo.sort_order,lo.code)
        FROM public.component_learning_objectives cl
        JOIN public.learning_objectives lo ON lo.id=cl.learning_objective_id
        JOIN public.subtopics st ON st.id=lo.subtopic_id
        WHERE cl.component_id=c.id
      ),'[]'::jsonb)
    ) obj
    FROM public.syllabi s
    JOIN public.components c ON c.syllabus_id=s.id
    WHERE s.code=p_syllabus_code
      AND NOT(s.valid_to<p_year_from OR s.valid_from>p_year_to)
  ) x;

  RETURN jsonb_build_object(
    'syllabus_code',p_syllabus_code,'year_from',p_year_from,'year_to',p_year_to,
    'sources',v_sources,'training_subtopics',v_train_sub,
    'training_los',v_train_lo,'coverage',v_coverage
  );
END
$$;

REVOKE ALL ON FUNCTION public.corpus_runner_bootstrap_v2(text,int,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.corpus_runner_bootstrap_v2(text,int,int)
  TO service_role;
