-- Classify final raw C1 wrappers by the exact reason deterministic normalization is unsafe.
-- No scoring semantics are changed.
create temp table t71(year int,series text,variant int,path text,reason text) on commit drop;
insert into t71 values
(2021,'MJ',2,'2.c','manual-matching-layout-needs-source-v1'),(2021,'MJ',2,'3.a','manual-spatial-rubric-v1'),(2021,'MJ',2,'5.d','manual-source-extraction-incomplete-v1'),(2021,'MJ',3,'2.a','manual-source-extraction-incomplete-v1'),(2021,'MJ',3,'3.b','manual-spatial-trace-rubric-v1'),(2021,'MJ',3,'4.c.i','manual-spatial-shading-rubric-v1'),
(2021,'ON',1,'1.a','manual-matching-layout-needs-source-v1'),(2021,'ON',1,'3.c','manual-spatial-matching-rubric-v1'),(2021,'ON',1,'4.d','manual-blank-boundary-needs-qp-v1'),(2021,'ON',2,'6.a.ii','manual-source-extraction-incomplete-v1'),(2021,'ON',2,'6.c.i','manual-code-completion-needs-qp-blanks-v1'),(2021,'ON',2,'7.a','manual-spatial-shading-rubric-v1'),(2021,'ON',3,'1.a','manual-matching-layout-needs-source-v1'),(2021,'ON',3,'3.c','manual-spatial-matching-rubric-v1'),(2021,'ON',3,'4.d','manual-blank-boundary-needs-qp-v1'),
(2022,'MJ',1,'2.a.i','manual-blank-boundary-needs-qp-v1'),(2022,'MJ',2,'4.b','manual-open-alternative-family-v1'),(2022,'MJ',2,'5.a','manual-source-extraction-incomplete-v1'),(2022,'MJ',2,'5.c','manual-code-completion-needs-qp-blanks-v1'),(2022,'MJ',2,'8','manual-mutually-exclusive-alternative-v1'),(2022,'MJ',3,'3.c','manual-matching-layout-needs-source-v1'),(2022,'MJ',3,'5.b.i','manual-mutually-exclusive-alternative-v1'),(2022,'MJ',3,'6.b.i','manual-code-completion-needs-qp-blanks-v1'),
(2022,'ON',1,'6.a.i','manual-spatial-trace-rubric-v1'),(2022,'ON',1,'6.c','manual-spatial-shading-rubric-v1'),(2022,'ON',2,'5.a','manual-mutually-exclusive-alternative-v1'),(2022,'ON',2,'7.a','manual-spatial-trace-rubric-v1'),(2022,'ON',3,'2.c','manual-code-completion-needs-qp-blanks-v1'),(2022,'ON',3,'3','manual-matching-layout-needs-source-v1'),(2022,'ON',3,'6.a.i','manual-spatial-trace-rubric-v1'),
(2023,'ON',1,'1.a','manual-matching-layout-needs-source-v1'),(2023,'ON',2,'9.b','manual-spatial-trace-rubric-v1'),(2023,'ON',3,'7.d','manual-mutually-exclusive-alternative-v1'),(2024,'ON',1,'2.a','manual-mutually-exclusive-alternative-v1'),(2024,'ON',1,'2.b.i','manual-source-extraction-incomplete-v1'),(2024,'ON',2,'8.a','manual-spatial-trace-rubric-v1');
with r as(
 select t.*,ms.id msid from t71 t join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
 join components c on c.id=sp.component_id and c.number=1 join questions q on q.source_paper_id=sp.id and q.path=t.path join mark_schemes ms on ms.question_id=q.id
 where ms.prompt_version='source-backed-oidc-backfill-v1' and ms.scheme_type='manual_only'::scheme_type and (select count(*) from mark_scheme_points p where p.mark_scheme_id=ms.id)=1
)
update mark_schemes ms set prompt_version=r.reason,updated_at=now() from r where ms.id=r.msid;
