-- Source-backed normalization for repeated 2023 O/N Component 3 Q7(a).
-- Published rule: one mark for a benefit (Max 1) plus one mark for a valid example (Max 1).
-- Natural-key, single-wrapper-only, downstream-use-gated, idempotent.

with target(variant) as (values (1),(3)), resolved as (
  select q.id question_id,ms.id mark_scheme_id,sp.variant
  from target t
  join source_papers sp on sp.year=2023 and sp.series::text='ON' and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=3
  join questions q on q.source_paper_id=sp.id and q.display_ref='7.a' and q.marks=2
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=2
), eligible as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=1
    and not exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from assignment_questions aq where aq.question_id=r.question_id)
    and not exists(select 1 from answers a where a.question_id=r.question_id)
    and not exists(select 1 from grading_points gp join mark_scheme_points p on p.id=gp.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from error_patterns ep join mark_scheme_points p on p.id=ep.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from flashcards f join mark_scheme_points p on p.id=f.source_mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
), deleted as (
  delete from mark_scheme_points p using eligible e where p.mark_scheme_id=e.mark_scheme_id returning p.mark_scheme_id
), groups as (
  insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
  select e.mark_scheme_id,x.label,1,1,1,x.sort_order,'fixed'
  from eligible e cross join (values ('benefit',1),('example',2)) x(label,sort_order)
  where exists(select 1 from deleted d where d.mark_scheme_id=e.mark_scheme_id)
  returning id,mark_scheme_id,label
), defs(code,point_text,group_label,sort_order) as (
  values
    ('MP1','The user interface hides the complexities of the computer hardware / operating system from the user','benefit',1),
    ('MP2','It provides appropriate access systems for users with differing needs','benefit',2),
    ('MP3','Complex commands involving memory locations, buses or computer hardware are avoided','benefit',3),
    ('EX1','Clicking on an icon rather than writing code','example',4),
    ('EX2','Using a graphical user interface / icons for navigation','example',5)
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select e.mark_scheme_id,g.id,d.code,d.point_text,1,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,false,d.sort_order
from eligible e cross join defs d join groups g on g.mark_scheme_id=e.mark_scheme_id and g.label=d.group_label
where exists(select 1 from deleted x where x.mark_scheme_id=e.mark_scheme_id);

with resolved as (
  select ms.id mark_scheme_id
  from source_papers sp join components c on c.id=sp.component_id and c.number=3
  join questions q on q.source_paper_id=sp.id and q.display_ref='7.a' and q.marks=2
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=2
  where sp.year=2023 and sp.series::text='ON' and sp.variant in (1,3) and sp.kind='QP'::paper_kind
), valid as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=5
    and (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=2
    and exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id and g.label='benefit' and g.n_required=1 and g.max_marks=1)
    and exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id and g.label='example' and g.n_required=1 and g.max_marks=1)
)
update mark_schemes ms set scheme_type='any_n_from_m'::scheme_type,prompt_version='atomic-source-ui-benefit-example-v1',updated_at=now() from valid v where ms.id=v.mark_scheme_id;
