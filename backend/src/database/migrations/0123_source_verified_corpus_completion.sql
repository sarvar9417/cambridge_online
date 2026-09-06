-- Source-verified completion gates for newly staged Cambridge past papers.
--
-- This migration turns the historical one-off safety migrations into scoped,
-- replay-safe service-role functions so a newly released paper can move through
-- exactly the same lifecycle: ingest as needs_review -> flag missing printed
-- structures -> repair from the SHA-pinned source -> build canonical structured
-- content -> promote only when every source/review invariant is satisfied.

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v1(
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
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code;
  END IF;
  IF p_year<2015 OR p_year>2035 THEN RAISE EXCEPTION 'invalid_year:%',p_year; END IF;

  CREATE TEMP TABLE _source_fidelity_scope(
    question_id uuid PRIMARY KEY,
    display_ref text NOT NULL,
    required_kind text NOT NULL,
    cue text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _source_fidelity_scope(question_id,display_ref,required_kind,cue)
  WITH RECURSIVE eligible AS (
    SELECT q.id,q.parent_id,q.display_ref,
      regexp_replace(
        lower(coalesce(q.stem_md,'')||' '||coalesce(q.context_md,'')),
        '[[:space:]]+',' ','g'
      ) source_text
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE sy.code=p_syllabus_code
      AND sp.year=p_year
      AND sp.source_url IS NOT NULL
      AND sp.variant BETWEEN 1 AND 3
      AND q.marks IS NOT NULL
      AND q.status IN ('approved','needs_review')
  ), required AS (
    SELECT e.*,
      CASE
        WHEN e.source_text ~ 'complete[[:space:]]+((the|this|following)[[:space:]]+)?(truth[[:space:]]+)?table' THEN 'complete_table'
        WHEN e.source_text ~ 'fill[[:space:]]+in[[:space:]]+((the|this|following)[[:space:]]+)?(truth[[:space:]]+)?table' THEN 'fill_table'
        WHEN e.source_text ~ 'tick.{0,220}each[[:space:]]+row|each[[:space:]]+row.{0,220}tick' THEN 'tick_grid'
        WHEN e.source_text ~ 'select[[:space:]]+(one[[:space:]]+)?(box|column).{0,180}each[[:space:]]+row' THEN 'selection_grid'
        WHEN e.source_text ~ 'match[[:space:]]+each|draw[[:space:]]+(a[[:space:]]+)?line.{0,180}match|draw[[:space:]]+lines?.{0,180}match|join[[:space:]]+each.{0,180}(correct|matching)' THEN 'matching_layout'
        ELSE NULL
      END cue
    FROM eligible e
  ), chain AS (
    SELECT r.id leaf_id,r.id node_id,r.parent_id
    FROM required r WHERE r.cue IS NOT NULL
    UNION ALL
    SELECT c.leaf_id,p.id,p.parent_id
    FROM chain c JOIN public.questions p ON p.id=c.parent_id
  )
  SELECT r.id,r.display_ref,
    CASE WHEN r.cue='matching_layout' THEN 'layout' ELSE 'table' END,
    r.cue
  FROM required r
  WHERE r.cue IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM chain c
      JOIN public.question_assets qa ON qa.question_id=c.node_id
      WHERE c.leaf_id=r.id AND (
        (qa.kind='table' AND nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL)
        OR (
          qa.kind IN ('diagram','image') AND (
            nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
            OR coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)'
            OR coalesce(qa.svg_markup,'') ~* '^\s*<svg(?:\s|>)'
          )
        )
      )
    );

  INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT
    'source_structure_required_but_missing_'||s.required_kind,
    'error','questions',s.question_id,
    CASE s.required_kind
      WHEN 'table' THEN 'The question requires a printed table/tick-grid structure, but no source-faithful structured table or visual exists.'
      ELSE 'The question requires a printed matching/layout structure, but no source-faithful structured representation exists.'
    END,
    jsonb_build_object(
      'displayRef',s.display_ref,'requiredKind',s.required_kind,'cue',s.cue,
      'audit','scoped-source-fidelity-v1','syllabusCode',p_syllabus_code,'year',p_year
    )
  FROM _source_fidelity_scope s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.validation_findings vf
    WHERE vf.ref_table='questions' AND vf.ref_id=s.question_id
      AND vf.rule_code='source_structure_required_but_missing_'||s.required_kind
      AND vf.resolved_at IS NULL
  );

  SELECT count(*) FILTER(WHERE required_kind='table'),
         count(*) FILTER(WHERE required_kind='layout')
  INTO v_table,v_layout
  FROM _source_fidelity_scope;

  CREATE TEMP TABLE _source_visual_scope(
    question_id uuid PRIMARY KEY,
    display_ref text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _source_visual_scope(question_id,display_ref)
  WITH RECURSIVE eligible AS (
    SELECT q.id,q.parent_id,q.display_ref,
      regexp_replace(
        lower(coalesce(q.stem_md,'')||' '||coalesce(q.context_md,'')),
        '[[:space:]]+',' ','g'
      ) source_text
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE sy.code=p_syllabus_code
      AND sp.year=p_year
      AND sp.source_url IS NOT NULL
      AND sp.variant BETWEEN 1 AND 3
      AND q.marks IS NOT NULL
      AND q.status IN ('approved','needs_review')
  ), required AS (
    SELECT * FROM eligible
    WHERE source_text ~ (
      'following (logic )?circuit'
      || '|logic circuit (is )?shown|circuit shown (below|above)'
      || '|following diagram|diagram (is )?shown|diagram shows|diagram represents|diagram shown (below|above)'
      || '|shown in (the )?(diagram|figure)|figure[[:space:]]+[0-9]+(\.[0-9]+)?[[:space:]]+(shows|is shown)'
      || '|following flowchart|flowchart (is )?shown|flowchart shown|complete.{0,80}flowchart'
      || '|following graph|graph (is )?shown|graph shown (below|above)'
      || '|following (bitmap )?image|image (is )?shown|image shown (below|above)'
      || '|complete (the )?(following )?(diagram|logic circuit)'
      || '|complete (the )?(e-r|entity[- ]relationship) diagram'
      || '|complete (the )?(class|state.{0,3}transition) diagram'
      || '|complete (the )?binary tree|state.{0,3}transition diagram'
      || '|structure chart|syntax diagrams?|current state of the stack'
    )
  ), chain AS (
    SELECT r.id leaf_id,r.id node_id,r.parent_id
    FROM required r
    UNION ALL
    SELECT c.leaf_id,p.id,p.parent_id
    FROM chain c JOIN public.questions p ON p.id=c.parent_id
  )
  SELECT r.id,r.display_ref
  FROM required r
  WHERE NOT EXISTS (
    SELECT 1
    FROM chain c
    JOIN public.question_assets qa ON qa.question_id=c.node_id
    WHERE c.leaf_id=r.id
      AND qa.kind IN ('diagram','image')
      AND (
        nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
        OR coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)'
        OR coalesce(qa.svg_markup,'') ~* '^\s*<svg(?:\s|>)'
      )
  );

  INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT
    'source_visual_required_but_missing','error','questions',s.question_id,
    'The question explicitly depends on a printed source visual, but no source-faithful diagram/image exists.',
    jsonb_build_object(
      'displayRef',s.display_ref,'audit','scoped-source-fidelity-v1',
      'syllabusCode',p_syllabus_code,'year',p_year
    )
  FROM _source_visual_scope s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.validation_findings vf
    WHERE vf.ref_table='questions' AND vf.ref_id=s.question_id
      AND vf.rule_code='source_visual_required_but_missing'
      AND vf.resolved_at IS NULL
  );

  SELECT count(*) INTO v_visual FROM _source_visual_scope;

  UPDATE public.questions q
  SET status='needs_review'::review_status,updated_at=now()
  WHERE q.id IN (
    SELECT question_id FROM _source_fidelity_scope
    UNION
    SELECT question_id FROM _source_visual_scope
  ) AND q.status='approved'::review_status;

  RETURN jsonb_build_object(
    'syllabusCode',p_syllabus_code,'year',p_year,
    'tableFindings',v_table,'layoutFindings',v_layout,'visualFindings',v_visual,
    'totalDistinctQuestions',(
      SELECT count(*) FROM (
        SELECT question_id FROM _source_fidelity_scope
        UNION SELECT question_id FROM _source_visual_scope
      ) x
    )
  );
END
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  TO service_role;

CREATE OR REPLACE FUNCTION public.structured_content_backfill_bootstrap_v2(
  p_syllabus_code text,
  p_year_from int,
  p_year_to int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_source_papers integer;
  v_papers_with_leaves integer;
  v_leaf_count integer;
  v_result jsonb;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN RAISE EXCEPTION 'unsupported syllabus code'; END IF;
  IF p_year_from<2015 OR p_year_to<p_year_from OR p_year_to>2035 THEN
    RAISE EXCEPTION 'invalid_year_window:%-%',p_year_from,p_year_to;
  END IF;

  SELECT count(*)::integer INTO v_source_papers
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code=p_syllabus_code
    AND sp.kind='QP'::paper_kind
    AND sp.variant BETWEEN 1 AND 3
    AND sp.year BETWEEN p_year_from AND p_year_to
    AND sp.source_url IS NOT NULL
    AND nullif(btrim(sp.sha256),'') IS NOT NULL;

  SELECT count(DISTINCT sp.id)::integer,count(q.id)::integer
  INTO v_papers_with_leaves,v_leaf_count
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  JOIN public.questions q ON q.source_paper_id=sp.id
  WHERE s.code=p_syllabus_code
    AND sp.kind='QP'::paper_kind
    AND sp.variant BETWEEN 1 AND 3
    AND sp.year BETWEEN p_year_from AND p_year_to
    AND sp.source_url IS NOT NULL
    AND nullif(btrim(sp.sha256),'') IS NOT NULL
    AND q.marks IS NOT NULL
    AND q.status IN ('approved','needs_review');

  IF v_source_papers=0 THEN RAISE EXCEPTION 'structured_backfill_scope_empty'; END IF;
  IF v_papers_with_leaves<>v_source_papers THEN
    RAISE EXCEPTION 'structured_backfill_uningested_sources:%/%',v_papers_with_leaves,v_source_papers;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    WHERE s.code=p_syllabus_code
      AND sp.kind='QP'::paper_kind
      AND sp.variant BETWEEN 1 AND 3
      AND sp.year BETWEEN p_year_from AND p_year_to
      AND sp.source_url IS NOT NULL
      AND nullif(btrim(sp.sha256),'') IS NOT NULL
      AND (
        SELECT coalesce(sum(q.marks),0)
        FROM public.questions q
        WHERE q.source_paper_id=sp.id
          AND q.marks IS NOT NULL
          AND q.status IN ('approved','needs_review')
      )<>c.total_marks
  ) THEN
    RAISE EXCEPTION 'structured_backfill_paper_mark_gate_failed';
  END IF;

  SELECT jsonb_build_object(
    'version','structured-content-backfill-bootstrap-v2',
    'syllabusCode',p_syllabus_code,'yearFrom',p_year_from,'yearTo',p_year_to,
    'paperCount',v_source_papers,'leafCount',v_leaf_count,
    'sources',coalesce(jsonb_agg(source_row ORDER BY (source_row->>'year')::integer,source_row->>'series',(source_row->>'component')::integer,(source_row->>'variant')::integer),'[]'::jsonb)
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'sourcePaperId',sp.id,'sourceUrl',sp.source_url,'sourceSha256',lower(sp.sha256),
      'syllabusCode',s.code,'component',c.number,'variant',sp.variant,
      'series',sp.series::text,'year',sp.year,
      'leaves',(
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'questionId',q.id,'path',q.path,'displayRef',q.display_ref,
          'stemMd',q.stem_md,'contextMd',q.context_md,'marks',q.marks,
          'answerKind',q.answer_kind::text,'answerLines',q.answer_lines,
          'status',q.status::text,'contentVersion',q.content_version,
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
              'id',qa.id,'kind',qa.kind::text,'contentMd',qa.content_md,
              'storagePath',qa.storage_path,'altText',qa.alt_text,'sortOrder',qa.sort_order,
              'sourcePage',qa.source_page,'sourceBbox',qa.source_bbox,
              'contentHash',qa.content_hash,'cropStatus',qa.crop_status
            ) ORDER BY qa.sort_order,qa.id),'[]'::jsonb)
            FROM public.question_assets qa WHERE qa.question_id=q.id
          )
        ) ORDER BY q.sort_order,q.id),'[]'::jsonb)
        FROM public.questions q
        WHERE q.source_paper_id=sp.id AND q.marks IS NOT NULL
          AND q.status IN ('approved','needs_review')
      )
    ) source_row
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    WHERE s.code=p_syllabus_code
      AND sp.kind='QP'::paper_kind
      AND sp.variant BETWEEN 1 AND 3
      AND sp.year BETWEEN p_year_from AND p_year_to
      AND sp.source_url IS NOT NULL
      AND nullif(btrim(sp.sha256),'') IS NOT NULL
  ) sources;
  RETURN v_result;
END
$function$;

REVOKE ALL ON FUNCTION public.structured_content_backfill_bootstrap_v2(text,int,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.structured_content_backfill_bootstrap_v2(text,int,int)
  TO service_role;

CREATE OR REPLACE FUNCTION public.approve_source_verified_structured_questions_v1(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_eligible integer;
  v_promoted integer;
  v_blocked integer;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code; END IF;
  IF p_year<2015 OR p_year>2035 THEN RAISE EXCEPTION 'invalid_year:%',p_year; END IF;

  CREATE TEMP TABLE _promotion_scope(question_id uuid PRIMARY KEY) ON COMMIT DROP;
  INSERT INTO _promotion_scope(question_id)
  SELECT q.id
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  WHERE sy.code=p_syllabus_code
    AND sp.year=p_year
    AND sp.variant BETWEEN 1 AND 3
    AND sp.source_url IS NOT NULL
    AND q.marks IS NOT NULL
    AND q.status='needs_review'::review_status
    AND q.content_version=1
    AND q.content_json IS NOT NULL
    AND q.content_json->'source'->>'paperId'=sp.id::text
    AND lower(coalesce(q.content_json->'source'->>'sha256',''))=lower(sp.sha256)
    AND EXISTS (
      SELECT 1 FROM public.structured_content_backfill_audits a
      WHERE a.question_id=q.id AND a.source_paper_id=sp.id
        AND lower(a.source_sha256)=lower(sp.sha256)
    )
    AND EXISTS (
      SELECT 1 FROM public.mark_schemes ms
      WHERE ms.question_id=q.id AND ms.status='approved'::review_status
    )
    AND (SELECT count(*) FROM public.question_subtopics qs WHERE qs.question_id=q.id AND qs.is_primary)=1
    AND EXISTS (SELECT 1 FROM public.question_learning_objectives qlo WHERE qlo.question_id=q.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.validation_findings vf
      WHERE vf.ref_table='questions' AND vf.ref_id=q.id
        AND vf.resolved_at IS NULL AND vf.severity='error'
    );

  SELECT count(*) INTO v_eligible FROM _promotion_scope;
  UPDATE public.questions q
  SET status='approved'::review_status,
      notes=CASE
        WHEN coalesce(q.notes,'') LIKE '%source_fidelity":"verified-canonical%' THEN q.notes
        ELSE jsonb_build_object(
          'source_fidelity','verified-canonical',
          'approved_by','source-verified-corpus-completion-v1'
        )::text
      END,
      updated_at=now()
  FROM _promotion_scope p
  WHERE q.id=p.question_id;
  GET DIAGNOSTICS v_promoted=ROW_COUNT;

  SELECT count(*) INTO v_blocked
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  WHERE sy.code=p_syllabus_code AND sp.year=p_year
    AND sp.variant BETWEEN 1 AND 3 AND sp.source_url IS NOT NULL
    AND q.marks IS NOT NULL AND q.status<>'approved'::review_status;

  RETURN jsonb_build_object(
    'syllabusCode',p_syllabus_code,'year',p_year,
    'eligible',v_eligible,'promoted',v_promoted,'stillBlocked',v_blocked
  );
END
$function$;

REVOKE ALL ON FUNCTION public.approve_source_verified_structured_questions_v1(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.approve_source_verified_structured_questions_v1(text,int)
  TO service_role;

-- The source audit must grow with the official corpus. Historical fixed totals
-- (118 QPs / 2985 leaves / 8850 marks) become stale as soon as Cambridge releases
-- a new session, so derive the baseline from SHA-backed source rows instead.
CREATE OR REPLACE FUNCTION public.qp_source_audit_runner_bootstrap_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_papers integer;
  v_leaves integer;
  v_marks integer;
  v_result jsonb;
BEGIN
  SELECT count(*),
    coalesce(sum((SELECT count(*) FROM public.questions q WHERE q.source_paper_id=sp.id AND q.marks>0)),0)::integer,
    coalesce(sum((SELECT coalesce(sum(q.marks),0) FROM public.questions q WHERE q.source_paper_id=sp.id AND q.marks>0)),0)::integer
  INTO v_papers,v_leaves,v_marks
  FROM public.source_papers sp
  JOIN public.syllabi s ON s.id=sp.syllabus_id
  WHERE s.code='9618' AND sp.kind='QP'::paper_kind
    AND sp.variant BETWEEN 1 AND 3
    AND sp.source_url IS NOT NULL
    AND nullif(btrim(sp.sha256),'') IS NOT NULL;

  IF v_papers=0 THEN RAISE EXCEPTION 'qp_source_audit_scope_empty'; END IF;
  IF EXISTS (
    SELECT 1
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    WHERE s.code='9618' AND sp.kind='QP'::paper_kind
      AND sp.variant BETWEEN 1 AND 3
      AND sp.source_url IS NOT NULL
      AND nullif(btrim(sp.sha256),'') IS NOT NULL
      AND (SELECT coalesce(sum(q.marks),0) FROM public.questions q WHERE q.source_paper_id=sp.id AND q.marks>0)<>c.total_marks
  ) THEN
    RAISE EXCEPTION 'qp_source_audit_paper_mark_gate_failed';
  END IF;

  SELECT jsonb_build_object(
    'parserVersion','qp-source-repair-v3',
    'auditVersion','9618-source-audit-v2',
    'paperCount',v_papers,'leafCount',v_leaves,'marks',v_marks,
    'sources',coalesce(jsonb_agg(src ORDER BY (src->>'year')::integer,src->>'series',(src->>'component')::integer,(src->>'variant')::integer),'[]'::jsonb)
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'sourcePaperId',sp.id,'sourceUrl',sp.source_url,'sourceSha256',lower(sp.sha256),
      'syllabusCode',s.code,'component',c.number,'variant',sp.variant,
      'series',sp.series::text,'year',sp.year,'expectedMarks',c.total_marks,
      'leaves',(
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'questionId',q.id,'path',q.path,'marks',q.marks,'displayRef',q.display_ref,
          'stemMd',q.stem_md,'contextMd',q.context_md,'status',q.status::text,
          'promptVersion',q.prompt_version
        ) ORDER BY q.sort_order,q.id),'[]'::jsonb)
        FROM public.questions q WHERE q.source_paper_id=sp.id AND q.marks>0
      )
    ) src
    FROM public.source_papers sp
    JOIN public.syllabi s ON s.id=sp.syllabus_id
    JOIN public.components c ON c.id=sp.component_id
    WHERE s.code='9618' AND sp.kind='QP'::paper_kind
      AND sp.variant BETWEEN 1 AND 3
      AND sp.source_url IS NOT NULL
      AND nullif(btrim(sp.sha256),'') IS NOT NULL
  ) x;
  RETURN v_result;
END
$function$;

REVOKE ALL ON FUNCTION public.qp_source_audit_runner_bootstrap_v1()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qp_source_audit_runner_bootstrap_v1()
  TO service_role;
