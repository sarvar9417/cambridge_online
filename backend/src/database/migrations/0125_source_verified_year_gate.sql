-- Final fail-closed release gate for a newly ingested source-backed exam year.
-- This does not guess missing dependencies. It proves that every official paper
-- is complete, source-pinned, structured and approved, and blocks release when
-- explicit answer/practical dependencies are still unresolved.

CREATE OR REPLACE FUNCTION public.assert_source_verified_year_v1(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_papers integer;
  v_ms_papers integer;
  v_bad_papers integer;
  v_unresolved integer;
  v_missing_answer integer;
  v_missing_practical integer;
  v_cross integer;
  v_self integer;
  v_cycles integer;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code;
  END IF;
  IF p_year<2015 OR p_year>2035 THEN RAISE EXCEPTION 'invalid_year:%',p_year; END IF;

  SELECT count(*) INTO v_papers
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code=p_syllabus_code AND sp.year=p_year
    AND sp.kind='QP'::paper_kind AND sp.variant BETWEEN 1 AND 3
    AND sp.source_url IS NOT NULL
    AND lower(coalesce(sp.sha256,'')) ~ '^[0-9a-f]{64}$';

  SELECT count(*) INTO v_ms_papers
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code=p_syllabus_code AND sp.year=p_year
    AND sp.kind='MS'::paper_kind AND sp.variant BETWEEN 1 AND 3
    AND sp.source_url IS NOT NULL
    AND lower(coalesce(sp.sha256,'')) ~ '^[0-9a-f]{64}$';

  IF v_papers=0 OR v_ms_papers<>v_papers THEN
    RAISE EXCEPTION 'source_year_pair_gate_failed:qp=% ms=%',v_papers,v_ms_papers;
  END IF;
  IF p_syllabus_code='9618' AND p_year=2026 AND (v_papers<>12 OR v_ms_papers<>12) THEN
    RAISE EXCEPTION '9618_2026_requires_12_qp_ms_pairs:qp=% ms=%',v_papers,v_ms_papers;
  END IF;

  WITH scoped AS (
    SELECT sp.id,c.total_marks
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    WHERE s.code=p_syllabus_code AND sp.year=p_year
      AND sp.kind='QP'::paper_kind AND sp.variant BETWEEN 1 AND 3
      AND sp.source_url IS NOT NULL
  ), per AS (
    SELECT x.id,x.total_marks,
      count(q.id) FILTER(WHERE q.marks IS NOT NULL) leaves,
      coalesce(sum(q.marks) FILTER(WHERE q.marks IS NOT NULL),0) qp_marks,
      count(q.id) FILTER(WHERE q.marks IS NOT NULL AND q.status='approved'::review_status) approved,
      count(q.id) FILTER(WHERE q.marks IS NOT NULL AND q.content_version=1 AND q.content_json IS NOT NULL) structured,
      count(ms.id) FILTER(WHERE q.marks IS NOT NULL AND ms.status='approved'::review_status) schemes,
      coalesce(sum(ms.max_marks) FILTER(WHERE q.marks IS NOT NULL AND ms.status='approved'::review_status),0) ms_marks,
      count(q.id) FILTER(WHERE q.marks IS NOT NULL AND
        (SELECT count(*) FROM public.question_subtopics qs WHERE qs.question_id=q.id AND qs.is_primary)<>1) bad_primary,
      count(q.id) FILTER(WHERE q.marks IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM public.question_learning_objectives qlo WHERE qlo.question_id=q.id
      )) bad_lo,
      count(q.id) FILTER(WHERE q.marks IS NOT NULL AND NOT (
        q.content_json->'source'->>'paperId'=x.id::text
        AND lower(coalesce(q.content_json->'source'->>'sha256',''))=(
          SELECT lower(sp2.sha256) FROM public.source_papers sp2 WHERE sp2.id=x.id
        )
      )) bad_provenance
    FROM scoped x
    LEFT JOIN public.questions q ON q.source_paper_id=x.id
    LEFT JOIN public.mark_schemes ms ON ms.question_id=q.id
    GROUP BY x.id,x.total_marks
  )
  SELECT count(*) INTO v_bad_papers
  FROM per
  WHERE leaves=0 OR qp_marks<>total_marks OR ms_marks<>total_marks OR schemes<>leaves
     OR approved<>leaves OR structured<>leaves OR bad_primary<>0 OR bad_lo<>0 OR bad_provenance<>0;

  SELECT count(*) INTO v_unresolved
  FROM public.validation_findings vf
  JOIN public.questions q ON q.id=vf.ref_id AND vf.ref_table='questions'
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code=p_syllabus_code AND sp.year=p_year
    AND sp.kind='QP'::paper_kind AND sp.variant BETWEEN 1 AND 3
    AND q.marks IS NOT NULL AND vf.severity='error' AND vf.resolved_at IS NULL;

  SELECT count(*) INTO v_missing_answer
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code=p_syllabus_code AND sp.year=p_year
    AND sp.kind='QP'::paper_kind AND sp.variant BETWEEN 1 AND 3
    AND q.marks IS NOT NULL
    AND (coalesce(q.context_md,'')||' '||coalesce(q.stem_md,'')) ~* 
      '((your|the) answer (to|from|for) part|use your answer (from|to|for) part|using your answer (from|to|for) part)'
    AND NOT EXISTS(
      SELECT 1 FROM public.question_dependencies qd
      WHERE qd.question_id=q.id AND qd.kind='answer_ref' AND qd.strength='required'
    );

  SELECT count(*) INTO v_missing_practical
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.components c ON c.id=q.component_id
  WHERE s.code=p_syllabus_code AND sp.year=p_year
    AND sp.kind='QP'::paper_kind AND sp.variant BETWEEN 1 AND 3
    AND c.number=4 AND q.marks IS NOT NULL
    AND (coalesce(q.context_md,'')||' '||coalesce(q.stem_md,'')) ~*
      'test (your|the) program|test the program|take (a|one or more) screenshots?|screenshot.*output'
    AND NOT EXISTS(
      SELECT 1 FROM public.question_dependencies qd
      WHERE qd.question_id=q.id AND qd.kind='answer_ref' AND qd.strength='required'
    );

  SELECT count(*) INTO v_cross
  FROM public.question_dependencies qd
  JOIN public.questions q ON q.id=qd.question_id
  JOIN public.questions target ON target.id=qd.depends_on_id
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code=p_syllabus_code AND sp.year=p_year
    AND sp.kind='QP'::paper_kind AND sp.variant BETWEEN 1 AND 3
    AND q.source_paper_id<>target.source_paper_id;

  SELECT count(*) INTO v_self
  FROM public.question_dependencies qd
  JOIN public.questions q ON q.id=qd.question_id
  JOIN public.source_papers sp ON sp.id=q.source_paper_id
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code=p_syllabus_code AND sp.year=p_year
    AND sp.kind='QP'::paper_kind AND sp.variant BETWEEN 1 AND 3
    AND qd.question_id=qd.depends_on_id;

  WITH RECURSIVE edges AS (
    SELECT qd.question_id src,qd.depends_on_id dst,q.source_paper_id
    FROM public.question_dependencies qd
    JOIN public.questions q ON q.id=qd.question_id
    JOIN public.source_papers sp ON sp.id=q.source_paper_id
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    WHERE s.code=p_syllabus_code AND sp.year=p_year
      AND sp.kind='QP'::paper_kind AND sp.variant BETWEEN 1 AND 3
  ), walk AS (
    SELECT e.source_paper_id,e.src start,e.dst node,array[e.src,e.dst]::uuid[] path FROM edges e
    UNION ALL
    SELECT e.source_paper_id,w.start,e.dst,w.path||e.dst
    FROM walk w JOIN edges e ON e.source_paper_id=w.source_paper_id AND e.src=w.node
    WHERE NOT (e.dst=ANY(w.path))
  ), cyc AS (
    SELECT DISTINCT w.source_paper_id,w.start
    FROM walk w JOIN edges e ON e.source_paper_id=w.source_paper_id AND e.src=w.node
    WHERE e.dst=ANY(w.path)
  ) SELECT count(*) INTO v_cycles FROM cyc;

  IF v_bad_papers<>0 OR v_unresolved<>0 OR v_missing_answer<>0 OR v_missing_practical<>0
     OR v_cross<>0 OR v_self<>0 OR v_cycles<>0 THEN
    RAISE EXCEPTION
      'source_verified_year_gate_failed bad_papers=% unresolved=% missing_answer=% missing_practical=% cross=% self=% cycles=%',
      v_bad_papers,v_unresolved,v_missing_answer,v_missing_practical,v_cross,v_self,v_cycles;
  END IF;

  RETURN jsonb_build_object(
    'syllabusCode',p_syllabus_code,'year',p_year,'qpPapers',v_papers,'msPapers',v_ms_papers,
    'badPapers',v_bad_papers,'unresolvedErrors',v_unresolved,
    'missingAnswerDependencies',v_missing_answer,'missingPracticalDependencies',v_missing_practical,
    'crossPaperDependencies',v_cross,'selfDependencies',v_self,'dependencyCycles',v_cycles,
    'verified',true
  );
END
$function$;

REVOKE ALL ON FUNCTION public.assert_source_verified_year_v1(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assert_source_verified_year_v1(text,int)
  TO service_role;
