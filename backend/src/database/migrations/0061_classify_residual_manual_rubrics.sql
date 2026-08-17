-- Classify source-explicit manual rubric reasons without changing their scoring semantics.
-- This prevents spatial, mutually-exclusive and underlining-dependent wrappers from being mistaken for deterministic-ready rubrics.

with w as (
 select ms.id,
 case
   when ms.guidance_md ~* '(karnaugh|k-map|one mark per ring|correct loop|diagram is spatial|state-transition diagram is spatial)' then 'manual-spatial-rubric-v1'
   when ms.guidance_md ~* '(alternative answer|alternative solution|^.*alternative:|either:|variation:)' then 'manual-mutually-exclusive-alternative-v1'
   when ms.guidance_md ~* '(underlined term|underlined part|each underlined|underlining)' then 'manual-underlining-dependent-v1'
   else null end reason
 from mark_schemes ms
 join questions q on q.id=ms.question_id
 join components c on c.id=q.component_id
 where q.marks>0 and c.number<=3 and ms.max_marks>1
   and (select count(*) from mark_scheme_points p where p.mark_scheme_id=ms.id)=1
   and ms.scheme_type='manual_only'::scheme_type
   and coalesce(ms.prompt_version,'') !~ '^manual-(spatial|mutually|underlining|extraction|practical)'
)
update mark_schemes ms
set prompt_version=w.reason,updated_at=now()
from w where ms.id=w.id and w.reason is not null;
