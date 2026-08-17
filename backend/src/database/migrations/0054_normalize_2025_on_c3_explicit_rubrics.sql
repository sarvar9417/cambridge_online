-- Source-backed atomic normalization for five explicit 9618/31 O/N 2025 rubrics.
-- Replaces only the exact unused legacy shape: one wrapper point in one g1:main placeholder group.

with target(path,expected_marks,scheme_kind) as (
  values ('1.a.ii',2,'all_required'),('1.b.i',2,'all_required'),('9.a.i',5,'any_n_from_m'),('10',3,'any_n_from_m'),('11.a',6,'all_required')
), resolved as (
  select t.*,q.id question_id,ms.id mark_scheme_id,
         (select g.id from mark_scheme_groups g where g.mark_scheme_id=ms.id limit 1) old_group_id
  from target t
  join source_papers sp on sp.year=2025 and sp.series::text='ON' and sp.variant=1 and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=3
  join questions q on q.source_paper_id=sp.id and q.path=t.path and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), eligible as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=1
    and (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=1
    and exists(select 1 from mark_scheme_groups g where g.id=r.old_group_id and g.label='g1:main' and g.n_required=1 and g.marks_per_point=1 and g.max_marks=r.expected_marks and g.award_mode='fixed')
    and not exists(select 1 from assignment_questions aq where aq.question_id=r.question_id)
    and not exists(select 1 from answers a where a.question_id=r.question_id)
    and not exists(select 1 from grading_points gp join mark_scheme_points p on p.id=gp.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from error_patterns ep join mark_scheme_points p on p.id=ep.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from flashcards f join mark_scheme_points p on p.id=f.source_mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
), group_defs(path,label,n_required,max_marks,sort_order) as (
  values ('9.a.i','completed_lines',5,5,1),('10','explanation',2,2,1),('10','example',1,1,2)
), point_defs(path,code,point_text,group_label,requires,sort_order) as (
  values
    ('1.a.ii','MP1','Assign 984632 to Member1.Code.','', '[]'::jsonb,1),
    ('1.a.ii','MP2','Assign TRUE to Member1.FeesPaid.','', '[]'::jsonb,2),
    ('1.b.i','MP1','Declare the enumerated type with TYPE Activity =.','', '[]'::jsonb,1),
    ('1.b.i','MP2','Include Badminton, Football, Golf, Snooker, Swimming and Tennis as the enumeration values.','', '[]'::jsonb,2),
    ('9.a.i','P1','Complete the function heading with RETURNS STRING.','completed_lines','[]'::jsonb,1),
    ('9.a.i','P2','Assign the empty string to DataItem.','completed_lines','[]'::jsonb,2),
    ('9.a.i','P3','Use a valid non-empty-stack condition: Top > -1 or Top >= Base.','completed_lines','[]'::jsonb,3),
    ('9.a.i','P4','Assign StackArray[Top] to DataItem.','completed_lines','[]'::jsonb,4),
    ('9.a.i','P5','Decrement Top by 1.','completed_lines','[]'::jsonb,5),
    ('9.a.i','P6','Return DataItem, or equivalently StackArray[Top + 1].','completed_lines','[]'::jsonb,6),
    ('10','E1','Exception handling responds to unwanted or unexpected events when a program runs.','explanation','[]'::jsonb,1),
    ('10','E2','Exception handling prevents the program or computer from stopping unexpectedly.','explanation','[]'::jsonb,2),
    ('10','X1','Example cause: programming error.','example','[]'::jsonb,3),
    ('10','X2','Example cause: user error.','example','[]'::jsonb,4),
    ('10','X3','Example cause: hardware failure or loss of connection to a device.','example','[]'::jsonb,5),
    ('11.a','MP1','LDM #100 is present.','', '[]'::jsonb,1),
    ('11.a','MP2','Correctly use STO with a labelled address for the constant or answer.','', '[]'::jsonb,2),
    ('11.a','MP3','Correctly use LDD 632.','', '[]'::jsonb,3),
    ('11.a','MP4','Correctly use SUB with the labelled constant address.','', '[]'::jsonb,4),
    ('11.a','MP5','Store 100 at a labelled address away from the code.','', '[]'::jsonb,5),
    ('11.a','MP6','Label both data addresses away from the code.','', '[]'::jsonb,6)
), validated as (
  select e.* from eligible e
  where (e.scheme_kind='all_required' and (select count(*) from point_defs p where p.path=e.path)=e.expected_marks)
     or (e.scheme_kind='any_n_from_m' and (select coalesce(sum(g.max_marks),0) from group_defs g where g.path=e.path)=e.expected_marks)
), deleted_points as (
  delete from mark_scheme_points p using validated v where p.mark_scheme_id=v.mark_scheme_id returning p.mark_scheme_id
), deleted_groups as (
  delete from mark_scheme_groups g using validated v where g.id=v.old_group_id and exists(select 1 from deleted_points d where d.mark_scheme_id=v.mark_scheme_id) returning g.mark_scheme_id
), groups as (
  insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
  select v.mark_scheme_id,g.label,g.n_required,1,g.max_marks,g.sort_order,'fixed'
  from validated v join group_defs g on g.path=v.path
  where exists(select 1 from deleted_groups d where d.mark_scheme_id=v.mark_scheme_id)
  returning id,mark_scheme_id,label
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select v.mark_scheme_id,g.id,p.code,p.point_text,1,'[]'::jsonb,'[]'::jsonb,p.requires,false,p.sort_order
from validated v join point_defs p on p.path=v.path
left join groups g on g.mark_scheme_id=v.mark_scheme_id and g.label=nullif(p.group_label,'')
where exists(select 1 from deleted_groups d where d.mark_scheme_id=v.mark_scheme_id)
  and (nullif(p.group_label,'') is null or g.id is not null);

with target(path,expected_marks,scheme_kind,expected_points,expected_groups) as (
  values ('1.a.ii',2,'all_required',2,0),('1.b.i',2,'all_required',2,0),('9.a.i',5,'any_n_from_m',6,1),('10',3,'any_n_from_m',5,2),('11.a',6,'all_required',6,0)
), resolved as (
  select t.*,ms.id mark_scheme_id from target t
  join source_papers sp on sp.year=2025 and sp.series::text='ON' and sp.variant=1 and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=3
  join questions q on q.source_paper_id=sp.id and q.path=t.path and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), valid as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=r.expected_points
    and (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_groups
    and (r.expected_groups=0 or (select coalesce(sum(g.max_marks),0) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_marks)
)
update mark_schemes ms set scheme_type=v.scheme_kind::scheme_type,prompt_version='atomic-source-2025-on-c3-v1',updated_at=now() from valid v where ms.id=v.mark_scheme_id;
