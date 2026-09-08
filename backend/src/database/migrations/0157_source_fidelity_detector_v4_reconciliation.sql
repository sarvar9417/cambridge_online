-- Canonical source-fidelity detector v4 reconciliation.
--
-- v3 deliberately failed closed, but its table regex treated the singular token
-- "table" as a prefix of "tables". Relational schema prose such as
-- "the database has the following tables: CUSTOMER(...), ORDER(...)" was
-- therefore misclassified as a printed table/grid for every descendant leaf.
-- v4 keeps the same canonical-adjacency audit identity so every existing repair
-- guard remains active, reconciles only that plural-schema false positive, and
-- adds two source-present structures that v3 under-detected:
--   * matching layouts phrased as "draw one line from each ..."
--   * tables phrased as "part of ... table ... is shown" or represented by the
--     explicit flattened header "Band Amount Points".
-- Existing SHA/source/review gates remain authoritative.

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v4(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_base jsonb;
  v_plural_resolved integer := 0;
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

  -- Preserve all v2/v3 rules first. Reconciliation below is intentionally
  -- narrower than the base detector and never suppresses unrelated findings.
  v_base := public.flag_source_fidelity_requirements_v3(p_syllabus_code,p_year);

  -- v3 used a prefix match for "table". Resolve only canonical table findings
  -- whose recorded source cue explicitly says "following tables" (plural),
  -- which in these Cambridge papers is relational-schema notation rather than
  -- a printed row/column grid. The exact finding remains in history.
  UPDATE public.validation_findings vf
  SET resolved_at=now(),
      resolution='Detector v4 reconciled plural relational-schema cue; "tables" is not a singular printed table/grid requirement.'
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  WHERE vf.ref_table='questions'
    AND vf.ref_id=q.id
    AND vf.resolved_at IS NULL
    AND vf.rule_code='source_structure_required_but_missing_table'
    AND vf.details->>'audit'='source-fidelity-detector-v3-canonical-adjacency'
    AND sy.code=p_syllabus_code
    AND sp.year=p_year
    AND lower(coalesce(vf.details->>'cue','')) ~ 'following[[:space:]]+tables([[:space:][:punct:]]|$)';
  GET DIAGNOSTICS v_plural_resolved = ROW_COUNT;

  -- Real source-present tables missed by v3. A valid source table/verified image
  -- must follow the announcing text block in canonical content.
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
                  OR coalesce(qa.content_md,'') ~* '^\\s*<svg(?:\\s|>)'
                  OR coalesce(qa.svg_markup,'') ~* '^\\s*<svg(?:\\s|>)'
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
      'displayRef',g.display_ref,
      'requiredKind','table',
      'cue',left(g.cue_text,240),
      'cueOrdinal',g.cue_ordinal,
      'audit','source-fidelity-detector-v3-canonical-adjacency',
      'detectorVersion','v4',
      'syllabusCode',p_syllabus_code,
      'year',p_year
    )
  FROM gaps g
  WHERE NOT EXISTS (
    SELECT 1 FROM public.validation_findings vf
    WHERE vf.ref_table='questions' AND vf.ref_id=g.id
      AND vf.rule_code='source_structure_required_but_missing_table'
      AND vf.resolved_at IS NULL
  );
  GET DIAGNOSTICS v_table_added = ROW_COUNT;

  -- Cambridge sometimes describes a matching task as "draw one line from each
  -- Normal Form to the most appropriate definition" without the words match or
  -- connect. That is source geometry and must not remain flattened prose.
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
              OR coalesce(qa.content_md,'') ~* '^\\s*<svg(?:\\s|>)'
              OR coalesce(qa.svg_markup,'') ~* '^\\s*<svg(?:\\s|>)'
            )
          )
        )
    )
  )
  INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT 'source_structure_required_but_missing_layout','error','questions',g.id,
    'Canonical source text introduces a matching/connect layout, but no faithful structured/source block follows the source cue.',
    jsonb_build_object(
      'displayRef',g.display_ref,
      'requiredKind','layout',
      'cue',left(g.cue_text,240),
      'cueOrdinal',g.cue_ordinal,
      'audit','source-fidelity-detector-v3-canonical-adjacency',
      'detectorVersion','v4',
      'syllabusCode',p_syllabus_code,
      'year',p_year
    )
  FROM gaps g
  WHERE NOT EXISTS (
    SELECT 1 FROM public.validation_findings vf
    WHERE vf.ref_table='questions' AND vf.ref_id=g.id
      AND vf.rule_code='source_structure_required_but_missing_layout'
      AND vf.resolved_at IS NULL
  );
  GET DIAGNOSTICS v_layout_added = ROW_COUNT;

  -- New true gaps remain fail-closed.
  UPDATE public.questions q
  SET status='needs_review'::review_status,updated_at=now()
  WHERE q.status='approved'::review_status
    AND EXISTS (
      SELECT 1 FROM public.validation_findings vf
      WHERE vf.ref_table='questions' AND vf.ref_id=q.id
        AND vf.resolved_at IS NULL AND vf.severity='error'
        AND vf.details->>'audit'='source-fidelity-detector-v3-canonical-adjacency'
    );

  -- Only restore questions that carry the historical detector-demotion marker
  -- and now have no unresolved error at all. Pre-existing manual review states
  -- remain untouched.
  WITH restored AS (
    UPDATE public.questions q
    SET status='approved'::review_status,
        notes=concat_ws(
          E'\n',
          nullif(replace(coalesce(q.notes,''),'source-fidelity-detector-v2: demoted_from_approved',''),''),
          'source-fidelity-detector-v4: approval restored after plural-schema false-positive reconciliation.'
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
    'version','source-fidelity-detector-v4',
    'syllabusCode',p_syllabus_code,
    'year',p_year,
    'baseV3',v_base,
    'pluralSchemaTableFindingsResolved',v_plural_resolved,
    'canonicalTableGapsAdded',v_table_added,
    'canonicalLayoutGapsAdded',v_layout_added,
    'approvalRestored',v_restored
  );
END
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v4(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v4(text,int)
  TO service_role;

-- Keep the established corpus-runner action stable while upgrading the detector.
CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v1(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT public.flag_source_fidelity_requirements_v4(p_syllabus_code,p_year)
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  TO service_role;
