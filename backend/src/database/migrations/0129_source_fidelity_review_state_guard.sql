-- Guard review state while repairing source fidelity.
--
-- A source-fidelity repair must never turn a question that was already in
-- needs_review for taxonomy/LO/manual review into approved. Only questions that
-- were approved immediately before the source-fidelity detector downgraded them
-- may have that approval restored automatically after an exact source repair.

CREATE OR REPLACE FUNCTION public.mark_source_fidelity_demotion_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public','pg_temp'
AS $function$
BEGIN
  IF OLD.status='approved'::review_status
     AND NEW.status='needs_review'::review_status
     AND EXISTS (
       SELECT 1 FROM public.validation_findings vf
       WHERE vf.ref_table='questions' AND vf.ref_id=OLD.id
         AND vf.resolved_at IS NULL AND vf.severity='error'
         AND vf.rule_code IN (
           'source_structure_required_but_missing_table',
           'source_structure_required_but_missing_layout',
           'source_visual_required_but_missing'
         )
     )
     AND coalesce(NEW.notes,'') NOT LIKE '%source-fidelity-detector-v2: demoted_from_approved%'
  THEN
    NEW.notes:=concat_ws(
      E'\n',nullif(NEW.notes,''),
      'source-fidelity-detector-v2: demoted_from_approved'
    );
  END IF;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS trg_mark_source_fidelity_demotion_v1 ON public.questions;
CREATE TRIGGER trg_mark_source_fidelity_demotion_v1
BEFORE UPDATE OF status ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.mark_source_fidelity_demotion_v1();

CREATE OR REPLACE FUNCTION public.repair_question_source_fidelity_guarded_v3(
  p_question_id uuid,
  p_source_paper_id uuid,
  p_expected_source_sha256 text,
  p_text jsonb DEFAULT '{}'::jsonb,
  p_assets jsonb DEFAULT '[]'::jsonb,
  p_resolve_rules text[] DEFAULT ARRAY[]::text[],
  p_restore_approval boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_result jsonb;
  v_status review_status;
  v_notes text;
  v_remaining integer;
  v_restored boolean := false;
BEGIN
  -- Always run the existing SHA/source/asset guard with automatic status
  -- restoration disabled. Review-state restoration is decided below.
  SELECT public.repair_question_source_fidelity_v2(
    p_question_id,p_source_paper_id,p_expected_source_sha256,
    p_text,p_assets,p_resolve_rules,false
  ) INTO v_result;

  SELECT q.status,q.notes INTO v_status,v_notes
  FROM public.questions q WHERE q.id=p_question_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'question not found'; END IF;

  SELECT count(*) INTO v_remaining
  FROM public.validation_findings vf
  WHERE vf.ref_table='questions' AND vf.ref_id=p_question_id
    AND vf.resolved_at IS NULL AND vf.severity='error';

  IF p_restore_approval
     AND v_status='needs_review'::review_status
     AND v_remaining=0
     AND coalesce(v_notes,'') LIKE '%source-fidelity-detector-v2: demoted_from_approved%'
  THEN
    UPDATE public.questions
    SET status='approved'::review_status,
        notes=concat_ws(
          E'\n',
          nullif(replace(coalesce(notes,''),'source-fidelity-detector-v2: demoted_from_approved',''),''),
          'source-fidelity-detector-v2: approval restored after SHA-verified source repair.'
        ),
        updated_at=now()
    WHERE id=p_question_id;
    v_restored:=true;
  END IF;

  RETURN coalesce(v_result,'{}'::jsonb) || jsonb_build_object(
    'approvalRestored',v_restored,
    'approvalGuard','source-fidelity-demotion-marker-v1',
    'remainingErrors',v_remaining
  );
END
$function$;

REVOKE ALL ON FUNCTION public.repair_question_source_fidelity_guarded_v3(uuid,uuid,text,jsonb,jsonb,text[],boolean)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.repair_question_source_fidelity_guarded_v3(uuid,uuid,text,jsonb,jsonb,text[],boolean)
  TO service_role;

-- Keep the runner's v2 manifest wire format stable, but route every row through
-- the guarded review-state implementation above.
CREATE OR REPLACE FUNCTION public.apply_source_structure_repair_manifest_v2(p_manifest jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_source_paper_id uuid;
  v_source_sha text;
  v_actual_sha text;
  v_rows jsonb;
  v_row jsonb;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
BEGIN
  IF p_manifest IS NULL OR jsonb_typeof(p_manifest)<>'object'
     OR p_manifest->>'version'<>'source-structure-repair-v2' THEN
    RAISE EXCEPTION 'invalid source structure repair manifest' USING ERRCODE='22023';
  END IF;

  v_source_paper_id := (p_manifest->>'sourcePaperId')::uuid;
  v_source_sha := lower(trim(coalesce(p_manifest->>'sourceSha256','')));
  v_rows := p_manifest->'rows';
  IF jsonb_typeof(v_rows)<>'array' OR jsonb_array_length(v_rows)=0 OR jsonb_array_length(v_rows)>80 THEN
    RAISE EXCEPTION 'repair manifest rows must contain 1..80 entries' USING ERRCODE='22023';
  END IF;

  SELECT lower(trim(coalesce(sha256,''))) INTO v_actual_sha
  FROM public.source_papers WHERE id=v_source_paper_id AND kind='QP'::paper_kind;
  IF NOT FOUND OR v_actual_sha='' OR v_actual_sha<>v_source_sha THEN
    RAISE EXCEPTION 'repair manifest source sha mismatch' USING ERRCODE='22023';
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(v_rows)
  LOOP
    IF jsonb_typeof(v_row)<>'object' OR nullif(v_row->>'questionId','') IS NULL THEN
      RAISE EXCEPTION 'invalid repair manifest row' USING ERRCODE='22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id=(v_row->>'questionId')::uuid AND q.source_paper_id=v_source_paper_id
    ) THEN
      RAISE EXCEPTION 'repair row question/source mismatch' USING ERRCODE='22023';
    END IF;

    SELECT public.repair_question_source_fidelity_guarded_v3(
      (v_row->>'questionId')::uuid,
      v_source_paper_id,
      v_source_sha,
      coalesce(v_row->'text','{}'::jsonb),
      coalesce(v_row->'assets','[]'::jsonb),
      ARRAY(SELECT jsonb_array_elements_text(coalesce(v_row->'resolveRules','[]'::jsonb))),
      coalesce((v_row->>'restoreApproval')::boolean,false)
    ) INTO v_result;
    v_results := v_results || jsonb_build_array(v_result);
  END LOOP;

  RETURN jsonb_build_object(
    'version','source-structure-repair-v2',
    'sourcePaperId',v_source_paper_id,
    'sourceSha256',v_actual_sha,
    'results',v_results
  );
END
$function$;

REVOKE ALL ON FUNCTION public.apply_source_structure_repair_manifest_v2(jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_source_structure_repair_manifest_v2(jsonb)
  TO service_role;
