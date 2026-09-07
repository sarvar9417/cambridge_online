-- Canonical source-fidelity detector v3 and ordered repaired-asset sync.
--
-- Why v3 exists:
-- Historical 9618 questions can contain source-present visual wording inside the
-- canonical content_json even when legacy stem_md/context_md lost that wording.
-- v2 inspected mainly legacy text and considered any image asset sufficient.
-- That allowed a false-complete case such as 9618/12/O/N/21 Q5(a): the table
-- crop existed, but the preceding logo did not.
--
-- v3 preserves the v2 detector and adds a block-order audit.  When a canonical
-- text block explicitly introduces a source-present visual/table/layout, the
-- corresponding structured/source block must immediately follow it.  This is a
-- deliberately fail-closed rule: ambiguous cases become needs_review rather
-- than being silently accepted.

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v3(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_base jsonb;
  v_visual integer := 0;
  v_table integer := 0;
  v_layout integer := 0;
  v_distinct integer := 0;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code;
  END IF;
  IF p_year<2015 OR p_year>2035 THEN
    RAISE EXCEPTION 'invalid_year:%',p_year;
  END IF;

  -- Keep every v2 source rule. v3 only adds canonical block-order evidence.
  v_base := public.flag_source_fidelity_requirements_v2(p_syllabus_code,p_year);

  CREATE TEMP TABLE _canonical_fidelity_gap(
    question_id uuid NOT NULL,
    display_ref text NOT NULL,
    rule_code text NOT NULL,
    required_kind text NOT NULL,
    cue text NOT NULL,
    cue_ordinal bigint NOT NULL,
    PRIMARY KEY(question_id,rule_code)
  ) ON COMMIT DROP;

  -- Source-present visuals.  Do not flag bare creation instructions such as
  -- "draw a diagram"; require wording that says a visual is already printed.
  INSERT INTO _canonical_fidelity_gap(
    question_id,display_ref,rule_code,required_kind,cue,cue_ordinal
  )
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
  )
  SELECT c.id,c.display_ref,'source_visual_required_but_missing','visual',
    left(c.cue_text,240),c.cue_ordinal
  FROM cue_blocks c
  WHERE c.cue_text ~ (
       'following[[:space:]]+((vector|logic|state[- ]transition|class|e-?r|entity[- ]relationship)[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape|screenshot|screen[[:space:]]+image)'
    || '|(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape|screenshot|screen[[:space:]]+image)[[:space:]]+(is[[:space:]]+|are[[:space:]]+)?(shown|illustrated|given|provided|below|above)'
    || '|(shown|illustrated|given|provided)[[:space:]]+(below|above|in[[:space:]]+the[[:space:]]+question[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape|screenshot)'
    || '|(study|examine|refer[[:space:]]+to|using)[[:space:]]+(the[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)'
    || '|(for|using|from)[[:space:]]+this[[:space:]]+logo'
    || '|example[[:space:]]+from[[:space:]]+(the|this)[[:space:]]+logo'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(c.content_json->'blocks') WITH ORDINALITY AS n(block,ordinality)
    LEFT JOIN public.question_assets qa
      ON qa.id::text=n.block->>'assetId'
    WHERE n.ordinality=c.cue_ordinal+1
      AND n.block->>'type'='asset'
      AND qa.kind IN ('diagram','image')
      AND (
        nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
        OR coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)'
        OR coalesce(qa.svg_markup,'') ~* '^\s*<svg(?:\s|>)'
      )
  )
  ON CONFLICT(question_id,rule_code) DO NOTHING;

  -- Canonical source tables/grids.  A semantic table or verified source image
  -- must immediately follow the instruction/intro block that announces it.
  INSERT INTO _canonical_fidelity_gap(
    question_id,display_ref,rule_code,required_kind,cue,cue_ordinal
  )
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
  )
  SELECT c.id,c.display_ref,'source_structure_required_but_missing_table','table',
    left(c.cue_text,240),c.cue_ordinal
  FROM cue_blocks c
  WHERE c.cue_text ~ (
       'complete.{0,100}(truth[[:space:]]+|trace[[:space:]]+)?table'
    || '|fill[[:space:]]+in.{0,100}(truth[[:space:]]+|trace[[:space:]]+)?table'
    || '|(following|given|provided)[[:space:]]+(truth[[:space:]]+|trace[[:space:]]+)?table'
    || '|table[[:space:]]+(below|above|shows|showing|contains|lists|represents)'
    || '|tick.{0,220}(row|column|box|table)'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(c.content_json->'blocks') WITH ORDINALITY AS n(block,ordinality)
    LEFT JOIN public.question_assets qa ON qa.id::text=n.block->>'assetId'
    WHERE n.ordinality=c.cue_ordinal+1
      AND (
        n.block->>'type'='table'
        OR (
          n.block->>'type'='asset'
          AND (
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
  ON CONFLICT(question_id,rule_code) DO NOTHING;

  -- Matching/connect layouts are geometry, not prose.
  INSERT INTO _canonical_fidelity_gap(
    question_id,display_ref,rule_code,required_kind,cue,cue_ordinal
  )
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
  )
  SELECT c.id,c.display_ref,'source_structure_required_but_missing_layout','layout',
    left(c.cue_text,240),c.cue_ordinal
  FROM cue_blocks c
  WHERE c.cue_text ~ (
       'match[[:space:]]+each'
    || '|draw[[:space:]]+(a[[:space:]]+)?line.{0,200}(match|connect)'
    || '|draw[[:space:]]+lines?.{0,200}(match|connect)'
    || '|join[[:space:]]+each.{0,200}(correct|matching)'
    || '|connect[[:space:]]+each'
  )
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
  ON CONFLICT(question_id,rule_code) DO NOTHING;

  INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT g.rule_code,'error','questions',g.question_id,
    CASE g.required_kind
      WHEN 'visual' THEN 'Canonical source text introduces a printed visual, but no verified visual block follows the source cue.'
      WHEN 'table' THEN 'Canonical source text introduces a printed table/grid, but no structured table or verified source visual follows the source cue.'
      ELSE 'Canonical source text introduces a matching/layout structure, but no faithful structured/source block follows the source cue.'
    END,
    jsonb_build_object(
      'displayRef',g.display_ref,
      'requiredKind',g.required_kind,
      'cue',g.cue,
      'cueOrdinal',g.cue_ordinal,
      'audit','source-fidelity-detector-v3-canonical-adjacency',
      'syllabusCode',p_syllabus_code,
      'year',p_year
    )
  FROM _canonical_fidelity_gap g
  WHERE NOT EXISTS (
    SELECT 1 FROM public.validation_findings vf
    WHERE vf.ref_table='questions' AND vf.ref_id=g.question_id
      AND vf.rule_code=g.rule_code AND vf.resolved_at IS NULL
  );

  UPDATE public.questions q
  SET status='needs_review'::review_status,updated_at=now()
  WHERE q.status='approved'::review_status
    AND EXISTS(SELECT 1 FROM _canonical_fidelity_gap g WHERE g.question_id=q.id);

  SELECT
    count(*) FILTER(WHERE required_kind='visual'),
    count(*) FILTER(WHERE required_kind='table'),
    count(*) FILTER(WHERE required_kind='layout'),
    count(DISTINCT question_id)
  INTO v_visual,v_table,v_layout,v_distinct
  FROM _canonical_fidelity_gap;

  RETURN jsonb_build_object(
    'version','source-fidelity-detector-v3',
    'syllabusCode',p_syllabus_code,
    'year',p_year,
    'baseV2',v_base,
    'canonicalVisualGaps',coalesce(v_visual,0),
    'canonicalTableGaps',coalesce(v_table,0),
    'canonicalLayoutGaps',coalesce(v_layout,0),
    'canonicalDistinctQuestions',coalesce(v_distinct,0)
  );
END
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v3(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v3(text,int)
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
  SELECT public.flag_source_fidelity_requirements_v3(p_syllabus_code,p_year)
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  TO service_role;

-- Ordered source-asset synchronisation.
--
-- A newly recovered preceding visual must appear directly after the canonical
-- text block that introduced it.  Generic repaired visuals keep the v1 append
-- behaviour.  This makes the correction visible consistently in Question Bank,
-- Lesson Studio, student work and exports because they all consume content_json.
CREATE OR REPLACE FUNCTION public.sync_repaired_source_assets_v2(
  p_syllabus_code text,
  p_year_from int,
  p_year_to int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_row record;
  v_content jsonb;
  v_asset_block jsonb;
  v_kind text;
  v_label text;
  v_preceding boolean;
  v_insert_after bigint;
  v_blocks jsonb;
  v_synced integer := 0;
  v_questions uuid[] := ARRAY[]::uuid[];
  v_remaining integer;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code;
  END IF;
  IF p_year_from<2015 OR p_year_to<p_year_from OR p_year_to>2035 THEN
    RAISE EXCEPTION 'invalid_year_window:%-%',p_year_from,p_year_to;
  END IF;

  FOR v_row IN
    SELECT
      q.id question_id,q.source_paper_id,q.content_json,q.stem_md,q.context_md,
      sp.sha256,sp.year,qa.id asset_id,qa.kind::text asset_kind,
      qa.alt_text,qa.source_page,qa.sort_order
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    JOIN public.question_assets qa ON qa.question_id=q.id
    WHERE sy.code=p_syllabus_code
      AND sp.year BETWEEN p_year_from AND p_year_to
      AND sp.variant BETWEEN 1 AND 3
      AND sp.source_url IS NOT NULL
      AND q.marks IS NOT NULL
      AND q.content_version=1 AND q.content_json IS NOT NULL
      AND qa.kind IN ('diagram','image')
      AND qa.source_page IS NOT NULL
      AND (
        nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
        OR coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)'
        OR coalesce(qa.svg_markup,'') ~* '^\s*<svg(?:\s|>)'
      )
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(q.content_json->'blocks') b
        WHERE b->>'type'='asset' AND b->>'assetId'=qa.id::text
      )
    ORDER BY sp.year,q.source_paper_id,q.sort_order,qa.sort_order,qa.id
  LOOP
    IF v_row.content_json->'source'->>'paperId'<>v_row.source_paper_id::text
       OR lower(coalesce(v_row.content_json->'source'->>'sha256',''))<>lower(coalesce(v_row.sha256,'')) THEN
      RAISE EXCEPTION 'structured_source_provenance_mismatch:%',v_row.question_id;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.validation_findings vf
      WHERE vf.ref_table='questions' AND vf.ref_id=v_row.question_id
        AND vf.resolved_at IS NULL AND vf.severity='error'
        AND vf.rule_code IN (
          'source_structure_required_but_missing_table',
          'source_structure_required_but_missing_layout',
          'source_visual_required_but_missing'
        )
    ) THEN
      RAISE EXCEPTION 'cannot_sync_unresolved_source_fidelity:%',v_row.question_id;
    END IF;

    SELECT q.content_json INTO v_content
    FROM public.questions q WHERE q.id=v_row.question_id FOR UPDATE;

    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_content->'blocks') b
      WHERE b->>'type'='asset' AND b->>'assetId'=v_row.asset_id::text
    ) THEN
      CONTINUE;
    END IF;

    v_label:=lower(
      coalesce(v_row.alt_text,'')||' '||
      coalesce(v_row.context_md,'')||' '||coalesce(v_row.stem_md,'')
    );
    v_kind:=CASE
      WHEN v_label ~ 'logic[[:space:]]+(circuit|gate)' THEN 'logic_circuit'
      WHEN v_label ~ 'flowchart' THEN 'flowchart'
      WHEN v_label ~ '(diagram|structure[[:space:]]+chart|syntax[[:space:]]+diagram|graph|tree)' THEN 'diagram'
      ELSE 'image'
    END;

    v_asset_block:=jsonb_build_object(
      'type','asset',
      'kind',v_kind,
      'assetId',v_row.asset_id,
      'altText',coalesce(v_row.alt_text,'Original Cambridge source visual'),
      'source',jsonb_build_object('page',v_row.source_page)
    );

    v_preceding:=lower(coalesce(v_row.alt_text,'')) LIKE 'preceding cambridge source visual%';
    v_insert_after:=NULL;

    IF v_preceding THEN
      SELECT min(b.ordinality) INTO v_insert_after
      FROM jsonb_array_elements(v_content->'blocks') WITH ORDINALITY AS b(block,ordinality)
      WHERE b.block->>'type'='text'
        AND lower(regexp_replace(coalesce(b.block->>'text',''),'[[:space:]]+',' ','g')) ~ (
             'following[[:space:]]+((vector|logic|state[- ]transition|class|e-?r|entity[- ]relationship)[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape|screenshot|screen[[:space:]]+image)'
          || '|(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape|screenshot|screen[[:space:]]+image)[[:space:]]+(is[[:space:]]+|are[[:space:]]+)?(shown|illustrated|given|provided|below|above)'
          || '|(study|examine|refer[[:space:]]+to|using)[[:space:]]+(the[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)'
        );
    END IF;

    IF v_insert_after IS NOT NULL THEN
      SELECT jsonb_agg(x.block ORDER BY x.sort_key) INTO v_blocks
      FROM (
        SELECT b.block,(b.ordinality*2)::numeric sort_key
        FROM jsonb_array_elements(v_content->'blocks') WITH ORDINALITY AS b(block,ordinality)
        UNION ALL
        SELECT v_asset_block,(v_insert_after*2+1)::numeric
      ) x;
      v_content:=jsonb_set(v_content,'{blocks}',v_blocks,false);
    ELSE
      v_content:=jsonb_set(
        v_content,'{blocks}',
        (v_content->'blocks')||jsonb_build_array(v_asset_block),
        false
      );
    END IF;

    PERFORM public.set_question_structured_content_v1(
      v_row.question_id,v_row.source_paper_id,lower(v_row.sha256),v_content
    );

    INSERT INTO public.structured_content_backfill_audits(
      question_id,source_paper_id,source_sha256,source_page,parser_version,evidence
    ) VALUES (
      v_row.question_id,v_row.source_paper_id,lower(v_row.sha256),v_row.source_page,
      'source-asset-sync-v2',
      jsonb_build_object(
        'assetId',v_row.asset_id,
        'assetKind',v_row.asset_kind,
        'structuredKind',v_kind,
        'sourceAuthority','verified_question_asset_source_page_sha',
        'sourcePlacement',CASE WHEN v_insert_after IS NOT NULL THEN 'after_source_visual_cue' ELSE 'append' END
      )
    )
    ON CONFLICT(question_id,source_sha256,parser_version) DO UPDATE
      SET source_page=excluded.source_page,
          evidence=excluded.evidence,
          created_at=now();

    v_synced:=v_synced+1;
    IF NOT (v_row.question_id=ANY(v_questions)) THEN
      v_questions:=array_append(v_questions,v_row.question_id);
    END IF;
  END LOOP;

  SELECT count(*) INTO v_remaining
  FROM public.questions q
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  JOIN public.question_assets qa ON qa.question_id=q.id
  WHERE sy.code=p_syllabus_code
    AND sp.year BETWEEN p_year_from AND p_year_to
    AND sp.variant BETWEEN 1 AND 3 AND sp.source_url IS NOT NULL
    AND q.marks IS NOT NULL AND q.content_version=1 AND q.content_json IS NOT NULL
    AND qa.kind IN ('diagram','image') AND qa.source_page IS NOT NULL
    AND (
      nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
      OR coalesce(qa.content_md,'') ~* '^\s*<svg(?:\s|>)'
      OR coalesce(qa.svg_markup,'') ~* '^\s*<svg(?:\s|>)'
    )
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(q.content_json->'blocks') b
      WHERE b->>'type'='asset' AND b->>'assetId'=qa.id::text
    );

  IF v_remaining<>0 THEN
    RAISE EXCEPTION 'structured_source_asset_sync_incomplete:%',v_remaining;
  END IF;

  RETURN jsonb_build_object(
    'version','source-asset-sync-v2',
    'syllabusCode',p_syllabus_code,
    'yearFrom',p_year_from,'yearTo',p_year_to,
    'assetsSynced',v_synced,
    'questionsUpdated',coalesce(cardinality(v_questions),0),
    'remainingUnreferencedVisualAssets',v_remaining
  );
END
$function$;

REVOKE ALL ON FUNCTION public.sync_repaired_source_assets_v2(text,int,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_repaired_source_assets_v2(text,int,int)
  TO service_role;

-- Stable runner contract: existing jobs call v1 and transparently receive the
-- ordered v2 behaviour.
CREATE OR REPLACE FUNCTION public.sync_repaired_source_assets_v1(
  p_syllabus_code text,
  p_year_from int,
  p_year_to int
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT public.sync_repaired_source_assets_v2(p_syllabus_code,p_year_from,p_year_to)
$function$;

REVOKE ALL ON FUNCTION public.sync_repaired_source_assets_v1(text,int,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_repaired_source_assets_v1(text,int,int)
  TO service_role;
