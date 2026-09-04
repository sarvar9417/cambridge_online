-- Replay-safe source-fidelity repair contract for flattened Cambridge QP structures.
--
-- Production already exercised these service-role-only functions while resolving
-- the final source-fidelity backlog. This migration gives main a clean, ordered
-- representation of that contract after the historical repair branch diverged.
-- It performs no corpus-wide audit or status rewrite by itself.

CREATE OR REPLACE FUNCTION public.repair_question_source_fidelity_v2(
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
  v_actual_source_paper_id uuid;
  v_actual_sha256 text;
  v_source_kind text;
  v_old_status review_status;
  v_old_stem text;
  v_old_context text;
  v_display_ref text;
  v_new_stem text;
  v_new_context text;
  v_old_hash text;
  v_new_hash text;
  v_text_changed boolean := false;
  v_asset jsonb;
  v_asset_result jsonb;
  v_asset_results jsonb := '[]'::jsonb;
  v_rule text;
  v_resolved_by_text text[] := ARRAY[]::text[];
  v_remaining_errors integer;
  v_restored boolean := false;
BEGIN
  IF p_text IS NULL OR jsonb_typeof(p_text) <> 'object' THEN
    RAISE EXCEPTION 'text payload must be a JSON object' USING ERRCODE='22023';
  END IF;
  IF p_assets IS NULL OR jsonb_typeof(p_assets) <> 'array' THEN
    RAISE EXCEPTION 'assets payload must be a JSON array' USING ERRCODE='22023';
  END IF;
  IF jsonb_array_length(p_assets) > 6 THEN
    RAISE EXCEPTION 'too many repair assets' USING ERRCODE='22023';
  END IF;

  SELECT q.source_paper_id,sp.sha256,sp.kind::text,q.status,q.stem_md,q.context_md,q.display_ref
  INTO v_actual_source_paper_id,v_actual_sha256,v_source_kind,v_old_status,v_old_stem,v_old_context,v_display_ref
  FROM questions q
  JOIN source_papers sp ON sp.id=q.source_paper_id
  WHERE q.id=p_question_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'question not found' USING ERRCODE='P0002';
  END IF;
  IF v_source_kind <> 'QP' THEN
    RAISE EXCEPTION 'source fidelity repair is restricted to QP questions' USING ERRCODE='22023';
  END IF;
  IF v_actual_source_paper_id <> p_source_paper_id THEN
    RAISE EXCEPTION 'source paper does not match question' USING ERRCODE='22023';
  END IF;
  IF nullif(trim(coalesce(v_actual_sha256,'')),'') IS NULL
     OR lower(trim(v_actual_sha256)) <> lower(trim(coalesce(p_expected_source_sha256,''))) THEN
    RAISE EXCEPTION 'source sha256 mismatch' USING ERRCODE='22023';
  END IF;

  v_new_stem := v_old_stem;
  v_new_context := v_old_context;

  IF p_text ? 'stemMd' THEN
    v_new_stem := nullif(trim(p_text->>'stemMd'),'');
    IF v_new_stem IS NULL THEN
      RAISE EXCEPTION 'source repaired stemMd must be non-empty' USING ERRCODE='22023';
    END IF;
    IF length(v_new_stem) > 20000 THEN
      RAISE EXCEPTION 'source repaired stemMd is too large' USING ERRCODE='22023';
    END IF;
    IF v_new_stem ~* 'DO[[:space:]]+NOT[[:space:]]+WRITE[[:space:]]+IN[[:space:]]+THIS[[:space:]]+MARGIN' THEN
      RAISE EXCEPTION 'source repaired stemMd still contains margin artefact' USING ERRCODE='22023';
    END IF;
  END IF;

  IF p_text ? 'contextMd' THEN
    v_new_context := CASE WHEN jsonb_typeof(p_text->'contextMd')='null' THEN NULL ELSE nullif(trim(p_text->>'contextMd'),'') END;
    IF length(coalesce(v_new_context,'')) > 30000 THEN
      RAISE EXCEPTION 'source repaired contextMd is too large' USING ERRCODE='22023';
    END IF;
    IF coalesce(v_new_context,'') ~* 'DO[[:space:]]+NOT[[:space:]]+WRITE[[:space:]]+IN[[:space:]]+THIS[[:space:]]+MARGIN' THEN
      RAISE EXCEPTION 'source repaired contextMd still contains margin artefact' USING ERRCODE='22023';
    END IF;
  END IF;

  v_text_changed := v_new_stem IS DISTINCT FROM v_old_stem OR v_new_context IS DISTINCT FROM v_old_context;
  IF v_text_changed THEN
    v_old_hash := md5(coalesce(v_old_stem,'') || chr(31) || coalesce(v_old_context,'') || chr(31) || coalesce(v_display_ref,''));
    v_new_hash := md5(coalesce(v_new_stem,'') || chr(31) || coalesce(v_new_context,'') || chr(31) || coalesce(v_display_ref,''));

    INSERT INTO question_source_repair_history(
      question_id,source_paper_id,repair_tag,source_sha256,old_hash,new_hash,
      old_stem_md,old_context_md,old_display_ref,new_stem_md,new_context_md,new_display_ref
    ) VALUES (
      p_question_id,p_source_paper_id,'source-fidelity-repair-v2',v_actual_sha256,v_old_hash,v_new_hash,
      v_old_stem,v_old_context,v_display_ref,v_new_stem,v_new_context,v_display_ref
    );

    UPDATE questions
    SET stem_md=v_new_stem,context_md=v_new_context,updated_at=now()
    WHERE id=p_question_id;
  END IF;

  FOR v_asset IN SELECT value FROM jsonb_array_elements(p_assets)
  LOOP
    SELECT public.repair_question_source_asset_v1(
      p_question_id,p_source_paper_id,v_actual_sha256,v_asset,false
    ) INTO v_asset_result;
    v_asset_results := v_asset_results || jsonb_build_array(v_asset_result);
  END LOOP;

  FOREACH v_rule IN ARRAY coalesce(p_resolve_rules,ARRAY[]::text[])
  LOOP
    IF v_rule NOT IN (
      'source_structure_required_but_missing_table',
      'source_structure_required_but_missing_layout',
      'source_visual_required_but_missing'
    ) THEN
      RAISE EXCEPTION 'unsupported source-fidelity rule resolution: %',v_rule USING ERRCODE='22023';
    END IF;

    UPDATE validation_findings
    SET resolved_at=now(),
        resolution=concat('Resolved by source-verified text-boundary repair from source SHA-256 ',v_actual_sha256,'.')
    WHERE ref_table='questions'
      AND ref_id=p_question_id
      AND rule_code=v_rule
      AND resolved_at IS NULL;
    IF FOUND THEN
      v_resolved_by_text := array_append(v_resolved_by_text,v_rule);
    END IF;
  END LOOP;

  SELECT count(*) INTO v_remaining_errors
  FROM validation_findings vf
  WHERE vf.ref_table='questions'
    AND vf.ref_id=p_question_id
    AND vf.resolved_at IS NULL
    AND vf.severity::text='error';

  IF p_restore_approval AND v_old_status='needs_review' AND v_remaining_errors=0 THEN
    UPDATE questions
    SET status='approved'::review_status,updated_at=now()
    WHERE id=p_question_id;
    v_restored := true;
  END IF;

  RETURN jsonb_build_object(
    'questionId',p_question_id,
    'sourceVerified',true,
    'textChanged',v_text_changed,
    'assets',v_asset_results,
    'resolvedByText',to_jsonb(v_resolved_by_text),
    'remainingErrors',v_remaining_errors,
    'approvalRestored',v_restored
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.repair_question_source_fidelity_v2(uuid,uuid,text,jsonb,jsonb,text[],boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.repair_question_source_fidelity_v2(uuid,uuid,text,jsonb,jsonb,text[],boolean) TO service_role;

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
  FROM source_papers WHERE id=v_source_paper_id AND kind='QP';
  IF NOT FOUND OR v_actual_sha='' OR v_actual_sha<>v_source_sha THEN
    RAISE EXCEPTION 'repair manifest source sha mismatch' USING ERRCODE='22023';
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(v_rows)
  LOOP
    IF jsonb_typeof(v_row)<>'object' OR nullif(v_row->>'questionId','') IS NULL THEN
      RAISE EXCEPTION 'invalid repair manifest row' USING ERRCODE='22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM questions q
      WHERE q.id=(v_row->>'questionId')::uuid AND q.source_paper_id=v_source_paper_id
    ) THEN
      RAISE EXCEPTION 'repair row question/source mismatch' USING ERRCODE='22023';
    END IF;

    SELECT public.repair_question_source_fidelity_v2(
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
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_source_structure_repair_manifest_v2(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_source_structure_repair_manifest_v2(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.source_structure_repair_bootstrap_v2()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
WITH target_rules AS (
  SELECT
    q.id question_id,q.source_paper_id,q.path,q.display_ref,q.sort_order,
    q.stem_md,q.context_md,q.marks,
    jsonb_agg(DISTINCT vf.rule_code ORDER BY vf.rule_code) rules
  FROM validation_findings vf
  JOIN questions q ON vf.ref_table='questions' AND vf.ref_id=q.id
  JOIN source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
  WHERE vf.resolved_at IS NULL
    AND vf.rule_code IN (
      'source_structure_required_but_missing_table',
      'source_structure_required_but_missing_layout',
      'source_visual_required_but_missing'
    )
    AND sp.source_url IS NOT NULL
    AND nullif(trim(coalesce(sp.sha256,'')),'') IS NOT NULL
  GROUP BY q.id,q.source_paper_id,q.path,q.display_ref,q.sort_order,q.stem_md,q.context_md,q.marks
), target_papers AS (
  SELECT DISTINCT source_paper_id FROM target_rules
), paper_leaves AS (
  SELECT q.source_paper_id,
    jsonb_agg(jsonb_build_object(
      'questionId',q.id,'path',q.path,'displayRef',q.display_ref,'marks',q.marks,'sortOrder',q.sort_order
    ) ORDER BY q.sort_order,q.id) leaves
  FROM questions q
  JOIN target_papers tp ON tp.source_paper_id=q.source_paper_id
  WHERE q.marks IS NOT NULL
  GROUP BY q.source_paper_id
), targets AS (
  SELECT source_paper_id,
    jsonb_agg(jsonb_build_object(
      'questionId',question_id,'path',path,'displayRef',display_ref,'marks',marks,
      'sortOrder',sort_order,'currentStem',stem_md,'currentContext',context_md,'rules',rules
    ) ORDER BY sort_order,question_id) targets
  FROM target_rules GROUP BY source_paper_id
), sources AS (
  SELECT sp.id source_paper_id,sp.source_url,sp.sha256 source_sha256,
         sy.code syllabus_code,c.number component,sp.variant,sp.series::text series,sp.year,
         pl.leaves,t.targets
  FROM target_papers tp
  JOIN source_papers sp ON sp.id=tp.source_paper_id
  JOIN syllabi sy ON sy.id=sp.syllabus_id
  JOIN components c ON c.id=sp.component_id
  JOIN paper_leaves pl ON pl.source_paper_id=sp.id
  JOIN targets t ON t.source_paper_id=sp.id
)
SELECT jsonb_build_object(
  'version','source-structure-repair-bootstrap-v2',
  'questionCount',(SELECT count(*) FROM target_rules),
  'paperCount',(SELECT count(*) FROM sources),
  'sources',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'sourcePaperId',source_paper_id,'sourceUrl',source_url,'sourceSha256',source_sha256,
    'syllabusCode',syllabus_code,'component',component,'variant',variant,'series',series,'year',year,
    'leaves',leaves,'targets',targets
  ) ORDER BY syllabus_code,year,series,component,variant) FROM sources),'[]'::jsonb)
);
$function$;

REVOKE ALL ON FUNCTION public.source_structure_repair_bootstrap_v2() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.source_structure_repair_bootstrap_v2() TO service_role;
