-- Source-backed atomic normalization for three deterministic programming rubrics.
--
-- Safety:
--   * natural paper/question keys only; no generated IDs
--   * only single structural wrappers are eligible
--   * targets with assignment/answer/grading/error-pattern/flashcard use are refused
--   * pre-existing groups are refused
--   * published Max-n caps and explicit dependencies are preserved
--   * metadata is finalized in a separate statement after post-insert shape checks
--   * idempotent: already-normalized schemes are not eligible

with target(year, series, component, variant, display_ref, expected_marks) as (
  values
    (2022,'MJ',2,1,'5',6),
    (2022,'ON',2,1,'3',5),
    (2023,'MJ',2,2,'2.c',6)
), resolved as (
  select t.*, q.id question_id, ms.id mark_scheme_id
  from target t
  join source_papers sp
    on sp.year=t.year
   and sp.series::text=t.series
   and sp.variant=t.variant
   and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=t.component
  join questions q
    on q.source_paper_id=sp.id
   and q.display_ref=t.display_ref
   and q.marks=t.expected_marks
  join mark_schemes ms
    on ms.question_id=q.id
   and ms.max_marks=t.expected_marks
), eligible as (
  select r.*
  from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=1
    and not exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from assignment_questions aq where aq.question_id=r.question_id)
    and not exists(select 1 from answers a where a.question_id=r.question_id)
    and not exists(select 1 from grading_points gp join mark_scheme_points p on p.id=gp.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from error_patterns ep join mark_scheme_points p on p.id=ep.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from flashcards f join mark_scheme_points p on p.id=f.source_mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
), group_defs(year,series,component,variant,display_ref,label,n_required,marks_per_point,max_marks,sort_order) as (
  values
    (2022,'MJ',2,1,'5','points',6,1,6,1),
    (2022,'ON',2,1,'3','points',5,1,5,1),
    (2023,'MJ',2,2,'2.c','array_definition',2,1,2,1),
    (2023,'MJ',2,2,'2.c','steps',4,1,4,2)
), point_defs(year,series,component,variant,display_ref,code,point_text,group_label,requires,sort_order) as (
  values
    (2022,'MJ',2,1,'5','MP1','Open file in read mode','points','[]'::jsonb,1),
    (2022,'MJ',2,1,'5','MP2','Set up a conditional loop, repeating until the value is found or EOF() is reached','points','[]'::jsonb,2),
    (2022,'MJ',2,1,'5','MP3','Read a line from the file in a loop','points','[]'::jsonb,3),
    (2022,'MJ',2,1,'5','MP4','Extract Field 2','points','[]'::jsonb,4),
    (2022,'MJ',2,1,'5','MP5','Describe how Field 2 could be extracted, for example using a substring function and the lengths of Field 1 and Field 2','points','[]'::jsonb,5),
    (2022,'MJ',2,1,'5','MP6','Compare the extracted field with the search value','points','[]'::jsonb,6),
    (2022,'MJ',2,1,'5','MP7','If the search value is found, extract Field 1 and Field 3 and output them','points','[]'::jsonb,7),
    (2022,'MJ',2,1,'5','MP8','Close the file after the loop has finished','points','[]'::jsonb,8),

    (2022,'ON',2,1,'3','MP1','Declare a variable / an integer Max','points','[]'::jsonb,1),
    (2022,'ON',2,1,'3','MP2','Assign the value of the first / any element to Max','points','[]'::jsonb,2),
    (2022,'ON',2,1,'3','MP3','Set up a loop to repeat 200 times / from start to end of array','points','[]'::jsonb,3),
    (2022,'ON',2,1,'3','MP4','Use the loop counter as the array index','points','[]'::jsonb,4),
    (2022,'ON',2,1,'3','MP5','If the value of the current element is greater than Max','points','[]'::jsonb,5),
    (2022,'ON',2,1,'3','MP6','Then assign the value to Max','points','["MP5"]'::jsonb,6),
    (2022,'ON',2,1,'3','MP7','After the loop, output Max','points','[]'::jsonb,7),

    (2023,'MJ',2,2,'2.c','MP1','Define a one-dimensional array containing 7 elements','array_definition','[]'::jsonb,1),
    (2023,'MJ',2,2,'2.c','MP2','Define the array elements as type STRING','array_definition','[]'::jsonb,2),
    (2023,'MJ',2,2,'2.c','MP3','Assign "Sunday" to the first element, "Monday" to the second element, and so on','steps','[]'::jsonb,3),
    (2023,'MJ',2,2,'2.c','MP4','Use DAYINDEX() to return / find the day number from MyDoB','steps','[]'::jsonb,4),
    (2023,'MJ',2,2,'2.c','MP5','Use the returned value as the array index to access the element containing the name / string','steps','[]'::jsonb,5),
    (2023,'MJ',2,2,'2.c','MP6','Output the element / name / string','steps','[]'::jsonb,6)
), validated as (
  select e.*
  from eligible e
  where (select count(*) from point_defs p where p.year=e.year and p.series=e.series and p.component=e.component and p.variant=e.variant and p.display_ref=e.display_ref) > 0
    and (select count(*) from point_defs p where p.year=e.year and p.series=e.series and p.component=e.component and p.variant=e.variant and p.display_ref=e.display_ref)
      = (select count(distinct p.code) from point_defs p where p.year=e.year and p.series=e.series and p.component=e.component and p.variant=e.variant and p.display_ref=e.display_ref)
    and (select coalesce(sum(g.max_marks),0) from group_defs g where g.year=e.year and g.series=e.series and g.component=e.component and g.variant=e.variant and g.display_ref=e.display_ref)=e.expected_marks
), deleted as (
  delete from mark_scheme_points p
  using validated v
  where p.mark_scheme_id=v.mark_scheme_id
  returning p.mark_scheme_id
), inserted_groups as (
  insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
  select v.mark_scheme_id,g.label,g.n_required,g.marks_per_point,g.max_marks,g.sort_order,'fixed'
  from validated v
  join group_defs g on g.year=v.year and g.series=v.series and g.component=v.component and g.variant=v.variant and g.display_ref=v.display_ref
  where exists(select 1 from deleted d where d.mark_scheme_id=v.mark_scheme_id)
  returning id,mark_scheme_id,label
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select v.mark_scheme_id,ig.id,p.code,p.point_text,1,'[]'::jsonb,'[]'::jsonb,p.requires,false,p.sort_order
from validated v
join point_defs p on p.year=v.year and p.series=v.series and p.component=v.component and p.variant=v.variant and p.display_ref=v.display_ref
join inserted_groups ig on ig.mark_scheme_id=v.mark_scheme_id and ig.label=p.group_label
where exists(select 1 from deleted d where d.mark_scheme_id=v.mark_scheme_id);

with target(year,series,component,variant,display_ref,expected_marks,expected_points,expected_groups) as (
  values
    (2022,'MJ',2,1,'5',6,8,1),
    (2022,'ON',2,1,'3',5,7,1),
    (2023,'MJ',2,2,'2.c',6,6,2)
), resolved as (
  select t.*,ms.id mark_scheme_id
  from target t
  join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=t.component
  join questions q on q.source_paper_id=sp.id and q.display_ref=t.display_ref and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), valid as (
  select r.*
  from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=r.expected_points
    and (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_groups
    and (select coalesce(sum(g.max_marks),0) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_marks
    and (r.display_ref<>'3' or exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP6' and p.requires='["MP5"]'::jsonb))
)
update mark_schemes ms
set scheme_type='any_n_from_m'::scheme_type,
    prompt_version='atomic-source-numbered-programming-v1',
    updated_at=now()
from valid v
where ms.id=v.mark_scheme_id;
