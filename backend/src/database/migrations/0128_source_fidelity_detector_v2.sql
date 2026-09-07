-- Source-fidelity detector v2.
--
-- Problems fixed compared with the first scoped detector:
-- 1. one question can require more than one source structure (for example a
--    printed structure chart plus a response table);
-- 2. generic mentions such as "draw a structure chart" must not be treated as
--    proof that a chart is already printed in the source;
-- 3. ordinary source tables (not only "complete the table" tasks) must be
--    preserved when the wording/layout strongly identifies a printed table.

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v2(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_table integer := 0;
  v_layout integer := 0;
  v_visual integer := 0;
  v_distinct integer := 0;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code;
  END IF;
  IF p_year<2015 OR p_year>2035 THEN RAISE EXCEPTION 'invalid_year:%',p_year; END IF;

  CREATE TEMP TABLE _fidelity_v2_required(
    question_id uuid NOT NULL,
    display_ref text NOT NULL,
    required_kind text NOT NULL,
    rule_code text NOT NULL,
    cue text NOT NULL,
    PRIMARY KEY(question_id,rule_code)
  ) ON COMMIT DROP;

  -- Printed/response tables and grids. This intentionally includes a few very
  -- strong source-table header patterns because historical extraction flattened
  -- those rows into prose even though the original QP is visibly tabular.
  INSERT INTO _fidelity_v2_required(question_id,display_ref,required_kind,rule_code,cue)
  WITH eligible AS (
    SELECT q.id,q.display_ref,
      regexp_replace(lower(coalesce(q.context_md,'')||' '||coalesce(q.stem_md,'')),'[[:space:]]+',' ','g') flat,
      lower(coalesce(q.context_md,'')||E'\n'||coalesce(q.stem_md,'')) raw
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE sy.code=p_syllabus_code AND sp.year=p_year
      AND sp.variant BETWEEN 1 AND 3 AND sp.source_url IS NOT NULL
      AND q.marks IS NOT NULL AND q.status IN ('approved','needs_review')
  )
  SELECT e.id,e.display_ref,'table','source_structure_required_but_missing_table',
    CASE
      WHEN e.flat ~ 'complete.{0,100}(truth[[:space:]]+)?table' THEN 'complete_table'
      WHEN e.flat ~ 'fill[[:space:]]+in.{0,80}(truth[[:space:]]+)?table' THEN 'fill_table'
      WHEN e.flat ~ 'tick.{0,220}each[[:space:]]+row|each[[:space:]]+row.{0,220}tick' THEN 'tick_grid'
      WHEN e.flat ~ 'select[[:space:]]+(one[[:space:]]+)?(box|column).{0,180}each[[:space:]]+row' THEN 'selection_grid'
      WHEN e.flat ~ '(study|use|refer to|complete)[[:space:]]+(the[[:space:]]+)?(following[[:space:]]+)?table' THEN 'printed_table_explicit'
      WHEN e.flat ~ 'the[[:space:]]+(following[[:space:]]+)?table[[:space:]]+(shows|gives|contains|lists|details|records|describes|summarises|summarizes)' THEN 'printed_table_description'
      WHEN e.flat ~ 'shown[[:space:]]+in[[:space:]]+(the[[:space:]]+)?table|given[[:space:]]+in[[:space:]]+(the[[:space:]]+)?table' THEN 'printed_table_reference'
      WHEN e.raw ~ 'module[[:space:]]+name[[:space:]]{2,}description' THEN 'module_description_table'
      WHEN e.raw ~ 'current[[:space:]]+state[[:space:]]{2,}event[[:space:]]{2,}next[[:space:]]+state' THEN 'state_transition_table'
      WHEN e.raw ~ 'symbol[[:space:]]{2,}explanation' THEN 'symbol_explanation_table'
      ELSE 'source_table'
    END
  FROM eligible e
  WHERE e.flat ~ (
       'complete.{0,100}(truth[[:space:]]+)?table'
    || '|fill[[:space:]]+in.{0,80}(truth[[:space:]]+)?table'
    || '|tick.{0,220}each[[:space:]]+row|each[[:space:]]+row.{0,220}tick'
    || '|select[[:space:]]+(one[[:space:]]+)?(box|column).{0,180}each[[:space:]]+row'
    || '|(study|use|refer to|complete)[[:space:]]+(the[[:space:]]+)?(following[[:space:]]+)?table'
    || '|the[[:space:]]+(following[[:space:]]+)?table[[:space:]]+(shows|gives|contains|lists|details|records|describes|summarises|summarizes)'
    || '|shown[[:space:]]+in[[:space:]]+(the[[:space:]]+)?table|given[[:space:]]+in[[:space:]]+(the[[:space:]]+)?table'
  ) OR e.raw ~ 'module[[:space:]]+name[[:space:]]{2,}description'
     OR e.raw ~ 'current[[:space:]]+state[[:space:]]{2,}event[[:space:]]{2,}next[[:space:]]+state'
     OR e.raw ~ 'symbol[[:space:]]{2,}explanation';

  -- Matching layouts are source geometry rather than ordinary prose.
  INSERT INTO _fidelity_v2_required(question_id,display_ref,required_kind,rule_code,cue)
  WITH eligible AS (
    SELECT q.id,q.display_ref,
      regexp_replace(lower(coalesce(q.context_md,'')||' '||coalesce(q.stem_md,'')),'[[:space:]]+',' ','g') flat
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE sy.code=p_syllabus_code AND sp.year=p_year
      AND sp.variant BETWEEN 1 AND 3 AND sp.source_url IS NOT NULL
      AND q.marks IS NOT NULL AND q.status IN ('approved','needs_review')
  )
  SELECT e.id,e.display_ref,'layout','source_structure_required_but_missing_layout','matching_layout'
  FROM eligible e
  WHERE e.flat ~ 'match[[:space:]]+each|draw[[:space:]]+(a[[:space:]]+)?line.{0,180}match|draw[[:space:]]+lines?.{0,180}match|join[[:space:]]+each.{0,180}(correct|matching)'
  ON CONFLICT(question_id,rule_code) DO NOTHING;

  -- Printed diagrams. Unlike v1, do not flag a bare phrase such as "draw a
  -- structure chart". Require source-present language such as following/shown,
  -- study/examine, partially completed, or the strongly graphical syntax-diagram
  -- family.
  INSERT INTO _fidelity_v2_required(question_id,display_ref,required_kind,rule_code,cue)
  WITH eligible AS (
    SELECT q.id,q.display_ref,
      regexp_replace(lower(coalesce(q.context_md,'')||' '||coalesce(q.stem_md,'')),'[[:space:]]+',' ','g') flat
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE sy.code=p_syllabus_code AND sp.year=p_year
      AND sp.variant BETWEEN 1 AND 3 AND sp.source_url IS NOT NULL
      AND q.marks IS NOT NULL AND q.status IN ('approved','needs_review')
  )
  SELECT e.id,e.display_ref,'visual','source_visual_required_but_missing','printed_visual'
  FROM eligible e
  WHERE e.flat ~ (
       'following[[:space:]]+(logic[[:space:]]+)?circuit'
    || '|following[[:space:]]+(state[- ]transition[[:space:]]+)?diagram'
    || '|following[[:space:]]+flowchart|following[[:space:]]+graph|following[[:space:]]+(bitmap[[:space:]]+)?image'
    || '|following[[:space:]]+syntax[[:space:]]+diagrams?'
    || '|(study|examine)[[:space:]]+(the[[:space:]]+)?(following[[:space:]]+)?(structure[[:space:]]+chart|state[- ]transition[[:space:]]+diagram|diagram|flowchart|logic[[:space:]]+circuit|graph|image|syntax[[:space:]]+diagrams?)'
    || '|(structure[[:space:]]+chart|state[- ]transition[[:space:]]+diagram|logic[[:space:]]+circuit|flowchart|diagram|graph|image)[[:space:]]+(is[[:space:]]+|are[[:space:]]+)?(shown|illustrated|given|provided)'
    || '|part[[:space:]]+of[[:space:]]+(the[[:space:]]+)?structure[[:space:]]+chart[[:space:]]+is[[:space:]]+shown'
    || '|structure[[:space:]]+chart[[:space:]]+(shows|illustrates)'
    || '|structure[[:space:]]+chart[[:space:]]+has[[:space:]]+been[[:space:]]+partially[[:space:]]+completed'
    || '|complete[[:space:]]+(the[[:space:]]+)?(following[[:space:]]+)?(structure[[:space:]]+chart|state[- ]transition[[:space:]]+diagram|diagram|logic[[:space:]]+circuit|flowchart|e-r[[:space:]]+diagram|entity[- ]relationship[[:space:]]+diagram|class[[:space:]]+diagram)'
    || '|syntax[[:space:]]+diagrams?[[:space:]]+(are[[:space:]]+|is[[:space:]]+)?shown'
    || '|several[[:space:]]+syntax[[:space:]]+diagrams?[[:space:]]+are[[:space:]]+shown'
    || '|diagram[[:space:]]+(shows|represents)|shown[[:space:]]+in[[:space:]]+(the[[:space:]]+)?(diagram|figure)'
  )
  ON CONFLICT(question_id,rule_code) DO NOTHING;

  -- Remove requirements already satisfied by canonical structured/source assets.
  DELETE FROM _fidelity_v2_required r
  WHERE EXISTS (
    WITH RECURSIVE chain(node_id,parent_id) AS (
      SELECT q.id,q.parent_id FROM public.questions q WHERE q.id=r.question_id
      UNION ALL
      SELECT p.id,p.parent_id FROM chain c JOIN public.questions p ON p.id=c.parent_id
    )
    SELECT 1 FROM chain c
    JOIN public.question_assets qa ON qa.question_id=c.node_id
    WHERE (
      r.required_kind='table' AND (
        (qa.kind='table' AND nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL)
        OR (qa.kind IN ('diagram','image') AND (
          nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
          OR coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)'
          OR coalesce(qa.svg_markup,'') ~* '^\s*<svg(?:\s|>)'
        ))
      )
      OR r.required_kind IN ('layout','visual') AND qa.kind IN ('diagram','image') AND (
        nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
        OR coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)'
        OR coalesce(qa.svg_markup,'') ~* '^\s*<svg(?:\s|>)'
      )
    )
  );

  INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT r.rule_code,'error','questions',r.question_id,
    CASE r.required_kind
      WHEN 'table' THEN 'The source question contains a printed table/grid that is not preserved as a structured table or verified source visual.'
      WHEN 'layout' THEN 'The source question contains a matching/layout structure that is not preserved faithfully.'
      ELSE 'The source question depends on a printed visual that is not preserved faithfully.'
    END,
    jsonb_build_object(
      'displayRef',r.display_ref,'requiredKind',r.required_kind,'cue',r.cue,
      'audit','source-fidelity-detector-v2','syllabusCode',p_syllabus_code,'year',p_year
    )
  FROM _fidelity_v2_required r
  WHERE NOT EXISTS (
    SELECT 1 FROM public.validation_findings vf
    WHERE vf.ref_table='questions' AND vf.ref_id=r.question_id
      AND vf.rule_code=r.rule_code AND vf.resolved_at IS NULL
  );

  UPDATE public.questions q
  SET status='needs_review'::review_status,updated_at=now()
  WHERE q.status='approved'::review_status
    AND EXISTS(SELECT 1 FROM _fidelity_v2_required r WHERE r.question_id=q.id);

  SELECT count(*) FILTER(WHERE required_kind='table'),
         count(*) FILTER(WHERE required_kind='layout'),
         count(*) FILTER(WHERE required_kind='visual'),
         count(DISTINCT question_id)
  INTO v_table,v_layout,v_visual,v_distinct
  FROM _fidelity_v2_required;

  RETURN jsonb_build_object(
    'version','source-fidelity-detector-v2',
    'syllabusCode',p_syllabus_code,'year',p_year,
    'tableFindings',coalesce(v_table,0),'layoutFindings',coalesce(v_layout,0),
    'visualFindings',coalesce(v_visual,0),'totalDistinctQuestions',coalesce(v_distinct,0)
  );
END
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v2(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v2(text,int)
  TO service_role;

-- Keep the existing runner contract stable while upgrading its implementation.
CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v1(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT public.flag_source_fidelity_requirements_v2(p_syllabus_code,p_year)
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  TO service_role;
