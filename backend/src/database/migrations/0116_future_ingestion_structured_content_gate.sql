-- Future ingestion must not recreate the historical flattened-question problem.
--
-- A clean CROSSCHECK_V3 is already bound to exact QP/MS paper IDs, SHA-256 values
-- and source pages.  This migration consumes that evidence after the question
-- has been persisted and creates a conservative canonical v1 document when the
-- representation is deterministic.  Rich table/layout assets that cannot be
-- represented semantically are deliberately left for source repair/review.
--
-- Existing migrated questions are unaffected because content_json is already
-- present. No review state is promoted by this migration.

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
  SELECT * INTO v_question
  FROM public.questions
  WHERE id=p_question_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'question not found';
  END IF;

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
  WHERE cc.ref_table='questions'
    AND cc.ref_id=p_question_id
    AND cc.checker_prompt_version='cross-check.v3'
    AND cc.agrees=true
    AND cc.source_evidence IS NOT NULL
  ORDER BY cc.created_at DESC,cc.id DESC
  LIMIT 1;

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
  IF v_page IS NULL THEN
    RAISE EXCEPTION 'cross-check QP source pages are invalid';
  END IF;

  IF nullif(btrim(coalesce(v_question.context_md,'')),'') IS NOT NULL THEN
    v_blocks := v_blocks || jsonb_build_array(jsonb_build_object(
      'type','text','style','paragraph','text',btrim(v_question.context_md),
      'source',jsonb_build_object('page',v_page)
    ));
  END IF;
  IF nullif(btrim(coalesce(v_question.stem_md,'')),'') IS NOT NULL THEN
    v_blocks := v_blocks || jsonb_build_array(jsonb_build_object(
      'type','text','style','task','text',btrim(v_question.stem_md),
      'source',jsonb_build_object('page',v_page)
    ));
  END IF;

  FOR v_asset IN
    SELECT qa.id,qa.kind::text kind,qa.content_md,qa.storage_path,qa.alt_text,qa.source_page
    FROM public.question_assets qa
    WHERE qa.question_id=p_question_id
    ORDER BY qa.sort_order,qa.id
  LOOP
    IF v_asset.source_page IS NULL OR v_asset.source_page<1 THEN
      v_unrepresentable := true;
      CONTINUE;
    END IF;

    IF v_asset.kind='pseudocode' AND nullif(btrim(coalesce(v_asset.content_md,'')),'') IS NOT NULL THEN
      v_blocks := v_blocks || jsonb_build_array(jsonb_build_object(
        'type','code','language','pseudocode','text',btrim(v_asset.content_md),
        'source',jsonb_build_object('page',v_asset.source_page)
      ));
    ELSIF v_asset.kind IN ('diagram','image')
          AND (nullif(v_asset.storage_path,'') IS NOT NULL OR nullif(v_asset.content_md,'') IS NOT NULL) THEN
      v_kind := CASE
        WHEN coalesce(v_asset.alt_text,'') ~* 'flow[ -]?chart' THEN 'flowchart'
        WHEN coalesce(v_asset.alt_text,'') ~* 'logic|circuit|gate' THEN 'logic_circuit'
        WHEN v_asset.kind='diagram' THEN 'diagram'
        ELSE 'image'
      END;
      v_blocks := v_blocks || jsonb_build_array(jsonb_build_object(
        'type','asset','kind',v_kind,'assetId',v_asset.id::text,
        'altText',coalesce(v_asset.alt_text,'Original Cambridge source visual'),
        'source',jsonb_build_object('page',v_asset.source_page)
      ));
    ELSIF v_asset.kind='table' THEN
      -- Markdown/plain table text is not proof of cell semantics.  A verified
      -- source repair must reconstruct the table/grid before approval.
      v_unrepresentable := true;
    ELSIF v_asset.kind NOT IN ('text','code') THEN
      v_unrepresentable := true;
    END IF;
  END LOOP;

  IF v_question.answer_kind='diagram' THEN
    v_blocks := v_blocks || jsonb_build_array(jsonb_build_object(
      'type','answer_area','kind','drawing','lines',NULL,
      'source',jsonb_build_object('page',v_page)
    ));
  ELSIF coalesce(v_question.answer_lines,0)>0 AND v_question.answer_kind<>'table' THEN
    v_blocks := v_blocks || jsonb_build_array(jsonb_build_object(
      'type','answer_area','kind','lines','lines',v_question.answer_lines,
      'source',jsonb_build_object('page',v_page)
    ));
  END IF;

  IF v_unrepresentable OR jsonb_array_length(v_blocks)=0 THEN
    UPDATE public.questions
    SET status=CASE WHEN status='approved' THEN 'needs_review'::review_status ELSE status END,
        updated_at=now()
    WHERE id=p_question_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.validation_findings vf
      WHERE vf.ref_table='questions' AND vf.ref_id=p_question_id
        AND vf.rule_code='structured_content_ingestion_unrepresentable'
        AND vf.resolved_at IS NULL
    ) THEN
      INSERT INTO public.validation_findings(rule_code,severity,ref_table,ref_id,message,details)
      VALUES(
        'structured_content_ingestion_unrepresentable','error','questions',p_question_id,
        'Source-backed question requires structured reconstruction before approval.',
        jsonb_build_object(
          'sourcePaperId',v_question.source_paper_id,
          'sourceSha256',lower(v_source.sha256),
          'qpPages',v_evidence->'qpPages',
          'canonicalVersion',1
        )
      );
    END IF;
    RETURN jsonb_build_object('questionId',p_question_id,'status','needs_structured_repair');
  END IF;

  PERFORM public.set_question_structured_content_v1(
    p_question_id,
    v_question.source_paper_id,
    lower(v_source.sha256),
    jsonb_build_object(
      'version',1,
      'source',jsonb_build_object('paperId',v_question.source_paper_id::text,'sha256',lower(v_source.sha256)),
      'blocks',v_blocks
    )
  );

  RETURN jsonb_build_object(
    'questionId',p_question_id,'status','structured','blockCount',jsonb_array_length(v_blocks)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.canonicalize_ingested_question_v1(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.canonicalize_ingested_question_v1(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.canonicalize_question_after_crosscheck_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
BEGIN
  IF NEW.ref_table='questions'
     AND NEW.checker_prompt_version='cross-check.v3'
     AND NEW.agrees=true
     AND NEW.source_evidence IS NOT NULL THEN
    PERFORM public.canonicalize_ingested_question_v1(NEW.ref_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS cross_checks_canonicalize_question_v1 ON public.cross_checks;
CREATE TRIGGER cross_checks_canonicalize_question_v1
AFTER INSERT ON public.cross_checks
FOR EACH ROW
EXECUTE FUNCTION public.canonicalize_question_after_crosscheck_v1();

-- Final commit-time invariant. Persist-paper is allowed to insert a candidate
-- before its cross-check row in the same transaction, but an approved QP leaf
-- may not escape the transaction without canonical content.
CREATE OR REPLACE FUNCTION public.enforce_approved_qp_structured_content_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public','pg_temp'
AS $function$
BEGIN
  IF NEW.marks IS NOT NULL
     AND NEW.status='approved'
     AND EXISTS(SELECT 1 FROM public.source_papers sp WHERE sp.id=NEW.source_paper_id AND sp.kind='QP')
     AND (NEW.content_json IS NULL OR NEW.content_version IS DISTINCT FROM 1) THEN
    RAISE EXCEPTION 'approved QP leaf requires source-backed structured content: %',NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS questions_approved_structured_gate_v1 ON public.questions;
CREATE CONSTRAINT TRIGGER questions_approved_structured_gate_v1
AFTER INSERT OR UPDATE OF status,content_json,content_version ON public.questions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.enforce_approved_qp_structured_content_v1();

REVOKE ALL ON FUNCTION public.canonicalize_question_after_crosscheck_v1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.enforce_approved_qp_structured_content_v1() FROM PUBLIC,anon,authenticated;
