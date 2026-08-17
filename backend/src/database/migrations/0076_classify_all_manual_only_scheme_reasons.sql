-- Ensure every source-backed manual_only scheme has an explicit safety reason.
-- This changes metadata only; mark points, groups and scoring semantics are untouched.

with x as (
 select ms.id,c.number component,coalesce(ms.guidance_md,'') g,
 case
  when c.number=4 then 'manual-practical-evidence-v1'
  when coalesce(ms.guidance_md,'') ~* '(full marks|normal scheme was not used|live series|award full)' then 'manual-live-series-full-mark-note-v1'
  when coalesce(ms.guidance_md,'') ~* '(karnaugh|k-map|flowchart|syntax diagram|trace table|merge sort|state transition|structure chart|shaded|outlined|screenshot|diagram)' then 'manual-spatial-trace-rubric-v1'
  when coalesce(ms.guidance_md,'') ~* '(alternative answer|alternative solution|either:|variation:|solution 1|solution 2|loop solution|selection solution)' then 'manual-mutually-exclusive-alternative-v1'
  when coalesce(ms.guidance_md,'') ~* '(one mark for every two|one mark per two|1 mark for every 2|1 mark per 2|two marks if .*one mark if)' then 'manual-threshold-count-rubric-v1'
  else 'manual-source-reviewed-deterministic-boundary-unsupported-v1'
 end reason
 from mark_schemes ms
 join questions q on q.id=ms.question_id
 join source_papers sp on sp.id=q.source_paper_id
 join components c on c.id=q.component_id
 where q.marks>0 and sp.source_url is not null
   and ms.scheme_type='manual_only'::scheme_type
   and coalesce(ms.prompt_version,'') !~ '^manual-'
)
update mark_schemes ms
set prompt_version=x.reason,updated_at=now()
from x where ms.id=x.id;
