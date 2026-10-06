-- Harden learner-facing source-visual fidelity and repair the known shared-circuit case.
--
-- Goals:
--   1) a canonical text block that says a printed visual is present must not be
--      followed only by flattened OCR/text labels;
--   2) source-backed semantic tables remain valid for array/stack/queue style
--      diagrams, so the guard does not force raster/SVG when structure is already
--      faithfully represented;
--   3) 9618/32/M/J/25 Q7(b) reuses the verified Q7(a) circuit asset instead of
--      duplicating the source visual;
--   4) unresolved canonical visual gaps are fail-closed (needs_review) before
--      they can enter Live Challenge.

DO $repair$
DECLARE
  v_question public.questions%ROWTYPE;
  v_source public.source_papers%ROWTYPE;
  v_asset record;
  v_blocks jsonb;
  v_new_blocks jsonb;
  v_cue_ordinal bigint;
BEGIN
  SELECT q.* INTO v_question
  FROM public.questions q
  WHERE q.display_ref='9618/32/M/J/25 Q7(b)'
  ORDER BY q.updated_at DESC,q.id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE '0194 shared-circuit repair skipped: target question not found';
    RETURN;
  END IF;

  SELECT * INTO v_source
  FROM public.source_papers sp
  WHERE sp.id=v_question.source_paper_id AND sp.kind='QP'::paper_kind;

  IF NOT FOUND OR coalesce(v_source.sha256,'') !~ '^[0-9A-Fa-f]{64}$' THEN
    RAISE EXCEPTION '0194 shared-circuit repair requires verified QP source';
  END IF;

  IF v_question.content_version IS DISTINCT FROM 1 OR v_question.content_json IS NULL THEN
    RAISE EXCEPTION '0194 target question has no canonical v1 content';
  END IF;

  IF v_question.content_json->'source'->>'paperId'<>v_source.id::text
     OR lower(coalesce(v_question.content_json->'source'->>'sha256',''))<>lower(v_source.sha256) THEN
    RAISE EXCEPTION '0194 target structured source provenance mismatch';
  END IF;

  SELECT b.ordinality INTO v_cue_ordinal
  FROM jsonb_array_elements(v_question.content_json->'blocks') WITH ORDINALITY b(block,ordinality)
  WHERE b.block->>'type'='text'
    AND lower(regexp_replace(coalesce(b.block->>'text',''),'[[:space:]]+',' ','g'))
        ~ '(^|[[:space:]])the[[:space:]]+diagram[[:space:]]+shows[[:space:]]+a[[:space:]]+logic[[:space:]]+circuit([[:space:][:punct:]]|$)'
  ORDER BY b.ordinality
  LIMIT 1;

  IF v_cue_ordinal IS NULL THEN
    RAISE EXCEPTION '0194 target source visual cue not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_question.content_json->'blocks') b
    WHERE b->>'type'='asset'
      AND b->>'kind'='logic_circuit'
  ) THEN
    SELECT qa.id,qa.alt_text,qa.source_page INTO v_asset
    FROM public.questions owner
    JOIN public.question_assets qa ON qa.question_id=owner.id
    WHERE owner.source_paper_id=v_question.source_paper_id
      AND owner.display_ref='9618/32/M/J/25 Q7(a)'
      AND qa.kind IN ('diagram','image')
      AND qa.source_page=6
      AND coalesce(qa.alt_text,'') ~* 'logic[[:space:]]+circuit'
      AND (
        nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
        OR coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
        OR coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
      )
    ORDER BY qa.sort_order,qa.id
    LIMIT 1;

    IF v_asset.id IS NULL THEN
      RAISE EXCEPTION '0194 verified Q7(a) logic-circuit asset not found';
    END IF;

    SELECT jsonb_agg(x.block ORDER BY x.sort_key) INTO v_new_blocks
    FROM (
      SELECT
        CASE
          WHEN b.ordinality=v_cue_ordinal THEN
            jsonb_set(b.block,'{text}',to_jsonb('The diagram shows a logic circuit.'::text),false)
          ELSE b.block
        END AS block,
        (b.ordinality*2)::numeric AS sort_key
      FROM jsonb_array_elements(v_question.content_json->'blocks') WITH ORDINALITY b(block,ordinality)
      UNION ALL
      SELECT jsonb_build_object(
        'type','asset',
        'kind','logic_circuit',
        'assetId',v_asset.id::text,
        'altText',coalesce(v_asset.alt_text,'Original Cambridge logic circuit'),
        'source',jsonb_build_object('page',v_asset.source_page)
      ),(v_cue_ordinal*2+1)::numeric
    ) x;

    v_blocks:=jsonb_set(v_question.content_json,'{blocks}',v_new_blocks,false);
    PERFORM public.set_question_structured_content_v1(
      v_question.id,v_source.id,lower(v_source.sha256),v_blocks
    );

    INSERT INTO public.structured_content_backfill_audits(
      question_id,source_paper_id,source_sha256,source_page,parser_version,evidence
    ) VALUES (
      v_question.id,v_source.id,lower(v_source.sha256),v_asset.source_page,
      'shared-source-visual-link-v1',
      jsonb_build_object(
        'sourceQuestionRef','9618/32/M/J/25 Q7(a)',
        'targetQuestionRef','9618/32/M/J/25 Q7(b)',
        'assetKind','logic_circuit',
        'sourceAuthority','same_verified_qp_shared_visual',
        'repair','insert_after_source_visual_cue_and_remove_flattened_labels'
      )
    )
    ON CONFLICT(question_id,source_sha256,parser_version) DO UPDATE
      SET source_page=excluded.source_page,evidence=excluded.evidence,created_at=now();
  ELSE
    -- Keep the repair idempotent, but still remove any stale flattened labels
    -- from the cue block if an earlier repair already linked the asset.
    SELECT jsonb_agg(
      CASE WHEN b.ordinality=v_cue_ordinal
        THEN jsonb_set(b.block,'{text}',to_jsonb('The diagram shows a logic circuit.'::text),false)
        ELSE b.block END
      ORDER BY b.ordinality
    ) INTO v_new_blocks
    FROM jsonb_array_elements(v_question.content_json->'blocks') WITH ORDINALITY b(block,ordinality);

    IF v_new_blocks IS DISTINCT FROM v_question.content_json->'blocks' THEN
      v_blocks:=jsonb_set(v_question.content_json,'{blocks}',v_new_blocks,false);
      PERFORM public.set_question_structured_content_v1(
        v_question.id,v_source.id,lower(v_source.sha256),v_blocks
      );
    END IF;
  END IF;
END
$repair$;

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v6(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_base jsonb;
  v_added integer := 0;
  v_demoted integer := 0;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code;
  END IF;
  IF p_year<2015 OR p_year>2035 THEN
    RAISE EXCEPTION 'invalid_year:%',p_year;
  END IF;

  v_base:=public.flag_source_fidelity_requirements_v5(p_syllabus_code,p_year);

  CREATE TEMP TABLE _source_visual_gap_v6(
    question_id uuid PRIMARY KEY,
    display_ref text NOT NULL,
    cue text NOT NULL,
    cue_ordinal bigint NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _source_visual_gap_v6(question_id,display_ref,cue,cue_ordinal)
  WITH eligible AS (
    SELECT q.id,q.display_ref,q.content_json
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE sy.code=p_syllabus_code AND sp.year=p_year
      AND q.marks IS NOT NULL AND q.status IN ('approved','needs_review')
      AND q.content_version=1 AND q.content_json IS NOT NULL
  ), cues AS (
    SELECT e.id,e.display_ref,e.content_json,b.ordinality cue_ordinal,
      lower(regexp_replace(coalesce(b.block->>'text',''),'[[:space:]]+',' ','g')) cue_text
    FROM eligible e
    CROSS JOIN LATERAL jsonb_array_elements(e.content_json->'blocks')
      WITH ORDINALITY b(block,ordinality)
    WHERE b.block->>'type'='text'
  )
  SELECT c.id,c.display_ref,left(c.cue_text,320),c.cue_ordinal
  FROM cues c
  WHERE c.cue_text ~ (
       'following[[:space:]]+((vector|logic|state[- ]transition|class|e-?r|entity[- ]relationship)[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape|screen[[:space:]]+image|screenshot)'
    || '|(the|this|given)[[:space:]]+(diagram|figure|flowchart|graph|circuit|image|chart|shape|screen[[:space:]]+image)[[:space:]]+(shows?|showing|represents?|contains?|illustrates?)'
    || '|(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)[[:space:]]+(is[[:space:]]+shown|are[[:space:]]+shown|illustrated|given|provided|below|above)'
    || '|(shown|illustrated|given|provided)[[:space:]]+(below|above|in[[:space:]]+the[[:space:]]+question[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)'
    || '|(study|examine|refer[[:space:]]+to|using)[[:space:]]+(the[[:space:]]+)?(logo|diagram|figure|flowchart|graph|circuit|image|chart|shape)'
    || '|(for|using|from)[[:space:]]+this[[:space:]]+logo'
    || '|example[[:space:]]+from[[:space:]]+(the|this)[[:space:]]+logo'
  )
  AND c.cue_text !~ '(take|capture|provide|submit)[[:space:]]+(a[[:space:]]+)?screenshot'
  AND c.cue_text !~ 'truth[[:space:]]+table.{0,100}(logic[[:space:]]+)?circuit[[:space:]]+(is[[:space:]]+)?shown'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(c.content_json->'blocks') WITH ORDINALITY next(block,ordinality)
    LEFT JOIN public.question_assets qa ON qa.id::text=next.block->>'assetId'
    WHERE next.ordinality=c.cue_ordinal+1
      AND (
        next.block->>'type'='table'
        OR (
          next.block->>'type'='asset' AND next.block->>'kind'='table'
          AND qa.kind='table' AND nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL
        )
        OR (
          next.block->>'type'='asset'
          AND next.block->>'kind' IN ('diagram','image','flowchart','logic_circuit')
          AND qa.kind IN ('diagram','image')
          AND (
            nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
            OR coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
            OR coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
          )
        )
      )
  )
  ON CONFLICT(question_id) DO NOTHING;

  INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT
    'source_visual_required_but_missing','error','questions',g.question_id,
    'Canonical source text says a printed visual is present, but the next canonical block is not a source-faithful visual/structured representation.',
    jsonb_build_object(
      'displayRef',g.display_ref,
      'cue',g.cue,
      'cueOrdinal',g.cue_ordinal,
      'audit','source-fidelity-detector-v6-visual-adjacency',
      'detectorVersion','v6',
      'syllabusCode',p_syllabus_code,
      'year',p_year
    )
  FROM _source_visual_gap_v6 g
  WHERE NOT EXISTS (
    SELECT 1 FROM public.validation_findings vf
    WHERE vf.ref_table='questions' AND vf.ref_id=g.question_id
      AND vf.rule_code='source_visual_required_but_missing'
      AND vf.resolved_at IS NULL
  );
  GET DIAGNOSTICS v_added=ROW_COUNT;

  UPDATE public.questions q
  SET status='needs_review'::review_status,
      notes=CASE
        WHEN coalesce(q.notes,'') LIKE '%source-fidelity-detector-v6:%' THEN q.notes
        ELSE concat_ws(E'\n',nullif(q.notes,''),
          'source-fidelity-detector-v6: canonical printed-visual cue is missing an adjacent source-faithful representation.')
      END,
      updated_at=now()
  WHERE q.status='approved'::review_status
    AND EXISTS(SELECT 1 FROM _source_visual_gap_v6 g WHERE g.question_id=q.id);
  GET DIAGNOSTICS v_demoted=ROW_COUNT;

  RETURN jsonb_build_object(
    'version','source-fidelity-detector-v6',
    'syllabusCode',p_syllabus_code,
    'year',p_year,
    'baseV5',v_base,
    'visualAdjacencyGaps',coalesce((SELECT count(*) FROM _source_visual_gap_v6),0),
    'findingsAdded',v_added,
    'approvedDemoted',v_demoted
  );
END
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v6(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v6(text,int)
  TO service_role;

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v1(
  p_syllabus_code text,
  p_year int
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
  SELECT public.flag_source_fidelity_requirements_v6(p_syllabus_code,p_year)
$function$;

REVOKE ALL ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_source_fidelity_requirements_v1(text,int)
  TO service_role;
