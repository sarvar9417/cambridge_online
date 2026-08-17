-- Source-backed normalization for 2024 M/J 32 Q8(b).
-- Published structure: comparison points Max 3 + Big-O points Max 2,
-- with overall question Max 4. Ellipsis-linked points preserve dependencies.
-- Natural-key, single-wrapper-only, downstream-use-gated and idempotent.

with resolved as (
  select q.id question_id,ms.id mark_scheme_id
  from source_papers sp
  join components c on c.id=sp.component_id and c.number=3
  join questions q on q.source_paper_id=sp.id and q.display_ref='8.b' and q.marks=4
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=4
  where sp.year=2024 and sp.series::text='MJ' and sp.variant=2 and sp.kind='QP'::paper_kind
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
  select e.mark_scheme_id,x.label,x.n_required,1,x.max_marks,x.sort_order,'fixed'
  from eligible e cross join (values ('comparison',3,3,1),('big_o',2,2,2)) x(label,n_required,max_marks,sort_order)
  where exists(select 1 from deleted d where d.mark_scheme_id=e.mark_scheme_id)
  returning id,mark_scheme_id,label
), defs(code,point_text,group_label,requires,sort_order) as (
  values
    ('MP1','Linear search sequentially checks each element of the array / list.','comparison','[]'::jsonb,1),
    ('MP2','Until the matching element is found, or the end of the array / list is reached.','comparison','["MP1"]'::jsonb,2),
    ('MP3','Binary search finds the mid-point of an array/list and determines which side contains the item to be found.','comparison','[]'::jsonb,3),
    ('MP4','It discards the half of the array/list not containing the search item, or repeatedly halves the target search field.','comparison','["MP3"]'::jsonb,4),
    ('MP5','Binary search requires sorted elements; linear search does not.','comparison','[]'::jsonb,5),
    ('MP6','Binary search will usually make many fewer comparisons / iterations against the target than linear search.','comparison','[]'::jsonb,6),
    ('MP7','Linear search starts at the beginning of the array/list and binary search starts in the middle.','comparison','[]'::jsonb,7),
    ('MP8','Big O for binary search is O(Log 2 n).','big_o','[]'::jsonb,8),
    ('MP9','Big O for linear search is O(n).','big_o','[]'::jsonb,9),
    ('MP10','Big O notation indicates the time / space complexity of an algorithm.','big_o','[]'::jsonb,10)
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select e.mark_scheme_id,g.id,d.code,d.point_text,1,'[]'::jsonb,'[]'::jsonb,d.requires,false,d.sort_order
from eligible e cross join defs d join groups g on g.mark_scheme_id=e.mark_scheme_id and g.label=d.group_label
where exists(select 1 from deleted x where x.mark_scheme_id=e.mark_scheme_id);

with resolved as (
  select ms.id mark_scheme_id
  from source_papers sp join components c on c.id=sp.component_id and c.number=3
  join questions q on q.source_paper_id=sp.id and q.display_ref='8.b' and q.marks=4
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=4
  where sp.year=2024 and sp.series::text='MJ' and sp.variant=2 and sp.kind='QP'::paper_kind
), valid as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=10
    and (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=2
    and exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id and g.label='comparison' and g.n_required=3 and g.max_marks=3)
    and exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id and g.label='big_o' and g.n_required=2 and g.max_marks=2)
    and exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP2' and p.requires='["MP1"]'::jsonb)
    and exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP4' and p.requires='["MP3"]'::jsonb)
)
update mark_schemes ms set scheme_type='any_n_from_m'::scheme_type,prompt_version='atomic-source-search-comparison-v1',updated_at=now() from valid v where ms.id=v.mark_scheme_id;
