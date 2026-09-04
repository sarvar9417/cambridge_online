-- Retroactive corpus safety gate for QP leaves whose printed semantics require a
-- table/tick-grid/matching layout but whose leaf -> root chain has no structured
-- table or source-faithful visual asset.
--
-- This is intentionally fail-closed: affected approved leaves are moved to
-- needs_review and receive an unresolved validation finding. No question text is
-- guessed or rewritten here; repair must come from the original source PDF.

DO $$
DECLARE
  v_total integer;
  v_downgraded integer;
BEGIN
  CREATE TEMP TABLE _source_structure_missing(
    question_id uuid PRIMARY KEY,
    display_ref text NOT NULL,
    required_kind text NOT NULL,
    cue text NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _source_structure_missing(question_id,display_ref,required_kind,cue)
  WITH RECURSIVE eligible AS (
    SELECT
      q.id,q.parent_id,q.display_ref,
      regexp_replace(lower(coalesce(q.stem_md,'') || ' ' || coalesce(q.context_md,'')),'[[:space:]]+',' ','g') AS source_text
    FROM questions q
    JOIN source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
    WHERE q.marks IS NOT NULL
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
      END AS cue
    FROM eligible e
  ), chain AS (
    SELECT r.id leaf_id,r.id node_id,r.parent_id
    FROM required r WHERE r.cue IS NOT NULL
    UNION ALL
    SELECT c.leaf_id,p.id,p.parent_id
    FROM chain c
    JOIN questions p ON p.id=c.parent_id
  )
  SELECT r.id,r.display_ref,
    CASE WHEN r.cue='matching_layout' THEN 'layout' ELSE 'table' END,
    r.cue
  FROM required r
  WHERE r.cue IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM chain c
      JOIN question_assets qa ON qa.question_id=c.node_id
      WHERE c.leaf_id=r.id
        AND (
          (qa.kind='table' AND nullif(trim(coalesce(qa.content_md,'')),'') IS NOT NULL)
          OR (
            qa.kind IN ('diagram','image')
            AND (
              nullif(trim(coalesce(qa.content_md,'')),'') IS NOT NULL
              OR nullif(trim(coalesce(qa.storage_path,'')),'') IS NOT NULL
              OR nullif(trim(coalesce(qa.svg_markup,'')),'') IS NOT NULL
            )
          )
        )
    );

  SELECT count(*) INTO v_total FROM _source_structure_missing;
  SELECT count(*) INTO v_downgraded
  FROM _source_structure_missing m
  JOIN questions q ON q.id=m.question_id
  WHERE q.status='approved';

  INSERT INTO validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT
    'source_structure_required_but_missing_' || m.required_kind,
    'error',
    'questions',
    m.question_id,
    CASE m.required_kind
      WHEN 'table' THEN 'The question requires a printed table/tick-grid structure, but no structured table or source-faithful visual asset exists on the question or its ancestor context.'
      ELSE 'The question requires a printed matching/layout structure, but no structured table or source-faithful visual asset exists on the question or its ancestor context.'
    END,
    jsonb_build_object('displayRef',m.display_ref,'requiredKind',m.required_kind,'cue',m.cue,'audit','source-structure-fidelity-0109')
  FROM _source_structure_missing m
  WHERE NOT EXISTS (
    SELECT 1 FROM validation_findings vf
    WHERE vf.ref_table='questions'
      AND vf.ref_id=m.question_id
      AND vf.rule_code='source_structure_required_but_missing_' || m.required_kind
      AND vf.resolved_at IS NULL
  );

  UPDATE questions q
  SET status=CASE WHEN q.status='approved' THEN 'needs_review'::review_status ELSE q.status END,
      notes=CASE
        WHEN coalesce(q.notes,'') LIKE '%source-structure-fidelity:%' THEN q.notes
        ELSE concat_ws(E'\n',nullif(q.notes,''),'source-structure-fidelity: original QP table/layout asset must be restored and verified before approval.')
      END,
      updated_at=now()
  FROM _source_structure_missing m
  WHERE q.id=m.question_id;

  RAISE NOTICE '0109 source structure fidelity: % unresolved QP leaves, % moved from approved to needs_review',v_total,v_downgraded;
END $$;

-- Read-only, service-role-only repair manifest. A repair runner can use this to
-- download exactly the source papers that still contain unresolved structure
-- findings without exposing source URLs to normal application roles.
CREATE OR REPLACE FUNCTION public.source_structure_repair_bootstrap_v1()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT jsonb_build_object(
    'version','source-structure-repair-v1',
    'questionCount',count(distinct q.id),
    'paperCount',count(distinct sp.id),
    'sources',coalesce(jsonb_agg(src ORDER BY (src->>'syllabusCode'),(src->>'year')::integer,src->>'series',(src->>'component')::integer,(src->>'variant')::integer),'[]'::jsonb)
  )
  FROM (
    SELECT jsonb_build_object(
      'sourcePaperId',sp.id,
      'sourceUrl',sp.source_url,
      'sourceSha256',sp.sha256,
      'syllabusCode',sy.code,
      'component',c.number,
      'variant',sp.variant,
      'series',sp.series,
      'year',sp.year,
      'leaves',jsonb_agg(
        jsonb_build_object(
          'questionId',q.id,
          'path',q.path,
          'displayRef',q.display_ref,
          'ruleCode',vf.rule_code,
          'details',vf.details
        ) ORDER BY q.sort_order,q.id
      )
    ) src
    FROM validation_findings vf
    JOIN questions q ON vf.ref_table='questions' AND vf.ref_id=q.id
    JOIN source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
    JOIN syllabi sy ON sy.id=sp.syllabus_id
    JOIN components c ON c.id=sp.component_id
    WHERE vf.resolved_at IS NULL
      AND vf.rule_code IN ('source_structure_required_but_missing_table','source_structure_required_but_missing_layout')
      AND sp.source_url IS NOT NULL
      AND nullif(trim(coalesce(sp.sha256,'')),'') IS NOT NULL
    GROUP BY sp.id,sp.source_url,sp.sha256,sy.code,c.number,sp.variant,sp.series,sp.year
  ) grouped
  CROSS JOIN LATERAL (
    SELECT q2.id
    FROM questions q2
    JOIN validation_findings vf2 ON vf2.ref_table='questions' AND vf2.ref_id=q2.id
    WHERE vf2.resolved_at IS NULL
      AND vf2.rule_code IN ('source_structure_required_but_missing_table','source_structure_required_but_missing_layout')
    LIMIT 1
  ) q_dummy
  CROSS JOIN LATERAL (SELECT q_dummy.id AS id) q
  CROSS JOIN LATERAL (SELECT NULL::uuid AS id) sp_dummy
  CROSS JOIN LATERAL (SELECT sp_dummy.id AS id) sp;
$function$;

REVOKE ALL ON FUNCTION public.source_structure_repair_bootstrap_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.source_structure_repair_bootstrap_v1() TO service_role;
