-- Repair Paper 4 practical dependency reconciliation.
--
-- The v1 reconciler only searched the same immediate parent for the preceding
-- program task. That fails when Cambridge places the final implementation in
-- one part (for example 2(c)(ii)) and the screenshot tests in the next part
-- (2(d)(i)/(ii)). It can also incorrectly chain a later screenshot test to an
-- earlier screenshot test. v2 instead resolves each test/screenshot leaf to the
-- nearest preceding code-producing marked leaf in the same top-level question.

CREATE OR REPLACE FUNCTION public.reconcile_source_question_dependencies_v1(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_answer integer := 0;
  v_practical integer := 0;
  v_text integer := 0;
  v_unresolved_answer integer := 0;
  v_unresolved_practical integer := 0;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code;
  END IF;
  IF p_year<2015 OR p_year>2035 THEN RAISE EXCEPTION 'invalid_year:%',p_year; END IF;

  DROP TABLE IF EXISTS _source_dep_scope;
  CREATE TEMP TABLE _source_dep_scope AS
  SELECT q.id,q.source_paper_id,q.parent_id,q.path,q.sort_order,q.display_ref,c.number component,
         regexp_replace(
           lower(coalesce(q.context_md,'')||' '||coalesce(q.stem_md,'')),
           '[[:space:]]+',' ','g'
         ) source_text
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  JOIN public.components c ON c.id=q.component_id
  WHERE sy.code=p_syllabus_code AND sp.year=p_year
    AND sp.variant BETWEEN 1 AND 3 AND sp.source_url IS NOT NULL
    AND q.marks IS NOT NULL
    AND q.status IN ('approved','needs_review');

  CREATE INDEX ON _source_dep_scope(id);
  CREATE INDEX ON _source_dep_scope(source_paper_id,path);

  -- Explicit answer references. The target is always a part of the same top-level
  -- Cambridge question; do not infer a cross-paper or cross-question target.
  WITH refs AS (
    SELECT s.*,
      (regexp_match(
        s.source_text,
        '(?:answer (?:to|from|for)|use your answer (?:from|to|for)|using your answer (?:from|to|for))[[:space:]]+part[[:space:]]*(?:[0-9]+[[:space:]]*)?[(]?([a-z])[)]?(?:[[:space:]]*[(]([ivx]+)[)])?'
      )) m
    FROM _source_dep_scope s
    WHERE s.source_text ~
      '(answer (to|from|for) part|use your answer (from|to|for) part|using your answer (from|to|for) part)'
  ), targets AS (
    SELECT r.*,
      split_part(r.path,'.',1)||'.'||r.m[1]||
      CASE WHEN nullif(r.m[2],'') IS NULL THEN '' ELSE '.'||r.m[2] END target_path
    FROM refs r WHERE r.m IS NOT NULL
  ), resolved AS (
    SELECT t.id question_id,d.id depends_on_id,t.display_ref,d.display_ref target_ref
    FROM targets t
    JOIN _source_dep_scope d
      ON d.source_paper_id=t.source_paper_id AND d.path=t.target_path
    WHERE d.id<>t.id
  )
  INSERT INTO public.question_dependencies(
    question_id,depends_on_id,kind,strength,evidence,detected_by,confidence
  )
  SELECT question_id,depends_on_id,'answer_ref','required',
    'Explicit Cambridge source wording requires the answer produced in '||target_ref||'.',
    'source-dependency-reconcile-v2',1.0
  FROM resolved
  ON CONFLICT(question_id,depends_on_id) DO UPDATE SET
    kind='answer_ref',strength='required',evidence=excluded.evidence,
    detected_by=excluded.detected_by,confidence=excluded.confidence;
  GET DIAGNOSTICS v_answer=ROW_COUNT;

  -- Remove only practical dependencies previously inferred by this reconciler so
  -- a bad screenshot->screenshot chain cannot survive a corrected run.
  DELETE FROM public.question_dependencies qd
  USING _source_dep_scope s
  WHERE qd.question_id=s.id
    AND qd.detected_by IN ('source-dependency-reconcile-v1','source-dependency-reconcile-v2')
    AND qd.evidence LIKE 'Sequential Cambridge Paper 4%';

  -- Paper 4 evidence/test tasks consume the nearest preceding marked leaf in the
  -- same top-level question that actually produces program code. This crosses
  -- intermediate part containers while deliberately excluding earlier test/
  -- screenshot leaves.
  WITH tests AS (
    SELECT s.* FROM _source_dep_scope s
    WHERE s.component=4
      AND s.source_text ~ 'test (your|the) program|test the program|take (a|one or more) screenshots?|screenshot.*output'
  ), candidates AS (
    SELECT t.id question_id,p.id depends_on_id,p.display_ref target_ref,
           row_number() OVER(
             PARTITION BY t.id
             ORDER BY p.sort_order DESC,p.path DESC,p.id
           ) rn
    FROM tests t
    JOIN _source_dep_scope p
      ON p.source_paper_id=t.source_paper_id
     AND split_part(p.path,'.',1)=split_part(t.path,'.',1)
     AND p.sort_order<t.sort_order
     AND p.source_text ~ 'write program code|program code to|program code for|extend the main program|amend the main program'
     AND p.source_text !~ 'test (your|the) program|test the program|take (a|one or more) screenshots?|screenshot.*output'
  ), resolved AS (
    SELECT question_id,depends_on_id,target_ref FROM candidates WHERE rn=1
  )
  INSERT INTO public.question_dependencies(
    question_id,depends_on_id,kind,strength,evidence,detected_by,confidence
  )
  SELECT question_id,depends_on_id,'answer_ref','required',
    'Sequential Cambridge Paper 4 test/screenshot task requires the program produced in '||target_ref||'.',
    'source-dependency-reconcile-v2',1.0
  FROM resolved
  ON CONFLICT(question_id,depends_on_id) DO UPDATE SET
    kind='answer_ref',strength='required',evidence=excluded.evidence,
    detected_by=excluded.detected_by,confidence=excluded.confidence;
  GET DIAGNOSTICS v_practical=ROW_COUNT;

  -- Explicit source-material references to another part. Keep this deliberately
  -- narrower than generic mentions of "part" so independent sibling questions
  -- do not become coupled accidentally.
  WITH refs AS (
    SELECT s.*,
      (regexp_match(
        s.source_text,
        '(?:using|use|refer to|shown in|given in|from)[^.;]{0,120}(?:table|diagram|structure chart|flowchart|pseudocode|code|data|information)?[^.;]{0,80}part[[:space:]]*(?:[0-9]+[[:space:]]*)?[(]?([a-z])[)]?(?:[[:space:]]*[(]([ivx]+)[)])?'
      )) m
    FROM _source_dep_scope s
    WHERE s.source_text ~
      '(using|use|refer to|shown in|given in|from).{0,220}part[[:space:]]*(?:[0-9]+[[:space:]]*)?[(]?[a-z][)]?'
      AND s.source_text !~
      '(answer (to|from|for) part|use your answer (from|to|for) part|using your answer (from|to|for) part)'
  ), targets AS (
    SELECT r.*,
      split_part(r.path,'.',1)||'.'||r.m[1]||
      CASE WHEN nullif(r.m[2],'') IS NULL THEN '' ELSE '.'||r.m[2] END target_path
    FROM refs r WHERE r.m IS NOT NULL
  ), resolved AS (
    SELECT t.id question_id,d.id depends_on_id,t.display_ref,d.display_ref target_ref
    FROM targets t
    JOIN _source_dep_scope d
      ON d.source_paper_id=t.source_paper_id AND d.path=t.target_path
    WHERE d.id<>t.id
  )
  INSERT INTO public.question_dependencies(
    question_id,depends_on_id,kind,strength,evidence,detected_by,confidence
  )
  SELECT question_id,depends_on_id,'text_ref','required',
    'Explicit Cambridge source wording requires printed material from '||target_ref||'.',
    'source-dependency-reconcile-v2',1.0
  FROM resolved
  ON CONFLICT(question_id,depends_on_id) DO NOTHING;
  GET DIAGNOSTICS v_text=ROW_COUNT;

  -- A previous unresolved finding may become stale after deterministic repair.
  UPDATE public.validation_findings vf
  SET resolved_at=now(),
      resolution='Automatically resolved by source-dependency-reconcile-v2 after deterministic dependency reconstruction.'
  FROM _source_dep_scope s
  WHERE vf.ref_table='questions' AND vf.ref_id=s.id
    AND vf.rule_code IN (
      'source_dependency_required_but_unresolved_answer',
      'source_dependency_required_but_unresolved_practical'
    )
    AND vf.resolved_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.question_dependencies qd
      WHERE qd.question_id=s.id AND qd.kind='answer_ref' AND qd.strength='required'
    );

  -- Fail closed: explicit dependencies that still cannot be resolved remain
  -- release-blocking findings rather than guessed relationships.
  INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT
    'source_dependency_required_but_unresolved_answer','error','questions',s.id,
    'The Cambridge question explicitly requires an answer from another part, but the source dependency could not be resolved.',
    jsonb_build_object('displayRef',s.display_ref,'audit','source-dependency-reconcile-v2','year',p_year)
  FROM _source_dep_scope s
  WHERE s.source_text ~
      '(answer (to|from|for) part|use your answer (from|to|for) part|using your answer (from|to|for) part)'
    AND NOT EXISTS (
      SELECT 1 FROM public.question_dependencies qd
      WHERE qd.question_id=s.id AND qd.kind='answer_ref' AND qd.strength='required'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.validation_findings vf
      WHERE vf.ref_table='questions' AND vf.ref_id=s.id
        AND vf.rule_code='source_dependency_required_but_unresolved_answer'
        AND vf.resolved_at IS NULL
    );

  INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT
    'source_dependency_required_but_unresolved_practical','error','questions',s.id,
    'The Cambridge Paper 4 test/screenshot task has no resolvable preceding program dependency.',
    jsonb_build_object('displayRef',s.display_ref,'audit','source-dependency-reconcile-v2','year',p_year)
  FROM _source_dep_scope s
  WHERE s.component=4
    AND s.source_text ~ 'test (your|the) program|test the program|take (a|one or more) screenshots?|screenshot.*output'
    AND NOT EXISTS (
      SELECT 1 FROM public.question_dependencies qd
      WHERE qd.question_id=s.id AND qd.kind='answer_ref' AND qd.strength='required'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.validation_findings vf
      WHERE vf.ref_table='questions' AND vf.ref_id=s.id
        AND vf.rule_code='source_dependency_required_but_unresolved_practical'
        AND vf.resolved_at IS NULL
    );

  SELECT count(*) INTO v_unresolved_answer
  FROM public.validation_findings vf
  JOIN _source_dep_scope s ON s.id=vf.ref_id AND vf.ref_table='questions'
  WHERE vf.rule_code='source_dependency_required_but_unresolved_answer'
    AND vf.resolved_at IS NULL;

  SELECT count(*) INTO v_unresolved_practical
  FROM public.validation_findings vf
  JOIN _source_dep_scope s ON s.id=vf.ref_id AND vf.ref_table='questions'
  WHERE vf.rule_code='source_dependency_required_but_unresolved_practical'
    AND vf.resolved_at IS NULL;

  RETURN jsonb_build_object(
    'version','source-dependency-reconcile-v2',
    'syllabusCode',p_syllabus_code,'year',p_year,
    'answerDependenciesUpserted',v_answer,
    'practicalDependenciesUpserted',v_practical,
    'textDependenciesInserted',v_text,
    'unresolvedAnswerDependencies',v_unresolved_answer,
    'unresolvedPracticalDependencies',v_unresolved_practical
  );
END
$function$;

REVOKE ALL ON FUNCTION public.reconcile_source_question_dependencies_v1(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_source_question_dependencies_v1(text,int)
  TO service_role;
