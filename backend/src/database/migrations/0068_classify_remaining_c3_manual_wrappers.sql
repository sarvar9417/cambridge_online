-- Classify the final raw C3 wrappers by the exact reason atomic normalization is unsafe.
-- No scoring semantics are changed.

create temp table t68(year int,series text,variant int,path text,reason text) on commit drop;
insert into t68 values
(2021,'MJ',1,'3.a','manual-source-extraction-incomplete-v1'),(2021,'MJ',2,'3.a','manual-source-extraction-incomplete-v1'),(2021,'MJ',3,'3.a','manual-source-extraction-incomplete-v1'),
(2021,'ON',1,'2','manual-matching-layout-needs-source-v1'),(2021,'ON',2,'2','manual-matching-layout-needs-source-v1'),(2021,'ON',1,'7.a','manual-threshold-count-rubric-v1'),(2021,'ON',2,'7.a','manual-threshold-count-rubric-v1'),
(2022,'MJ',1,'1.b.ii','manual-unsplit-mark-boundary-v1'),(2022,'MJ',3,'1.b.ii','manual-unsplit-mark-boundary-v1'),(2022,'MJ',1,'5.b.i','manual-spatial-rubric-v1'),(2022,'MJ',3,'5.b.i','manual-spatial-rubric-v1'),(2022,'MJ',2,'4.c.i','manual-spatial-rubric-v1'),(2022,'MJ',2,'4.c.ii','manual-mutually-exclusive-alternative-v1'),
(2022,'ON',1,'4','manual-source-extraction-incomplete-v1'),(2022,'ON',3,'4','manual-source-extraction-incomplete-v1'),(2022,'ON',2,'11.b','manual-code-completion-needs-qp-blanks-v1'),(2022,'ON',2,'3.b','manual-matching-layout-needs-source-v1'),
(2023,'MJ',1,'11.b','manual-code-completion-needs-qp-blanks-v1'),(2023,'MJ',3,'11.b','manual-code-completion-needs-qp-blanks-v1'),(2023,'MJ',1,'2.a','manual-matching-layout-needs-source-v1'),(2023,'MJ',3,'2.a','manual-matching-layout-needs-source-v1'),(2023,'MJ',2,'11.a.ii','manual-code-completion-needs-qp-blanks-v1'),(2023,'MJ',2,'6.b','manual-code-completion-needs-qp-blanks-v1'),
(2023,'ON',1,'10.b','manual-code-completion-needs-qp-blanks-v1'),(2023,'ON',3,'10.b','manual-code-completion-needs-qp-blanks-v1'),(2023,'ON',1,'8.a','manual-code-completion-needs-qp-blanks-v1'),(2023,'ON',3,'8.a','manual-code-completion-needs-qp-blanks-v1'),(2023,'ON',2,'12.b','manual-code-completion-needs-qp-blanks-v1'),(2023,'ON',2,'4','manual-blank-boundary-needs-qp-v1'),(2023,'ON',2,'9.a.ii','manual-code-completion-needs-qp-blanks-v1'),
(2024,'ON',1,'11.c','manual-code-completion-needs-qp-rows-v1'),(2024,'ON',2,'11.c','manual-code-completion-needs-qp-rows-v1'),(2024,'ON',3,'11.c','manual-code-completion-needs-qp-rows-v1'),(2024,'ON',2,'3.b','manual-spatial-shading-rubric-v1');

with r as (
 select t.*,ms.id msid
 from t68 t
 join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
 join components c on c.id=sp.component_id and c.number=3
 join questions q on q.source_paper_id=sp.id and q.path=t.path and q.marks>0
 join mark_schemes ms on ms.question_id=q.id
 where ms.scheme_type='manual_only'::scheme_type
   and ms.prompt_version='source-backed-oidc-backfill-v1'
   and (select count(*) from mark_scheme_points p where p.mark_scheme_id=ms.id)=1
)
update mark_schemes ms
set prompt_version=r.reason,updated_at=now()
from r where ms.id=r.msid;
