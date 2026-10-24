-- 0478 Paper 2: exactly source-evidenced response-type corrections.
-- These are NOT missing figures: their existing "table" kind came from contextual
-- words like "table" or "flowchart". Preserve marks, provenance, status and text.
WITH decisions(display_ref, new_kind, source_anchor) AS (
  VALUES
   ('0478/22/M/J/26 Q9(b)','code','Complete the structured query language'),
   ('0478/22/M/J/26 Q9(c)','text','Describe one reason'),
   ('0478/21/O/N/19 Q4(b)','text','Give the purpose of the algorithm'),
   ('0478/22/O/N/19 Q3(b)(i)','text','State the change required to the algorithm'),
   ('0478/22/O/N/19 Q3(b)(ii)','text','Explain how the algorithm'),
   ('0478/22/O/N/17 Q5(b)','text','State the changes that need to be made'),
   ('0478/21/M/J/15 Q6','text','Identify three different loop structures'),
   ('0478/22/M/J/15 Q3(b)','text','State the purpose of the flowchart'),
   ('0478/22/M/J/15 Q3(c)','text','Identify a problem with this flowchart'),
   ('0478/23/M/J/15 Q6','text','Identify three different loop structures')
),
eligible AS MATERIALIZED (
  SELECT q.id, q.display_ref,q.answer_kind::text old_kind,d.new_kind,sp.sha256
  FROM decisions d
  JOIN public.questions q ON q.display_ref=d.display_ref AND q.answer_kind::text='table'
  JOIN public.source_papers sp ON sp.id=q.source_paper_id AND sp.kind='QP'
  JOIN public.syllabi sy ON sy.id=sp.syllabus_id AND sy.code='0478'
  JOIN public.components c ON c.id=sp.component_id AND c.number=2
  WHERE q.marks>0
    AND q.content_json->'source'->>'paperId'=sp.id::text
    AND q.content_json->'source'->>'sha256'=sp.sha256
    AND q.content_json::text ilike '%'||replace(d.source_anchor,' ','%')||'%'
    AND NOT EXISTS (
      SELECT 1 FROM public.audit_log al WHERE al.ref_table='questions' AND al.ref_id=q.id
        AND al.action='0478_paper2_source_verified_answer_kind_repair'
    )
),
log AS (
  INSERT INTO public.audit_log(action,ref_table,ref_id,before,after)
  SELECT '0478_paper2_source_verified_answer_kind_repair','questions',e.id,
         jsonb_build_object('answer_kind',e.old_kind,'display_ref',e.display_ref),
         jsonb_build_object('answer_kind',e.new_kind,'display_ref',e.display_ref,'qp_sha256',e.sha256)
  FROM eligible e RETURNING ref_id
),
updated AS (
 UPDATE public.questions q
 SET answer_kind=e.new_kind::answer_kind, updated_at=now()
 FROM eligible e JOIN log l ON l.ref_id=e.id
 WHERE q.id=e.id AND q.answer_kind::text=e.old_kind
 RETURNING q.id
)
SELECT (SELECT count(*) FROM decisions) planned,
       (SELECT count(*) FROM eligible) source_matched,
       (SELECT count(*) FROM log) logged,
       (SELECT count(*) FROM updated) updated;