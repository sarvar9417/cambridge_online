-- Preserve canonical detector evidence in the existing source-structure bootstrap.
--
-- v7 uses this only as a fail-closed fallback when the printed source cue lives
-- in shared parent context before the current leaf.  The stable bootstrap
-- version/action is retained for the existing OIDC runner contract.

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
    jsonb_agg(DISTINCT vf.rule_code ORDER BY vf.rule_code) rules,
    jsonb_object_agg(
      vf.rule_code,
      coalesce(vf.details,'{}'::jsonb)
      ORDER BY vf.rule_code
    ) rule_evidence
  FROM public.validation_findings vf
  JOIN public.questions q
    ON vf.ref_table='questions' AND vf.ref_id=q.id
  JOIN public.source_papers sp
    ON sp.id=q.source_paper_id AND sp.kind='QP'::paper_kind
  WHERE vf.resolved_at IS NULL
    AND vf.rule_code IN (
      'source_structure_required_but_missing_table',
      'source_structure_required_but_missing_layout',
      'source_visual_required_but_missing'
    )
    AND sp.source_url IS NOT NULL
    AND nullif(trim(coalesce(sp.sha256,'')),'') IS NOT NULL
  GROUP BY
    q.id,q.source_paper_id,q.path,q.display_ref,q.sort_order,
    q.stem_md,q.context_md,q.marks
),
target_papers AS (
  SELECT DISTINCT source_paper_id FROM target_rules
),
paper_leaves AS (
  SELECT
    q.source_paper_id,
    jsonb_agg(
      jsonb_build_object(
        'questionId',q.id,'path',q.path,'displayRef',q.display_ref,
        'marks',q.marks,'sortOrder',q.sort_order
      ) ORDER BY q.sort_order,q.id
    ) leaves
  FROM public.questions q
  JOIN target_papers tp ON tp.source_paper_id=q.source_paper_id
  WHERE q.marks IS NOT NULL
  GROUP BY q.source_paper_id
),
targets AS (
  SELECT
    source_paper_id,
    jsonb_agg(
      jsonb_build_object(
        'questionId',question_id,'path',path,'displayRef',display_ref,
        'marks',marks,'sortOrder',sort_order,
        'currentStem',stem_md,'currentContext',context_md,
        'rules',rules,'ruleEvidence',rule_evidence
      ) ORDER BY sort_order,question_id
    ) targets
  FROM target_rules
  GROUP BY source_paper_id
),
sources AS (
  SELECT
    sp.id source_paper_id,sp.source_url,sp.sha256 source_sha256,
    sy.code syllabus_code,c.number component,sp.variant,sp.series::text series,
    sp.year,pl.leaves,t.targets
  FROM target_papers tp
  JOIN public.source_papers sp ON sp.id=tp.source_paper_id
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id
  JOIN public.components c ON c.id=sp.component_id
  JOIN paper_leaves pl ON pl.source_paper_id=sp.id
  JOIN targets t ON t.source_paper_id=sp.id
)
SELECT jsonb_build_object(
  'version','source-structure-repair-bootstrap-v2',
  'questionCount',(SELECT count(*) FROM target_rules),
  'paperCount',(SELECT count(*) FROM sources),
  'sources',coalesce((
    SELECT jsonb_agg(
      jsonb_build_object(
        'sourcePaperId',source_paper_id,'sourceUrl',source_url,
        'sourceSha256',source_sha256,'syllabusCode',syllabus_code,
        'component',component,'variant',variant,'series',series,'year',year,
        'leaves',leaves,'targets',targets
      ) ORDER BY syllabus_code,year,series,component,variant
    )
    FROM sources
  ),'[]'::jsonb)
);
$function$;

REVOKE ALL ON FUNCTION public.source_structure_repair_bootstrap_v2()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.source_structure_repair_bootstrap_v2()
  TO service_role;
