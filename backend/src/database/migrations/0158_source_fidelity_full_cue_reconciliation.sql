-- Source-fidelity detector v5: reconcile plural relational-schema false positives
-- from the full canonical cue block rather than the 240-character finding excerpt.
--
-- Detector v4 correctly identified the plural `following tables` false-positive
-- class, but historical finding.details.cue is intentionally truncated to 240
-- characters. In a small number of inherited database-context questions the
-- discriminating phrase occurs after that boundary. v5 keeps v4's fail-closed
-- detector and then performs the same reconciliation against the exact
-- content_json block identified by cueOrdinal. After that reconciliation it
-- re-evaluates the explicit real-table and matching-layout patterns so a true
-- structure later in the same question is not masked by the stale false positive.

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v5(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_base jsonb;
  v_full_cue_resolved integer := 0;
  v_table_added integer := 0;
  v_layout_added integer := 0;
  v_restored integer := 0;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code;
  END IF;
  IF p_year<2015 OR p_year>2035 THEN
    RAISE EXCEPTION 'invalid_year:%',p_year;
  END IF;

  v_base := public.flag_source_fidelity_requirements_v4(p_syllabus_code,p_year);

  -- Resolve only an existing canonical table finding whose own cueOrdinal points
  -- at a canonical text block that explicitly describes plural relational
  -- schema tables. This does not resolve singular printed-table wording.
  WITH candidates AS (
    SELECT vf.id finding_id,q.id question_id,
      lower(regexp_replace(coalesce(b.block->>'text',''),'[[:space:]]+',' ','g')) full_cue
    FROM public.validation_findings vf
    JOIN public.questions q
      ON vf.ref_table='questions' AND vf.ref_id=q.id
    JOIN public.source_papers sp
      ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    CROSS JOIN LATERAL jsonb_array_elements(q.content_json->'blocks')
      WITH ORDINALITY AS b(block,ordinality)
    WHERE vf.resolved_at IS NULL
      AND vf.rule_code='source_structure_required_but_missing_table'
      AND vf.details->>'audit'='source-fidelity-detector-v3-canonical-adjacency'
      AND sy.code=p_syllabus_code
      AND sp.year=p_year
      AND q.content_json IS NOT NULL
      AND b.ordinality=(vf.details->>'cueOrdinal')::bigint
      AND b.block->>'type'='text'
  ), plural_schema AS (
    SELECT finding_id
    FROM candidates
    WHERE full_cue ~ (
         '(has|have|contains?|with)[[:space:]]+(the[[:space:]]+)?following[[:space:]]+tables([[:space:][:punct:]]|$)'
      || '|database.{0,180}following[[:space:]]+tables([[:space:][:punct:]]|$)'
    )
  )
  UPDATE public.validation_findings vf
  SET resolved_at=now(),
      resolution='Detector v5 reconciled plural relational-schema cue from full canonical content block; no singular printed table/grid is implied by this cue.'
  FROM plural_schema p
  WHERE vf.id=p.finding_id;
  GET DIAGNOSTICS v_full_cue_resolved = ROW_COUNT;

  -- Re-evaluate real printed tables after the stale plural-schema finding has
  -- been removed. This is necessary when an inherited database-schema block and
  -- a later real source table occur in the same leaf question.
  WITH eligible AS (
    SELECT q.id,q.display_ref,q.content_json
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE sy.code=p_syllabus_code AND sp.year=p_year
      AND sp.variant BETWEEN 1 AND 3 AND sp.source_url IS NOT NULL
      AND q.marks IS NOT NULL AND q.status IN ('approved','needs_review')
      AND q.content_version=1 AND q.content_json IS NOT NULL
  ), cue_blocks AS (
    SELECT e.id,e.display_ref,e.content_json,b.ordinality cue_ordinal,
      lower(regexp_replace(coalesce(b.block->>'text',''),'[[:space:]]+',' ','g')) cue_text
    FROM eligible e
    CROSS JOIN LATERAL jsonb_array_elements(e.content_json->'blocks')
      WITH ORDINALITY AS b(block,ordinality)
    WHERE b.block->>'type'='text'
  ), gaps AS (
    SELECT c.id,c.display_ref,c.content_json,c.cue_ordinal,c.cue_text
    FROM cue_blocks c
    WHERE c.cue_text ~ (
         'part[[:space:]]+of.{0,140}table.{0,140}(is[[:space:]]+)?shown'
      || '|band[[:space:]]+amount[[:space:]]+points([[:space:][:punct:]]|$)'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(c.content_json->'blocks') WITH ORDINALITY AS n(block,ordinality)
      LEFT JOIN public.question_assets qa ON qa.id::text=n.block->>'assetId'
      WHERE n.ordinality=c.cue_ordinal+1
        AND (
          n.block->>'type'='table'
          OR (
            n.block->>'type'='asset' AND (
              (qa.kind='table' AND nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL)
              OR (
                qa.kind IN ('diagram','image') AND (
                  nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
                  OR coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)'
                  OR coalesce(qa.svg_markup,'') ~* '^\s*<svg(?:\s|>)'
                )
              )
            )
          )
        )
    )
  )
  INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT 'source_structure_required_but_missing_table','error','questions',g.id,
    'Canonical source text contains a printed table/grid, but no structured table or verified source visual follows the source cue.',
    jsonb_build_object(
      'displayRef',g.display_ref,'requiredKind','table','cue',left(g.cue_text,240),
      'cueOrdinal',g.cue_ordinal,'audit','source-fidelity-detector-v3-canonical-adjacency',
      'detectorVersion','v5','syllabusCode',p_syllabus_code,'year',p_year
    )
  FROM gaps g
  WHERE NOT EXISTS (
    SELECT 1 FROM public.validation_findings vf
    WHERE vf.ref_table='questions' AND vf.ref_id=g.id
      AND vf.rule_code='source_structure_required_but_missing_table'
      AND vf.resolved_at IS NULL
  );
  GET DIAGNOSTICS v_table_added = ROW_COUNT;

  -- Re-evaluate source matching layouts for the same reason.
  WITH eligible AS (
    SELECT q.id,q.display_ref,q.content_json
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE sy.code=p_syllabus_code AND sp.year=p_year
      AND sp.variant BETWEEN 1 AND 3 AND sp.source_url IS NOT NULL
      AND q.marks IS NOT NULL AND q.status IN ('approved','needs_review')
      AND q.content_version=1 AND q.content_json IS NOT NULL
  ), cue_blocks AS (
    SELECT e.id,e.display_ref,e.content_json,b.ordinality cue_ordinal,
      lower(regexp_replace(coalesce(b.block->>'text',''),'[[:space:]]+',' ','g')) cue_text
    FROM eligible e
    CROSS JOIN LATERAL jsonb_array_elements(e.content_json->'blocks')
      WITH ORDINALITY AS b(block,ordinality)
    WHERE b.block->>'type'='text'
  ), gaps AS (
    SELECT c.id,c.display_ref,c.content_json,c.cue_ordinal,c.cue_text
    FROM cue_blocks c
    WHERE c.cue_text ~ 'draw[[:space:]]+one[[:space:]]+line[[:space:]]+from[[:space:]]+each.{0,220}(to|with)'
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(c.content_json->'blocks') WITH ORDINALITY AS n(block,ordinality)
      LEFT JOIN public.question_assets qa ON qa.id::text=n.block->>'assetId'
      WHERE n.ordinality=c.cue_ordinal+1
        AND (
          n.block->>'type'='matching'
          OR (
            n.block->>'type'='asset' AND qa.kind IN ('diagram','image') AND (
              nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
              OR coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)'
              OR coalesce(qa.svg_markup,'') ~* '^\s*<svg(?:\s|>)'
            )
          )
        )
    )
  )
  INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT 'source_structure_required_but_missing_layout','error','questions',g.id,
    'Canonical source text introduces a matching/connect layout, but no faithful structured/source block follows the source cue.',
    jsonb_build_object(
      'displayRef',g.display_ref,'requiredKind','layout','cue',left(g.cue_text,240),
      'cueOrdinal',g.cue_ordinal,'audit','source-fidelity-detector-v3-canonical-adjacency',
      'detectorVersion','v5','syllabusCode',p_syllabus_code,'year',p_year
    )
  FROM gaps g
  WHERE NOT EXISTS (
    SELECT 1 FROM public.validation_findings vf
    WHERE vf.ref_table='questions' AND vf.ref_id=g.id
      AND vf.rule_code='source_structure_required_but_missing_layout'
      AND vf.resolved_at IS NULL
  );
  GET DIAGNOSTICS v_layout_added = ROW_COUNT;

  UPDATE public.questions q
  SET status='needs_review'::review_status,updated_at=now()
  WHERE q.status='approved'::review_status
    AND EXISTS (
      SELECT 1 FROM public.validation_findings vf
      WHERE vf.ref_table='questions' AND vf.ref_id=q.id
        AND vf.resolved_at IS NULL AND vf.severity='error'
        AND vf.details->>'audit'='source-fidelity-detector-v3-canonical-adjacency'
    );

  WITH restored AS (
    UPDATE public.questions q
    SET status='approved'::review_status,
        notes=concat_ws(
          E'\n',
          nullif(replace(coalesce(q.notes,''),'source-fidelity-detector-v2: demoted_from_approved',''),''),
          'source-fidelity-detector-v5: approval restored after full-cue plural-schema reconciliation.'
        ),
        updated_at=now()
    WHERE q.status='needs_review'::review_status
      AND coalesce(q.notes,'') LIKE '%source-fidelity-detector-v2: demoted_from_approved%'
      AND NOT EXISTS (
        SELECT 1 FROM public.validation_findings vf
        WHERE vf.ref_table='questions' AND vf.ref_id=q.id
          AND vf.resolved_at IS NULL AND vf.severity='error'
      )
    RETURNING q.id
  )
  SELECT count(*) INTO v_restored FROM restored;

  RETURN jsonb_build_object(
    'version','source-fidelity-detector-v5',
    'syllabusCode',p_syllabus_code,'year',p_year,'baseV4',v_base,
    'fullCuePluralSchemaResolved',v_full_cue_resolved,
    'canonicalTableGapsAdded',v_table_added,
    'canonicalLayoutGapsAdded',v_layout_added,
    'approvalRestored',v_restored
  );
END
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v5(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v5(text,int)
  TO service_role;

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v1(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT public.flag_source_fidelity_requirements_v5(p_syllabus_code,p_year)
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  TO service_role;
