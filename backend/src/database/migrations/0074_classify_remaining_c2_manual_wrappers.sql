-- Classify final raw Component 2 wrappers by the reason deterministic normalization is unsafe.
-- No scoring semantics are changed.
with w as (
 select ms.id,ms.guidance_md
 from mark_schemes ms
 join questions q on q.id=ms.question_id
 join components c on c.id=q.component_id
 where q.marks>0 and c.number=2 and ms.max_marks>1
   and (select count(*) from mark_scheme_points p where p.mark_scheme_id=ms.id)=1
   and ms.scheme_type='manual_only'::scheme_type
   and ms.prompt_version='source-backed-oidc-backfill-v1'
),classified as (
 select id,case
  when guidance_md ~* '(flowchart|syntax diagram|trace table|merge sort|state transition|structure chart|shaded|outlined)' then 'manual-spatial-trace-rubric-v1'
  when guidance_md ~* '(alternative answer|alternative solution|either:|loop solution|selection solution|solution 1|solution 2)' then 'manual-mutually-exclusive-alternative-v1'
  when guidance_md ~* '(max [0-9]+ if .*heading|maximum [0-9]+ if .*heading|max [0-9]+ if .*declaration|maximum [0-9]+ if .*declaration)' then 'manual-conditional-global-cap-v1'
  when guidance_md ~* '(underlined|emboldened|highlighted)' then 'manual-formatting-dependent-v1'
  when guidance_md ~* '(correctly completed line|correct line of pseudocode|correct blanks|correct boxes|complete the pseudocode)' then 'manual-code-completion-needs-qp-blanks-v1'
  when guidance_md ~* '(one mark for every two|one mark per two|1 mark for every 2|1 mark per 2)' then 'manual-threshold-count-rubric-v1'
  when guidance_md ~* '(one mark per row|one mark for each row)' then 'manual-source-table-rows-incomplete-v1'
  else 'manual-source-boundary-needs-qp-ms-review-v1' end reason
 from w
)
update mark_schemes ms
set prompt_version=classified.reason,updated_at=now()
from classified where ms.id=classified.id;
