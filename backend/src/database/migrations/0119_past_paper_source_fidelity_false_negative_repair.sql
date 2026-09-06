-- Repair source-fidelity false negatives left by the first structured-content pass.
--
-- Two defects are handled conservatively:
--   1) table assets whose cell data is already source-backed and pipe-delimited
--      are upgraded from a generic asset block to a canonical table block without
--      changing any cell value;
--   2) diagram/image assets that are only prose/ASCII approximations are no longer
--      treated as faithful source visuals. They receive an unresolved fidelity
--      finding and are moved to needs_review until the exact source PDF crop/SVG
--      is restored through the guarded repair pipeline.
--
-- No diagram geometry is invented in this migration.

CREATE OR REPLACE FUNCTION public.structured_table_block_from_asset_v1(p_asset_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
WITH asset AS (
  SELECT
    qa.id,qa.question_id,qa.content_md,qa.alt_text,qa.source_page,q.content_json
  FROM public.question_assets qa
  JOIN public.questions q ON q.id=qa.question_id
  WHERE qa.id=p_asset_id
    AND qa.kind='table'
    AND nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL
), lines AS (
  SELECT ordinality::integer ord,btrim(line) line
  FROM asset
  CROSS JOIN LATERAL regexp_split_to_table(asset.content_md,E'\r?\n')
    WITH ORDINALITY AS x(line,ordinality)
  WHERE line LIKE '%|%'
), parsed AS (
  SELECT
    ord,
    ARRAY(
      SELECT nullif(btrim(value),'')
      FROM unnest(regexp_split_to_array(btrim(line,'|'),'\|')) value
    ) cells
  FROM lines
), dimensions AS (
  SELECT max(cardinality(cells))::integer width FROM parsed
), metadata AS (
  SELECT coalesce((
    SELECT bool_and(coalesce(value,'') ~ '^:?-{3,}:?$')
    FROM unnest((SELECT cells FROM parsed ORDER BY ord OFFSET 1 LIMIT 1)) value
  ),false) second_is_separator
), body0 AS (
  SELECT p.ord,p.cells
  FROM parsed p,metadata m
  WHERE NOT (
      m.second_is_separator
      AND p.ord IN ((SELECT min(ord) FROM parsed),(SELECT min(ord)+1 FROM parsed))
    )
    AND NOT (
      SELECT bool_and(coalesce(value,'') ~ '^:?-{3,}:?$')
      FROM unnest(p.cells) value
    )
), body AS (
  SELECT ord,row_number() OVER(ORDER BY ord)-1 AS row_index,cells
  FROM body0
), row_json AS (
  SELECT
    b.row_index,
    jsonb_agg(
      to_jsonb(CASE WHEN col.i<=cardinality(b.cells) THEN b.cells[col.i] ELSE NULL END)
      ORDER BY col.i
    ) AS value
  FROM body b
  CROSS JOIN dimensions d
  CROSS JOIN LATERAL generate_series(1,d.width) col(i)
  GROUP BY b.row_index
), editable AS (
  SELECT jsonb_agg(jsonb_build_array(b.row_index,col.i-1) ORDER BY b.row_index,col.i) AS value
  FROM body b
  CROSS JOIN dimensions d
  CROSS JOIN LATERAL generate_series(1,d.width) col(i)
  WHERE CASE WHEN col.i<=cardinality(b.cells) THEN b.cells[col.i] ELSE NULL END IS NULL
), source_location AS (
  SELECT coalesce(
    (
      SELECT block->'source'
      FROM asset
      CROSS JOIN LATERAL jsonb_array_elements(coalesce(asset.content_json->'blocks','[]'::jsonb)) block
      WHERE block->>'type'='asset'
        AND block->>'assetId'=asset.id::text
      LIMIT 1
    ),
    jsonb_build_object('page',(SELECT source_page FROM asset))
  ) AS value
), headers AS (
  SELECT CASE
    WHEN (SELECT second_is_separator FROM metadata)
      THEN to_jsonb((SELECT cells FROM parsed ORDER BY ord LIMIT 1))
    ELSE '[]'::jsonb
  END AS value
)
SELECT CASE
  WHEN (SELECT width FROM dimensions) IS NULL OR (SELECT width FROM dimensions)<2
       OR NOT EXISTS(SELECT 1 FROM body)
    THEN NULL
  ELSE jsonb_build_object(
    'type','table',
    'kind',CASE
      WHEN lower(coalesce((SELECT alt_text FROM asset),'')) LIKE '%truth%' THEN 'truth_table'
      WHEN lower(coalesce((SELECT alt_text FROM asset),'')) LIKE '%tick%' THEN 'tick_grid'
      WHEN lower(coalesce((SELECT alt_text FROM asset),'')) LIKE '%selection%' THEN 'selection_grid'
      ELSE 'table'
    END,
    'headers',(SELECT value FROM headers),
    'rows',coalesce((SELECT jsonb_agg(value ORDER BY row_index) FROM row_json),'[]'::jsonb),
    'editableCells',coalesce((SELECT value FROM editable),'[]'::jsonb),
    'source',(SELECT value FROM source_location)
  )
END;
$function$;

REVOKE ALL ON FUNCTION public.structured_table_block_from_asset_v1(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.structured_table_block_from_asset_v1(uuid)
  TO service_role;

DO $$
DECLARE
  v_row record;
  v_question public.questions%ROWTYPE;
  v_table_block jsonb;
  v_blocks jsonb;
  v_content jsonb;
  v_repaired integer := 0;
BEGIN
  FOR v_row IN
    SELECT q.id question_id,q.source_paper_id,sp.sha256 source_sha256,qa.id asset_id
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
    JOIN public.question_assets qa ON qa.question_id=q.id AND qa.kind='table'
    WHERE q.content_json IS NOT NULL
      AND q.content_version=1
      AND nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL
      AND qa.content_md LIKE '%|%'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(q.content_json->'blocks') block
        WHERE block->>'type'='asset'
          AND block->>'assetId'=qa.id::text
      )
    ORDER BY q.id,qa.sort_order,qa.id
  LOOP
    SELECT * INTO v_question
    FROM public.questions
    WHERE id=v_row.question_id
    FOR UPDATE;

    SELECT public.structured_table_block_from_asset_v1(v_row.asset_id)
    INTO v_table_block;
    IF v_table_block IS NULL THEN
      CONTINUE;
    END IF;

    SELECT jsonb_agg(
      CASE
        WHEN block.value->>'type'='asset'
         AND block.value->>'assetId'=v_row.asset_id::text
          THEN v_table_block
        ELSE block.value
      END
      ORDER BY block.ordinality
    )
    INTO v_blocks
    FROM jsonb_array_elements(v_question.content_json->'blocks')
      WITH ORDINALITY AS block(value,ordinality);

    -- A second table asset for the same question is processed against the newest
    -- content_json, so multiple registers/grids preserve their original order.
    v_content := jsonb_set(v_question.content_json,'{blocks}',v_blocks,false);
    PERFORM public.set_question_structured_content_v1(
      v_row.question_id,
      v_row.source_paper_id,
      lower(v_row.source_sha256),
      v_content
    );
    v_repaired := v_repaired+1;
  END LOOP;

  RAISE NOTICE '0119 canonical semantic table blocks repaired: %',v_repaired;
END $$;

DO $$
DECLARE
  v_total integer;
  v_downgraded integer;
BEGIN
  CREATE TEMP TABLE _flattened_source_visuals(
    question_id uuid PRIMARY KEY,
    display_ref text NOT NULL,
    syllabus_code text NOT NULL,
    asset_ids jsonb NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _flattened_source_visuals(question_id,display_ref,syllabus_code,asset_ids)
  WITH candidates AS (
    SELECT
      q.id,q.display_ref,sy.code syllabus_code,
      regexp_replace(
        lower(coalesce(q.stem_md,'') || ' ' || coalesce(q.context_md,'')),
        '[[:space:]]+',' ','g'
      ) source_text,
      qa.id asset_id
    FROM public.questions q
    JOIN public.question_assets qa ON qa.question_id=q.id
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id
    WHERE q.status IN ('approved','needs_review')
      AND qa.kind IN ('diagram','image')
      -- URL-backed crops and real SVG are faithful/renderable. Prose, Markdown
      -- and ASCII diagrams deliberately fail this test.
      AND nullif(btrim(coalesce(qa.storage_path,'')),'') IS NULL
      AND coalesce(qa.content_md,'') !~* '^\s*<svg(?:\s|>)'
      AND coalesce(qa.svg_markup,'') !~* '^\s*<svg(?:\s|>)'
  ), required AS (
    SELECT *
    FROM candidates
    WHERE source_text ~ (
      'following (logic )?circuit'
      || '|logic circuit (is )?shown|circuit shown (below|above)'
      || '|following diagram|diagram (is )?shown|diagram shows|diagram represents|diagram shown (below|above)'
      || '|shown in (the )?(diagram|figure)'
      || '|following flowchart|flowchart (is )?shown|flowchart shown|complete.{0,80}flowchart'
      || '|following graph|graph (is )?shown|graph shown (below|above)'
      || '|following (bitmap )?image|image (is )?shown|image shown (below|above)'
      || '|complete (the )?(following )?(diagram|logic circuit)'
      || '|complete (the )?(e-r|entity[- ]relationship) diagram'
      || '|complete (the )?(class|state.{0,3}transition) diagram'
      || '|complete (the )?binary tree|state.{0,3}transition diagram'
      || '|structure chart|syntax diagrams?|current state of the stack'
    )
  )
  SELECT id,display_ref,syllabus_code,jsonb_agg(asset_id ORDER BY asset_id)
  FROM required
  GROUP BY id,display_ref,syllabus_code;

  SELECT count(*) INTO v_total FROM _flattened_source_visuals;
  SELECT count(*) INTO v_downgraded
  FROM _flattened_source_visuals f
  JOIN public.questions q ON q.id=f.question_id
  WHERE q.status='approved';

  INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
  SELECT
    'source_visual_required_but_missing',
    'error',
    'questions',
    f.question_id,
    'The original QP contains a source visual, but the stored diagram/image is only a flattened text approximation. Restore the exact source geometry before approval.',
    jsonb_build_object(
      'displayRef',f.display_ref,
      'syllabusCode',f.syllabus_code,
      'assetIds',f.asset_ids,
      'audit','past-paper-source-fidelity-false-negative-0119',
      'reason','flattened_visual_asset'
    )
  FROM _flattened_source_visuals f
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.validation_findings vf
    WHERE vf.ref_table='questions'
      AND vf.ref_id=f.question_id
      AND vf.rule_code='source_visual_required_but_missing'
      AND vf.resolved_at IS NULL
  );

  UPDATE public.questions q
  SET status=CASE WHEN q.status='approved' THEN 'needs_review'::review_status ELSE q.status END,
      notes=CASE
        WHEN coalesce(q.notes,'') LIKE '%source-fidelity-false-negative-0119:%' THEN q.notes
        ELSE concat_ws(
          E'\n',nullif(q.notes,''),
          'source-fidelity-false-negative-0119: flattened visual is not source faithful; exact QP crop/SVG required.'
        )
      END,
      updated_at=now()
  FROM _flattened_source_visuals f
  WHERE q.id=f.question_id;

  RAISE NOTICE '0119 flattened source visuals: % unresolved questions, % moved from approved to needs_review',v_total,v_downgraded;
END $$;

-- Future ingestion must follow the same rule. A diagram/image content_md value
-- is renderable only when it is actual SVG; prose descriptions no longer satisfy
-- the canonical structured-content gate.
CREATE OR REPLACE FUNCTION public.canonicalize_ingested_question_v1(p_question_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_question public.questions%ROWTYPE;
  v_source public.source_papers%ROWTYPE;
  v_evidence jsonb;
  v_page integer;
  v_blocks jsonb := '[]'::jsonb;
  v_asset record;
  v_kind text;
  v_unrepresentable boolean := false;
BEGIN
  SELECT * INTO v_question FROM public.questions WHERE id=p_question_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'question not found'; END IF;
  IF v_question.marks IS NULL THEN
    RETURN jsonb_build_object('questionId',p_question_id,'status','parent_context_skipped');
  END IF;
  IF v_question.content_json IS NOT NULL THEN
    RETURN jsonb_build_object('questionId',p_question_id,'status','already_structured');
  END IF;

  SELECT * INTO v_source FROM public.source_papers WHERE id=v_question.source_paper_id;
  IF NOT FOUND OR v_source.kind<>'QP' THEN
    RETURN jsonb_build_object('questionId',p_question_id,'status','not_qp_leaf');
  END IF;
  IF coalesce(v_source.sha256,'') !~ '^[0-9A-Fa-f]{64}$' THEN
    RAISE EXCEPTION 'question paper SHA-256 is unavailable';
  END IF;

  SELECT cc.source_evidence INTO v_evidence
  FROM public.cross_checks cc
  WHERE cc.ref_table='questions' AND cc.ref_id=p_question_id
    AND cc.checker_prompt_version='cross-check.v3'
    AND cc.agrees=true AND cc.source_evidence IS NOT NULL
  ORDER BY cc.created_at DESC,cc.id DESC LIMIT 1;
  IF v_evidence IS NULL THEN
    RETURN jsonb_build_object('questionId',p_question_id,'status','verified_crosscheck_missing');
  END IF;
  IF v_evidence->>'sourceMode'<>'page_image+text_layer'
     OR v_evidence->>'qpPaperId'<>v_question.source_paper_id::text
     OR lower(coalesce(v_evidence->>'qpSha256',''))<>lower(v_source.sha256)
     OR jsonb_typeof(v_evidence->'qpPages')<>'array'
     OR jsonb_array_length(v_evidence->'qpPages')=0 THEN
    RAISE EXCEPTION 'cross-check QP source evidence does not match question source';
  END IF;

  SELECT min((value #>> '{}')::integer) INTO v_page
  FROM jsonb_array_elements(v_evidence->'qpPages') value
  WHERE (value #>> '{}') ~ '^[1-9][0-9]*$';
  IF v_page IS NULL THEN RAISE EXCEPTION 'cross-check QP source pages are invalid'; END IF;

  IF nullif(btrim(coalesce(v_question.context_md,'')),'') IS NOT NULL THEN
    v_blocks:=v_blocks||jsonb_build_array(jsonb_build_object(
      'type','text','style','paragraph','text',btrim(v_question.context_md),'source',jsonb_build_object('page',v_page)
    ));
  END IF;
  IF nullif(btrim(coalesce(v_question.stem_md,'')),'') IS NOT NULL THEN
    v_blocks:=v_blocks||jsonb_build_array(jsonb_build_object(
      'type','text','style','task','text',btrim(v_question.stem_md),'source',jsonb_build_object('page',v_page)
    ));
  END IF;

  FOR v_asset IN
    SELECT qa.id,qa.kind::text kind,qa.content_md,qa.storage_path,qa.svg_markup,qa.alt_text,qa.source_page
    FROM public.question_assets qa
    WHERE qa.question_id=p_question_id
    ORDER BY qa.sort_order,qa.id
  LOOP
    IF v_asset.source_page IS NULL OR v_asset.source_page<1 THEN
      v_unrepresentable:=true; CONTINUE;
    END IF;

    IF v_asset.kind='pseudocode' AND nullif(btrim(coalesce(v_asset.content_md,'')),'') IS NOT NULL THEN
      v_blocks:=v_blocks||jsonb_build_array(jsonb_build_object(
        'type','code','language','pseudocode','text',btrim(v_asset.content_md),'source',jsonb_build_object('page',v_asset.source_page)
      ));
    ELSIF v_asset.kind IN ('diagram','image') AND (
      nullif(btrim(coalesce(v_asset.storage_path,'')),'') IS NOT NULL
      OR coalesce(v_asset.content_md,'') ~* '^\s*<svg(?:\s|>)'
      OR coalesce(v_asset.svg_markup,'') ~* '^\s*<svg(?:\s|>)'
    ) THEN
      v_kind:=CASE
        WHEN coalesce(v_asset.alt_text,'') ~* 'flow[ -]?chart' THEN 'flowchart'
        WHEN coalesce(v_asset.alt_text,'') ~* 'logic|circuit|gate' THEN 'logic_circuit'
        WHEN v_asset.kind='diagram' THEN 'diagram'
        ELSE 'image'
      END;
      v_blocks:=v_blocks||jsonb_build_array(jsonb_build_object(
        'type','asset','kind',v_kind,'assetId',v_asset.id::text,
        'altText',coalesce(v_asset.alt_text,'Original Cambridge source visual'),
        'source',jsonb_build_object('page',v_asset.source_page)
      ));
    ELSIF v_asset.kind='table' THEN
      -- Exact cell semantics must be reconstructed into a table block. Existing
      -- table text is retained as source evidence but cannot be called canonical
      -- until the semantic structure is materialized.
      v_unrepresentable:=true;
    ELSIF v_asset.kind NOT IN ('text','code') THEN
      v_unrepresentable:=true;
    END IF;
  END LOOP;

  IF v_question.answer_kind='diagram' THEN
    v_blocks:=v_blocks||jsonb_build_array(jsonb_build_object(
      'type','answer_area','kind','drawing','lines',NULL,'source',jsonb_build_object('page',v_page)
    ));
  ELSIF coalesce(v_question.answer_lines,0)>0 AND v_question.answer_kind<>'table' THEN
    v_blocks:=v_blocks||jsonb_build_array(jsonb_build_object(
      'type','answer_area','kind','lines','lines',v_question.answer_lines,'source',jsonb_build_object('page',v_page)
    ));
  END IF;

  IF v_unrepresentable OR jsonb_array_length(v_blocks)=0 THEN
    UPDATE public.questions
    SET status=CASE WHEN status='approved' THEN 'needs_review'::review_status ELSE status END,updated_at=now()
    WHERE id=p_question_id;
    IF NOT EXISTS(
      SELECT 1 FROM public.validation_findings vf
      WHERE vf.ref_table='questions' AND vf.ref_id=p_question_id
        AND vf.rule_code='structured_content_ingestion_unrepresentable' AND vf.resolved_at IS NULL
    ) THEN
      INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
      VALUES(
        'structured_content_ingestion_unrepresentable','error','questions',p_question_id,
        'Source-backed question requires structured reconstruction before approval.',
        jsonb_build_object('sourcePaperId',v_question.source_paper_id,'sourceSha256',lower(v_source.sha256),'qpPages',v_evidence->'qpPages','canonicalVersion',1)
      );
    END IF;
    RETURN jsonb_build_object('questionId',p_question_id,'status','needs_structured_repair');
  END IF;

  PERFORM public.set_question_structured_content_v1(
    p_question_id,v_question.source_paper_id,lower(v_source.sha256),
    jsonb_build_object('version',1,'source',jsonb_build_object('paperId',v_question.source_paper_id::text,'sha256',lower(v_source.sha256)),'blocks',v_blocks)
  );
  RETURN jsonb_build_object('questionId',p_question_id,'status','structured','blockCount',jsonb_array_length(v_blocks));
END;
$function$;

REVOKE ALL ON FUNCTION public.canonicalize_ingested_question_v1(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.canonicalize_ingested_question_v1(uuid)
  TO service_role;
