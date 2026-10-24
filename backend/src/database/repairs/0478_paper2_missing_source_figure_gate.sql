-- Fail closed on three already-approved 0478 Paper 2 stems needing
-- actual INPUT diagrams/symbols. Does not invent pictures or auto-approve.
-- These findings keep unresolved visuals out of source-verified live questions.
WITH expected(display_ref, cue) AS (
  VALUES
  ('0478/21/M/J/26 Q8(a)','Consider the logic circuit'),
  ('0478/21/O/N/23 Q7(a)','Consider this logic circuit'),
  ('0478/22/O/N/24 Q3(a)','Four flowchart symbols')
),
verified AS MATERIALIZED (
 SELECT q.id,q.display_ref,sp.source_url,sp.sha256,
        q.content_json->'blocks'->0->'source'->>'page' page
 FROM expected e
 JOIN public.questions q ON q.display_ref=e.display_ref AND q.marks>0
 JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
 JOIN public.syllabi sy ON sy.id=sp.syllabus_id AND sy.code='0478'
 JOIN public.components c ON c.id=sp.component_id AND c.number=2
 WHERE q.content_json->'source'->>'paperId'=sp.id::text
   AND q.content_json->'source'->>'sha256'=sp.sha256
   AND q.content_json::text ilike '%'||replace(e.cue,' ','%')||'%'
   AND NOT EXISTS (SELECT 1 FROM public.question_assets a WHERE a.question_id=q.id)
   AND NOT EXISTS (
     WITH RECURSIVE anc(id,parent_id) AS (
       SELECT p.id,p.parent_id FROM public.questions p WHERE p.id=q.id
       UNION ALL SELECT p.id,p.parent_id FROM public.questions p JOIN anc x ON x.parent_id=p.id
     ) SELECT 1 FROM anc x JOIN public.question_assets a ON a.question_id=x.id
   )
   AND NOT EXISTS (
     SELECT 1 FROM public.validation_findings vf WHERE vf.ref_table='questions'
       AND vf.ref_id=q.id AND vf.rule_code='source_visual_required_but_missing'
       AND vf.resolved_at IS NULL
   )
), flagged AS (
 INSERT INTO public.validation_findings
   (rule_code,severity,ref_table,ref_id,message,details)
 SELECT 'source_visual_required_but_missing','error','questions',v.id,
 '0478 Paper 2 original source input figure is required: verify page crop and attach exact source asset.',
 jsonb_build_object('paper',v.display_ref,'source_url',v.source_url,
                    'source_page',v.page,'source_sha256',v.sha256,
                    'detector','0478_paper2_source_visual_audit_2026_10_14')
 FROM verified v RETURNING id
)
SELECT (SELECT count(*) FROM verified) matched_source_diagram,
       (SELECT count(*) FROM flagged) new_blocking_findings;