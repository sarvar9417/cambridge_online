-- Classify residual Component 3 wrappers that cannot yet be safely normalized.
-- No scoring semantics are changed here.

with c3 as (
 select ms.id,ms.prompt_version,ms.guidance_md
 from mark_schemes ms
 join questions q on q.id=ms.question_id
 join components c on c.id=q.component_id
 where q.marks>0 and c.number=3 and ms.max_marks>1
   and (select count(*) from mark_scheme_points p where p.mark_scheme_id=ms.id)=1
   and ms.scheme_type='manual_only'::scheme_type
), classified as (
 select id, case
  when prompt_version='source-backed-batch-v1' then 'manual-source-summary-needs-raw-ms-v1'
  when guidance_md ~* '(one mark (for|per) every two|one mark for every shaded block)' then 'manual-threshold-count-rubric-v1'
  when guidance_md ~* 'two marks if (no errors|all correct).*one mark if (one error|only one error)' then 'manual-spatial-accuracy-rubric-v1'
  when prompt_version='source-backed-manual-map-v1' then 'manual-source-map-needs-raw-ms-v1'
  else null end reason
 from c3
)
update mark_schemes ms
set prompt_version=classified.reason,updated_at=now()
from classified
where ms.id=classified.id and classified.reason is not null;
