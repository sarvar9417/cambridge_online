-- Classify residual wrappers whose published Cambridge guidance provides
-- mutually exclusive alternative solution paths.
--
-- These are deliberately NOT atomized with the current point/group scorer:
-- without branch exclusivity, points from incompatible alternatives could be
-- combined into an invalid award. The source guidance itself must contain an
-- explicit Alternative marker before classification is applied.
--
-- No mark points are changed. Natural keys + expected marks make this idempotent.

with target(year,series,component,variant,display_ref,expected_marks) as (
  values
    (2021,'MJ',2,1,'3.a.iii',2),
    (2021,'MJ',2,1,'6.b',2),
    (2021,'MJ',2,3,'3.a.iii',2),
    (2021,'MJ',2,3,'6.b',2),
    (2021,'ON',2,2,'6.c.i',2),
    (2022,'MJ',2,1,'6.a',5),
    (2022,'MJ',2,2,'4.b',3),
    (2022,'MJ',2,2,'8.a',5),
    (2022,'MJ',2,3,'6.a',6),
    (2024,'ON',2,1,'3.c',4)
), resolved as (
  select ms.id mark_scheme_id
  from target t
  join source_papers sp
    on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=t.component
  join questions q on q.source_paper_id=sp.id and q.display_ref=t.display_ref and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
  where ms.scheme_type='manual_only'::scheme_type
    and (select count(*) from mark_scheme_points p where p.mark_scheme_id=ms.id)=1
    and ms.guidance_md ~* '(alternative solution|alternative answer|alternative:|alternative \'|alternative \()'
)
update mark_schemes ms
set prompt_version='manual-mutually-exclusive-alternative-v1',
    updated_at=now()
from resolved r
where ms.id=r.mark_scheme_id
  and ms.prompt_version<>'manual-mutually-exclusive-alternative-v1';
