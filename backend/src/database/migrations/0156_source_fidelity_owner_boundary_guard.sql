-- Fail closed when a canonical source-present structure belongs to shared/parent
-- question context rather than to the current leaf text segment.
--
-- Detector-v3 findings are created from canonical content_json adjacency. They
-- must never be cleared merely because a leaf-level PDF segment lacks the cue.
-- Such findings require an explicitly verified source asset. This guard keeps
-- the existing SHA/source/review-state contract and only narrows text-only rule
-- resolution for canonical detector evidence.

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
  v_blocked_rules text[] := ARRAY[]::text[];
BEGIN
  SELECT coalesce(array_agg(DISTINCT r.rule_code ORDER BY r.rule_code),ARRAY[]::text[])
  INTO v_blocked_rules
  FROM unnest(coalesce(p_resolve_rules,ARRAY[]::text[])) AS r(rule_code)
  JOIN public.validation_findings vf
    ON vf.ref_table='questions'
   AND vf.ref_id=p_question_id
   AND vf.rule_code=r.rule_code
   AND vf.resolved_at IS NULL
  WHERE vf.details->>'audit'='source-fidelity-detector-v3-canonical-adjacency';

  IF cardinality(v_blocked_rules)>0 THEN
    RAISE EXCEPTION 'canonical source structure cannot be resolved by text-boundary repair: %',
      array_to_string(v_blocked_rules,',')
      USING ERRCODE='22023';
  END IF;

  -- Run the existing SHA/source/asset guard with automatic status restoration
  -- disabled. Review-state restoration is decided below only after all errors
  -- are gone.
  SELECT public.repair_question_source_fidelity_v2(
    p_question_id,p_source_paper_id,p_expected_source_sha256,
    p_text,p_assets,p_resolve_rules,false
  ) INTO v_result;

  SELECT q.status,q.notes INTO v_status,v_notes
  FROM public.questions q WHERE q.id=p_question_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'question not found' USING ERRCODE='P0002';
  END IF;

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
    'ownerBoundaryGuard','canonical-source-assets-required-v1',
    'remainingErrors',v_remaining
  );
END
$function$;

REVOKE ALL ON FUNCTION public.repair_question_source_fidelity_guarded_v3(uuid,uuid,text,jsonb,jsonb,text[],boolean)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.repair_question_source_fidelity_guarded_v3(uuid,uuid,text,jsonb,jsonb,text[],boolean)
  TO service_role;
