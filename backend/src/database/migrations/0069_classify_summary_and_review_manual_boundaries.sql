-- Classify wrappers where source summaries/manual maps do not preserve atomic mark boundaries,
-- plus 2025 source-review items whose retained boundary is spatial or summary-only.

update mark_schemes ms
set prompt_version='manual-source-summary-needs-raw-ms-v1',updated_at=now()
from questions q join components c on c.id=q.component_id
where ms.question_id=q.id and q.marks>0 and c.number in (1,2)
  and ms.max_marks>1 and (select count(*) from mark_scheme_points p where p.mark_scheme_id=ms.id)=1
  and ms.scheme_type='manual_only'::scheme_type and ms.prompt_version='source-backed-batch-v1';

update mark_schemes ms
set prompt_version='manual-source-map-needs-raw-ms-v1',updated_at=now()
from questions q join components c on c.id=q.component_id
where ms.question_id=q.id and q.marks>0 and c.number in (1,2)
  and ms.max_marks>1 and (select count(*) from mark_scheme_points p where p.mark_scheme_id=ms.id)=1
  and ms.scheme_type='manual_only'::scheme_type and ms.prompt_version='source-backed-manual-map-v1';

with x(year,series,component,variant,path,reason) as (values
(2025,'ON',2,1,'1.a','manual-source-summary-needs-raw-ms-v1'),(2025,'ON',2,1,'1.b','manual-source-summary-needs-raw-ms-v1'),(2025,'ON',2,1,'2','manual-spatial-rubric-v1'),(2025,'ON',2,1,'6.a','manual-source-summary-needs-raw-ms-v1'),(2025,'ON',2,1,'7.b','manual-spatial-rubric-v1'),(2025,'ON',2,3,'5.a','manual-spatial-trace-rubric-v1'),(2025,'ON',2,3,'7.b','manual-spatial-rubric-v1'),
(2025,'ON',3,1,'2.a','manual-source-summary-needs-raw-ms-v1'),(2025,'ON',3,1,'2.b','manual-source-summary-needs-raw-ms-v1'),(2025,'ON',3,1,'8.c','manual-spatial-trace-rubric-v1')
),r as(
 select x.*,ms.id msid from x join source_papers sp on sp.year=x.year and sp.series::text=x.series and sp.variant=x.variant and sp.kind='QP'::paper_kind
 join components c on c.id=sp.component_id and c.number=x.component join questions q on q.source_paper_id=sp.id and q.path=x.path join mark_schemes ms on ms.question_id=q.id
 where ms.prompt_version='chatgpt-source-review-v2' and (select count(*) from mark_scheme_points p where p.mark_scheme_id=ms.id)=1
)
update mark_schemes ms set prompt_version=r.reason,updated_at=now() from r where ms.id=r.msid;
