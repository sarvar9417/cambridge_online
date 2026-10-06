-- Reconcile source-visual detector v6 with source-backed semantic tables.
--
-- A Cambridge diagram can be represented canonically by a semantic table (for
-- example a stack, queue or linked-list state). Historical v1 structured
-- content may also label that table asset as `image`. Both cases are faithful
-- when the asset is backed by storage, SVG or semantic table content.
-- Keep the detector fail-closed for flattened prose while preventing those
-- valid table representations from being demoted.

CREATE OR REPLACE FUNCTION public.flag_source_fidelity_requirements_v6(
  p_syllabus_code text,p_year int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  v_base jsonb; v_added integer:=0; v_demoted integer:=0;
BEGIN
  IF p_syllabus_code NOT IN ('0478','9618') THEN
    RAISE EXCEPTION 'unsupported_syllabus:%',p_syllabus_code;
  END IF;
  IF p_year<2015 OR p_year>2035 THEN
    RAISE EXCEPTION 'invalid_year:%',p_year;
  END IF;

  v_base:=public.flag_source_fidelity_requirements_v5(p_syllabus_code,p_year);

  CREATE TEMP TABLE _source_visual_gap_v6(
    question_id uuid PRIMARY KEY,display_ref text NOT NULL,cue text NOT NULL,cue_ordinal bigint NOT NULL
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
    FROM jsonb_array_elements(c.content_json->'blocks') WITH ORDINALITY nxt(block,ordinality)
    LEFT JOIN public.question_assets qa ON qa.id::text=nxt.block->>'assetId'
    WHERE nxt.ordinality=c.cue_ordinal+1
      AND (
        nxt.block->>'type'='table'
        OR (
          nxt.block->>'type'='asset'
          AND qa.kind='table'
          AND (
            nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
            OR nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL
            OR coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
          )
        )
        OR (
          nxt.block->>'type'='asset'
          AND nxt.block->>'kind' IN ('diagram','image','flowchart','logic_circuit')
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
  SELECT 'source_visual_required_but_missing','error','questions',g.question_id,
    'Canonical source text says a printed visual is present, but the next canonical block is not a source-faithful visual/structured representation.',
    jsonb_build_object(
      'displayRef',g.display_ref,'cue',g.cue,'cueOrdinal',g.cue_ordinal,
      'audit','source-fidelity-detector-v6-visual-adjacency',
      'detectorVersion','v6','syllabusCode',p_syllabus_code,'year',p_year
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
          'source-fidelity-detector-v6: printed-visual cue is missing an adjacent source-faithful representation.')
      END,
      updated_at=now()
  WHERE q.status='approved'::review_status
    AND EXISTS(SELECT 1 FROM _source_visual_gap_v6 g WHERE g.question_id=q.id);
  GET DIAGNOSTICS v_demoted=ROW_COUNT;

  RETURN jsonb_build_object(
    'version','source-fidelity-detector-v6',
    'syllabusCode',p_syllabus_code,'year',p_year,'baseV5',v_base,
    'visualAdjacencyGaps',coalesce((SELECT count(*) FROM _source_visual_gap_v6),0),
    'findingsAdded',v_added,'approvedDemoted',v_demoted
  );
END
$function$;

-- Resolve only findings created by the first v6 pass that the corrected rule
-- now proves complete.
WITH candidate_findings AS (
  SELECT vf.id finding_id,q.id question_id,q.content_json,
         (vf.details->>'cueOrdinal')::bigint cue_ordinal
  FROM public.validation_findings vf
  JOIN public.questions q ON q.id=vf.ref_id
  WHERE vf.ref_table='questions'
    AND vf.resolved_at IS NULL
    AND vf.details->>'audit'='source-fidelity-detector-v6-visual-adjacency'
), now_complete AS (
  SELECT c.finding_id,c.question_id
  FROM candidate_findings c
  WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(c.content_json->'blocks') WITH ORDINALITY nxt(block,ordinality)
    LEFT JOIN public.question_assets qa ON qa.id::text=nxt.block->>'assetId'
    WHERE nxt.ordinality=c.cue_ordinal+1
      AND (
        nxt.block->>'type'='table'
        OR (
          nxt.block->>'type'='asset'
          AND qa.kind='table'
          AND (
            nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
            OR nullif(btrim(coalesce(qa.content_md,'')),'') IS NOT NULL
            OR coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
          )
        )
        OR (
          nxt.block->>'type'='asset'
          AND nxt.block->>'kind' IN ('diagram','image','flowchart','logic_circuit')
          AND qa.kind IN ('diagram','image')
          AND (
            nullif(btrim(coalesce(qa.storage_path,'')),'') IS NOT NULL
            OR coalesce(qa.content_md,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
            OR coalesce(qa.svg_markup,'') ~* '^[[:space:]]*(<[?]xml[^>]*[?]>[[:space:]]*)?<svg([[:space:]]|>)'
          )
        )
      )
  )
)
UPDATE public.validation_findings vf
SET resolved_at=now(),
    resolution='v6 semantic-table reconciliation: adjacent structured/source-backed table or legacy image-shaped table asset satisfies the printed visual cue.'
FROM now_complete c
WHERE vf.id=c.finding_id;

-- Restore only rows that v6 itself demoted and that have no other unresolved
-- error. Other source-fidelity gates remain authoritative.
WITH restorable AS (
  SELECT q.id
  FROM public.questions q
  WHERE q.status='needs_review'::review_status
    AND coalesce(q.notes,'') LIKE '%source-fidelity-detector-v6: printed-visual cue is missing an adjacent source-faithful representation.%'
    AND NOT EXISTS (
      SELECT 1 FROM public.validation_findings vf
      WHERE vf.ref_table='questions' AND vf.ref_id=q.id
        AND vf.resolved_at IS NULL AND vf.severity='error'
    )
)
UPDATE public.questions q
SET status='approved'::review_status,
    notes=concat_ws(
      E'\n',
      nullif(replace(coalesce(q.notes,''),
        'source-fidelity-detector-v6: printed-visual cue is missing an adjacent source-faithful representation.',''),''),
      'source-fidelity-detector-v6-reconcile: approval restored after verified semantic-table/source visual reconciliation.'
    ),
    updated_at=now()
FROM restorable r
WHERE q.id=r.id;
