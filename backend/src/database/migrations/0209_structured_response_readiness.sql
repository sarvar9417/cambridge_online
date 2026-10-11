-- Source-safe structured-response readiness for Cambridge questions.
--
-- Goal:
-- 1) recover editable table cells when canonical table rows already contain
--    source-backed NULL cells;
-- 2) for source-image/table/diagram questions that require writing/drawing in
--    place, add a generic drawing response area so the browser can annotate the
--    original source crop without inventing geometry;
-- 3) fail closed when a high-confidence interactive task still has no usable
--    structured response surface.

DO $repair$
DECLARE
  v_row record;
  v_blocks jsonb;
  v_block jsonb;
  v_new_blocks jsonb;
  v_editable jsonb;
  v_has_interaction boolean;
  v_has_source_asset boolean;
  v_changed boolean;
BEGIN
  FOR v_row IN
    SELECT q.id,q.content_json,q.source_paper_id,sp.sha256,
           lower(regexp_replace(coalesce(q.stem_md,''),'[[:space:]]+',' ','g')) norm
    FROM public.questions q
    JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
    JOIN public.syllabi sy ON sy.id=sp.syllabus_id AND sy.code='9618'
    WHERE q.marks IS NOT NULL
      AND q.content_version=1
      AND q.content_json IS NOT NULL
      AND (
        lower(regexp_replace(coalesce(q.stem_md,''),'[[:space:]]+',' ','g')) ~
          '(^|[[:space:]])(complete|fill in|fill)[^.!?]{0,140}(table|grid|truth table|trace table|karnaugh map|k-map)'
        OR lower(regexp_replace(coalesce(q.stem_md,''),'[[:space:]]+',' ','g')) ~
          '(draw|join|connect|match)[^.!?]{0,140}(line|arrow|box|item|statement|description|term|layer|method)'
        OR lower(regexp_replace(coalesce(q.stem_md,''),'[[:space:]]+',' ','g')) ~
          '(complete|show)[^.!?]{0,140}(state of (the )?(stack|queue)|stack|queue)'
        OR (
          q.answer_kind='diagram'
          AND lower(regexp_replace(coalesce(q.stem_md,''),'[[:space:]]+',' ','g')) ~
            '(complete|draw|show|label)[^.!?]{0,160}(diagram|flowchart|circuit|tree|graph|map|stack|queue)'
        )
      )
  LOOP
    v_changed:=false;
    v_new_blocks:='[]'::jsonb;

    FOR v_block IN
      SELECT value
      FROM jsonb_array_elements(v_row.content_json->'blocks')
    LOOP
      IF v_block->>'type'='table'
         AND jsonb_array_length(coalesce(v_block->'editableCells','[]'::jsonb))=0 THEN
        SELECT coalesce(jsonb_agg(jsonb_build_array(rn-1,cn-1) ORDER BY rn,cn),'[]'::jsonb)
        INTO v_editable
        FROM jsonb_array_elements(v_block->'rows') WITH ORDINALITY r(rowv,rn)
        CROSS JOIN LATERAL jsonb_array_elements(r.rowv) WITH ORDINALITY c(cellv,cn)
        WHERE c.cellv='null'::jsonb;

        IF jsonb_array_length(v_editable)>0 THEN
          v_block:=jsonb_set(v_block,'{editableCells}',v_editable,false);
          v_changed:=true;
        END IF;
      END IF;
      v_new_blocks:=v_new_blocks||jsonb_build_array(v_block);
    END LOOP;

    SELECT EXISTS(
      SELECT 1
      FROM jsonb_array_elements(v_new_blocks) b
      WHERE (b->>'type'='table' AND jsonb_array_length(coalesce(b->'editableCells','[]'::jsonb))>0)
         OR b->>'type'='matching'
         OR (b->>'type'='answer_area' AND b->>'kind' IN ('table_cells','drawing'))
    ) INTO v_has_interaction;

    SELECT EXISTS(
      SELECT 1
      FROM jsonb_array_elements(v_new_blocks) b
      JOIN public.question_assets qa ON qa.id::text=b->>'assetId'
      WHERE b->>'type'='asset'
        AND qa.kind IN ('table','diagram','image')
        AND (
          nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
          OR nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL
          OR nullif(btrim(coalesce(qa.svg_markup,'')),'') IS NOT NULL
        )
    ) INTO v_has_source_asset;

    IF NOT v_has_interaction AND v_has_source_asset THEN
      v_new_blocks:=v_new_blocks||jsonb_build_array(jsonb_build_object(
        'type','answer_area',
        'kind','drawing',
        'lines',NULL,
        'source',coalesce(
          (
            SELECT b->'source'
            FROM jsonb_array_elements(v_new_blocks) b
            WHERE b->>'type'='asset'
            ORDER BY (b->'source'->>'page')::int NULLS LAST
            LIMIT 1
          ),
          jsonb_build_object('page',1)
        )
      ));
      v_changed:=true;
      v_has_interaction:=true;
    END IF;

    IF v_changed THEN
      PERFORM public.set_question_structured_content_v1(
        v_row.id,
        v_row.source_paper_id,
        lower(v_row.sha256),
        jsonb_set(v_row.content_json,'{blocks}',v_new_blocks,false)
      );
    END IF;

    IF v_has_interaction THEN
      UPDATE public.validation_findings
      SET resolved_at=coalesce(resolved_at,now()),
          resolution=coalesce(resolution,'Structured response surface restored from source-backed content.')
      WHERE ref_table='questions'
        AND ref_id=v_row.id
        AND rule_code='structured_response_required_but_missing'
        AND resolved_at IS NULL;
    ELSE
      INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
      SELECT
        'structured_response_required_but_missing','error','questions',v_row.id,
        'The Cambridge task requires an in-place table/diagram/matching response, but no source-faithful response surface is available.',
        jsonb_build_object('audit','structured-response-readiness-0209')
      WHERE NOT EXISTS(
        SELECT 1 FROM public.validation_findings vf
        WHERE vf.ref_table='questions'
          AND vf.ref_id=v_row.id
          AND vf.rule_code='structured_response_required_but_missing'
          AND vf.resolved_at IS NULL
      );

      UPDATE public.questions
      SET status=CASE WHEN status='approved' THEN 'needs_review'::review_status ELSE status END,
          updated_at=now()
      WHERE id=v_row.id;
    END IF;
  END LOOP;
END
$repair$;

CREATE OR REPLACE FUNCTION public.live_question_interaction_ready_v1(p_question_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $function$
  SELECT CASE
    WHEN NOT (
      lower(regexp_replace(coalesce(q.stem_md,''),'[[:space:]]+',' ','g')) ~
        '(^|[[:space:]])(complete|fill in|fill)[^.!?]{0,140}(table|grid|truth table|trace table|karnaugh map|k-map)'
      OR lower(regexp_replace(coalesce(q.stem_md,''),'[[:space:]]+',' ','g')) ~
        '(draw|join|connect|match)[^.!?]{0,140}(line|arrow|box|item|statement|description|term|layer|method)'
      OR lower(regexp_replace(coalesce(q.stem_md,''),'[[:space:]]+',' ','g')) ~
        '(complete|show)[^.!?]{0,140}(state of (the )?(stack|queue)|stack|queue)'
      OR (
        q.answer_kind='diagram'
        AND lower(regexp_replace(coalesce(q.stem_md,''),'[[:space:]]+',' ','g')) ~
          '(complete|draw|show|label)[^.!?]{0,160}(diagram|flowchart|circuit|tree|graph|map|stack|queue)'
      )
    ) THEN true
    ELSE (
      q.content_version=1
      AND q.content_json IS NOT NULL
      AND EXISTS(
        SELECT 1
        FROM jsonb_array_elements(coalesce(q.content_json->'blocks','[]'::jsonb)) response_block
        WHERE (
          response_block->>'type'='table'
          AND jsonb_array_length(coalesce(response_block->'editableCells','[]'::jsonb))>0
        )
        OR response_block->>'type'='matching'
        OR (
          response_block->>'type'='answer_area'
          AND response_block->>'kind' IN ('table_cells','drawing')
        )
      )
    )
  END
  FROM public.questions q
  WHERE q.id=p_question_id
$function$;

CREATE OR REPLACE FUNCTION public.live_question_has_blocking_finding_v1(p_question_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $function$
  WITH RECURSIVE source_chain(id,parent_id) AS (
    SELECT q.id,q.parent_id
    FROM public.questions q
    WHERE q.id=p_question_id
    UNION
    SELECT parent.id,parent.parent_id
    FROM source_chain child
    JOIN public.questions parent ON parent.id=child.parent_id
  )
  SELECT
    EXISTS(
      SELECT 1
      FROM source_chain chain
      JOIN public.validation_findings vf
        ON vf.ref_table='questions'
       AND vf.ref_id=chain.id
       AND vf.resolved_at IS NULL
       AND vf.severity='error'
    )
    OR NOT coalesce(public.live_question_interaction_ready_v1(p_question_id),false)
$function$;

REVOKE ALL ON FUNCTION public.live_question_interaction_ready_v1(uuid) FROM PUBLIC,anon,authenticated;

-- The readiness cache is revision guarded. Rebuild it after this source repair
-- when the helper exists; otherwise runtime safely falls back to the dynamic gate.
DO $refresh$
BEGIN
  IF to_regprocedure('public.refresh_live_question_readiness_v1()') IS NOT NULL THEN
    PERFORM public.refresh_live_question_readiness_v1();
  END IF;
END
$refresh$;
