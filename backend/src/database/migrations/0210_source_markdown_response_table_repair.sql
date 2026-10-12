-- 0210: source-backed semantic response tables from verified Markdown table assets.
--
-- The repair is deliberately conservative:
-- * only 9618 QP questions with a high-confidence table-completion instruction
-- * only canonical v1 content with matching source-paper SHA provenance
-- * only table assets already referenced by that canonical content
-- * only Markdown tables whose geometry parses cleanly
-- * only cells that are blank/underscore placeholders become editable
-- * if more than one candidate table has the same highest editable-cell count,
--   skip the question instead of guessing
--
-- No answer is inferred, no mark scheme is copied into learner content and no
-- question review status is changed.

CREATE OR REPLACE FUNCTION public.parse_source_markdown_response_table_v1(p_md text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path=public,pg_temp
AS $function$
DECLARE
  v_lines text[];
  v_line text;
  v_cells text[];
  v_headers jsonb:='[]'::jsonb;
  v_rows jsonb:='[]'::jsonb;
  v_editable jsonb:='[]'::jsonb;
  v_width int;
  v_row_index int:=0;
  v_col_index int;
  v_cell text;
  v_separator_ok boolean:=true;
BEGIN
  IF nullif(btrim(coalesce(p_md,'')),'') IS NULL THEN RETURN NULL; END IF;

  v_lines:=regexp_split_to_array(replace(p_md,E'\r',''),E'\n');
  IF coalesce(array_length(v_lines,1),0)<3 THEN RETURN NULL; END IF;

  -- Header.
  v_line:=regexp_replace(regexp_replace(v_lines[1],'^[[:space:]]*\|',''),'\|[[:space:]]*$','');
  v_cells:=string_to_array(v_line,'|');
  v_width:=coalesce(array_length(v_cells,1),0);
  IF v_width<1 THEN RETURN NULL; END IF;
  FOR v_col_index IN 1..v_width LOOP
    v_headers:=v_headers||jsonb_build_array(btrim(v_cells[v_col_index]));
  END LOOP;

  -- Markdown separator row must have the exact same width.
  v_line:=regexp_replace(regexp_replace(v_lines[2],'^[[:space:]]*\|',''),'\|[[:space:]]*$','');
  v_cells:=string_to_array(v_line,'|');
  IF coalesce(array_length(v_cells,1),0)<>v_width THEN RETURN NULL; END IF;
  FOR v_col_index IN 1..v_width LOOP
    IF btrim(v_cells[v_col_index])!~'^:?-{3,}:?$' THEN
      v_separator_ok:=false;
    END IF;
  END LOOP;
  IF NOT v_separator_ok THEN RETURN NULL; END IF;

  FOR v_row_index IN 3..array_length(v_lines,1) LOOP
    IF nullif(btrim(v_lines[v_row_index]),'') IS NULL THEN CONTINUE; END IF;
    v_line:=regexp_replace(regexp_replace(v_lines[v_row_index],'^[[:space:]]*\|',''),'\|[[:space:]]*$','');
    v_cells:=string_to_array(v_line,'|');
    IF coalesce(array_length(v_cells,1),0)<>v_width THEN RETURN NULL; END IF;

    DECLARE
      v_row jsonb:='[]'::jsonb;
      v_actual_row int:=jsonb_array_length(v_rows);
    BEGIN
      FOR v_col_index IN 1..v_width LOOP
        v_cell:=btrim(v_cells[v_col_index]);
        v_row:=v_row||jsonb_build_array(NULLIF(v_cell,''));
        IF v_cell='' OR v_cell~'^_+$' THEN
          v_editable:=v_editable||jsonb_build_array(
            jsonb_build_array(v_actual_row,v_col_index-1)
          );
        END IF;
      END LOOP;
      v_rows:=v_rows||jsonb_build_array(v_row);
    END;
  END LOOP;

  IF jsonb_array_length(v_rows)<1 THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'headers',v_headers,
    'rows',v_rows,
    'editableCells',v_editable,
    'editableCount',jsonb_array_length(v_editable)
  );
END
$function$;

REVOKE ALL ON FUNCTION public.parse_source_markdown_response_table_v1(text)
FROM PUBLIC,anon,authenticated;

DO $repair$
DECLARE
  v_q record;
  v_asset record;
  v_parsed jsonb;
  v_blocks jsonb;
  v_content jsonb;
  v_repaired int:=0;
BEGIN
  FOR v_q IN
    SELECT q.*,sp.sha256 source_sha
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id AND sy.code='9618'
    WHERE q.marks IS NOT NULL
      AND q.content_version=1
      AND q.content_json IS NOT NULL
      AND lower(regexp_replace(coalesce(q.context_md,'')||' '||coalesce(q.stem_md,''),'[[:space:]]+',' ','g')) ~ (
        'complete[[:space:]]+(the[[:space:]]+|this[[:space:]]+|following[[:space:]]+)?(trace[[:space:]]+|truth[[:space:]]+)?table'
        ||'|complete[[:space:]]+(the[[:space:]]+)?answer[[:space:]]+column[[:space:]]+in[[:space:]]+(the[[:space:]]+)?following[[:space:]]+table'
        ||'|trace[[:space:]]+(the[[:space:]]+)?(program|algorithm).{0,80}table'
        ||'|write.{0,80}answers?[[:space:]]+in[[:space:]]+(the[[:space:]]+)?table'
        ||'|fill(ing)?[[:space:]]+in.{0,60}(table|missing)'
        ||'|complete[[:space:]]+(the[[:space:]]+)?k[- ]?map'
      )
      AND NOT EXISTS(
        SELECT 1
        FROM jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) b
        WHERE b->>'type'='table'
          AND jsonb_typeof(b->'editableCells')='array'
          AND jsonb_array_length(b->'editableCells')>0
      )
  LOOP
    -- Canonical content must still point at this exact QP revision.
    IF v_q.content_json->'source'->>'paperId'<>v_q.source_paper_id::text
       OR lower(coalesce(v_q.content_json->'source'->>'sha256',''))<>lower(coalesce(v_q.source_sha,'')) THEN
      CONTINUE;
    END IF;

    SELECT candidate.*
    INTO v_asset
    FROM (
      SELECT
        qa.id,qa.source_page,qa.source_bbox,qa.content_md,qa.sort_order,
        public.parse_source_markdown_response_table_v1(qa.content_md) parsed,
        (public.parse_source_markdown_response_table_v1(qa.content_md)->>'editableCount')::int editable_count
      FROM public.question_assets qa
      WHERE qa.question_id=v_q.id
        AND qa.kind='table'
        AND nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL
        AND EXISTS(
          SELECT 1
          FROM jsonb_array_elements(v_q.content_json->'blocks') b
          WHERE b->>'type'='asset' AND b->>'assetId'=qa.id::text
        )
    ) candidate
    WHERE candidate.parsed IS NOT NULL
      AND candidate.editable_count>=2
      AND NOT EXISTS(
        SELECT 1
        FROM (
          SELECT
            qa2.id,
            (public.parse_source_markdown_response_table_v1(qa2.content_md)->>'editableCount')::int editable_count
          FROM public.question_assets qa2
          WHERE qa2.question_id=v_q.id
            AND qa2.kind='table'
            AND qa2.id<>candidate.id
            AND EXISTS(
              SELECT 1
              FROM jsonb_array_elements(v_q.content_json->'blocks') b2
              WHERE b2->>'type'='asset' AND b2->>'assetId'=qa2.id::text
            )
        ) competitor
        WHERE competitor.editable_count=candidate.editable_count
      )
    ORDER BY candidate.editable_count DESC,candidate.sort_order DESC,candidate.id
    LIMIT 1;

    IF NOT FOUND THEN CONTINUE; END IF;
    v_parsed:=v_asset.parsed;

    SELECT jsonb_agg(
      CASE
        WHEN block->>'type'='asset' AND block->>'assetId'=v_asset.id::text
        THEN jsonb_build_object(
          'type','table',
          'kind',CASE
            WHEN lower(coalesce(v_q.stem_md,'')) LIKE '%truth table%' THEN 'truth_table'
            ELSE 'table'
          END,
          'headers',v_parsed->'headers',
          'rows',v_parsed->'rows',
          'editableCells',v_parsed->'editableCells',
          'source',jsonb_strip_nulls(jsonb_build_object(
            'page',v_asset.source_page,
            'bbox',v_asset.source_bbox
          ))
        )
        ELSE block
      END
      ORDER BY ordinality
    )
    INTO v_blocks
    FROM jsonb_array_elements(v_q.content_json->'blocks')
      WITH ORDINALITY source_blocks(block,ordinality);

    IF v_blocks IS NULL OR v_blocks IS NOT DISTINCT FROM v_q.content_json->'blocks' THEN
      CONTINUE;
    END IF;

    v_content:=jsonb_set(v_q.content_json,'{blocks}',v_blocks,false);
    PERFORM public.set_question_structured_content_v1(
      v_q.id,v_q.source_paper_id,lower(v_q.source_sha),v_content
    );

    INSERT INTO public.structured_content_backfill_audits(
      question_id,source_paper_id,source_sha256,source_page,parser_version,evidence
    ) VALUES (
      v_q.id,v_q.source_paper_id,lower(v_q.source_sha),v_asset.source_page,
      'source-markdown-response-table-v1',
      jsonb_build_object(
        'displayRef',v_q.display_ref,
        'repair','replace_verified_markdown_answer_table_asset_with_semantic_editable_table',
        'sourceAssetId',v_asset.id::text,
        'sourceBbox',v_asset.source_bbox,
        'editableCellCount',(v_parsed->>'editableCount')::int,
        'answerInference',false
      )
    )
    ON CONFLICT(question_id,source_sha256,parser_version) DO UPDATE
      SET source_page=excluded.source_page,
          evidence=excluded.evidence,
          created_at=now();

    v_repaired:=v_repaired+1;
  END LOOP;

  IF v_repaired>0 THEN
    -- Question writes invalidate the 0207 readiness cache by design. Refresh it
    -- in the same migration so production does not fall back to the expensive
    -- dynamic gate after these verified source repairs.
    PERFORM public.refresh_live_question_readiness_v1();
  END IF;

  RAISE NOTICE '0210 repaired % source-backed Markdown response tables',v_repaired;
END
$repair$;

COMMENT ON FUNCTION public.parse_source_markdown_response_table_v1(text) IS
  'Strict parser used by source-backed 9618 response-table repair. Blank/underscore source cells are represented as editable cells; no answers are inferred.';
