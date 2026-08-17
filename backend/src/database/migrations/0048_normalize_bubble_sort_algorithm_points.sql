-- Source-backed normalization for repeated 2021 O/N Component 2 Q2(a).
-- Published rule: seven distinct algorithm points, overall Max 6.
-- MP5 is conditional on MP4 ("if so then swap elements"). No other dependency
-- is inferred without explicit source linkage. Natural-key and downstream-use gated.

with target(variant) as (values (1),(3)), resolved as (
  select q.id question_id,ms.id mark_scheme_id,sp.variant
  from target t
  join source_papers sp on sp.year=2021 and sp.series::text='ON' and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=2
  join questions q on q.source_paper_id=sp.id and q.display_ref='2.a' and q.marks=6
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=6
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
  select e.mark_scheme_id,'points',6,1,6,1,'fixed'
  from eligible e where exists(select 1 from deleted d where d.mark_scheme_id=e.mark_scheme_id)
  returning id,mark_scheme_id
), defs(code,point_text,requires,sort_order) as (
  values
    ('MP1','Use a variable as an index to the array.','[]'::jsonb,1),
    ('MP2','Use a loop to iterate through the array.','[]'::jsonb,2),
    ('MP3','Use an inner loop with a reducing range.','[]'::jsonb,3),
    ('MP4','Test whether the current element is greater than the next element.','[]'::jsonb,4),
    ('MP5','If so, swap the elements.','["MP4"]'::jsonb,5),
    ('MP6','Describe the swap.','[]'::jsonb,6),
    ('MP7','Attempt an efficient algorithm.','[]'::jsonb,7)
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select e.mark_scheme_id,g.id,d.code,d.point_text,1,'[]'::jsonb,'[]'::jsonb,d.requires,false,d.sort_order
from eligible e cross join defs d join groups g on g.mark_scheme_id=e.mark_scheme_id
where exists(select 1 from deleted x where x.mark_scheme_id=e.mark_scheme_id);

with resolved as (
  select ms.id mark_scheme_id
  from source_papers sp join components c on c.id=sp.component_id and c.number=2
  join questions q on q.source_paper_id=sp.id and q.display_ref='2.a' and q.marks=6
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=6
  where sp.year=2021 and sp.series::text='ON' and sp.variant in (1,3) and sp.kind='QP'::paper_kind
), valid as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=7
    and exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id and g.label='points' and g.n_required=6 and g.max_marks=6)
    and exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP5' and p.requires='["MP4"]'::jsonb)
)
update mark_schemes ms set scheme_type='any_n_from_m'::scheme_type,prompt_version='atomic-source-bubble-sort-v1',updated_at=now() from valid v where ms.id=v.mark_scheme_id;
