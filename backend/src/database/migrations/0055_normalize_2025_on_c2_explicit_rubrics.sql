-- Source-backed atomic normalization for four explicit 9618/21 O/N 2025 programming rubrics.
-- Replaces only the exact unused legacy shape: one wrapper point in one g1:main placeholder group.

with target(path,expected_marks) as (
  values ('4.a',6),('6.b',7),('8.a',7),('8.b',8)
), resolved as (
  select t.*,q.id question_id,ms.id mark_scheme_id,
         (select g.id from mark_scheme_groups g where g.mark_scheme_id=ms.id limit 1) old_group_id
  from target t
  join source_papers sp on sp.year=2025 and sp.series::text='ON' and sp.variant=1 and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=2
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
), point_defs(path,code,point_text,requires,sort_order) as (
  values
    ('4.a','MP1','Declare local Index as INTEGER and ThisNum and LastNum as REAL.','[]'::jsonb,1),
    ('4.a','MP2','Input the first value and assign it to the first Number array element.','[]'::jsonb,2),
    ('4.a','MP3','Attempt the published loop structure with the required increasing-value and capacity/stopping tests.','[]'::jsonb,3),
    ('4.a','MP4','Complete the chosen published loop structure correctly, including its required tests / BREAK condition.','["MP3"]'::jsonb,4),
    ('4.a','MP5','Store the current input after the increasing-value comparison and obtain the next value within the loop.','[]'::jsonb,5),
    ('4.a','MP6','After the loop, output the number of values stored with the required message.','[]'::jsonb,6),
    ('6.b','MP1','Correct function heading, parameter, return type and ending.','[]'::jsonb,1),
    ('6.b','MP2','Initialise Total.','[]'::jsonb,2),
    ('6.b','MP3','Iterate through all digits, either via the converted string length or by repeatedly processing Num while Num > 0.','[]'::jsonb,3),
    ('6.b','MP4','Attempt to form the sum of the digits in the loop.','[]'::jsonb,4),
    ('6.b','MP5','Form the sum of the digits completely correctly in the loop.','["MP4"]'::jsonb,5),
    ('6.b','MP6','Calculate CheckDigit as Total MOD 10.','[]'::jsonb,6),
    ('6.b','MP7','Append the check digit to the original number using either published method and return the resulting integer.','[]'::jsonb,7),
    ('8.a','MP1','Correct procedure heading, parameter and ending.','[]'::jsonb,1),
    ('8.a','MP2','Loop through all elements in the Loan array.','[]'::jsonb,2),
    ('8.a','MP3','Terminate the loop if Max loans is reached.','["MP2"]'::jsonb,3),
    ('8.a','MP4','Test the correct StudentID field in the loop.','[]'::jsonb,4),
    ('8.a','MP5','Also test that OnLoan = TRUE in the loop.','["MP4"]'::jsonb,5),
    ('8.a','MP6','If the loan conditions are met, increment Count in the loop.','["MP5"]'::jsonb,6),
    ('8.a','MP7','After the loop, output an appropriate message in both cases.','[]'::jsonb,7),
    ('8.b','MP1','Loop through all elements in the Loan array.','[]'::jsonb,1),
    ('8.b','MP2','Handle the case where the book loan is not found.','["MP1"]'::jsonb,2),
    ('8.b','MP3','Attempt to reference an individual Loan data item in the loop.','[]'::jsonb,3),
    ('8.b','MP4','Correctly test both StudentID and BookID in the loop.','["MP3"]'::jsonb,4),
    ('8.b','MP5','If the book has not yet been returned, set its OnLoan field to FALSE.','["MP4"]'::jsonb,5),
    ('8.b','MP6','Return TRUE if the book loan is found and has not already been returned.','[]'::jsonb,6),
    ('8.b','MP7','Return FALSE if the book loan is found and has already been returned.','[]'::jsonb,7),
    ('8.b','MP8','Return FALSE if the book loan is not found.','[]'::jsonb,8)
), validated as (
  select e.* from eligible e where (select count(*) from point_defs p where p.path=e.path)=e.expected_marks
), deleted_points as (
  delete from mark_scheme_points p using validated v where p.mark_scheme_id=v.mark_scheme_id returning p.mark_scheme_id
), deleted_groups as (
  delete from mark_scheme_groups g using validated v where g.id=v.old_group_id and exists(select 1 from deleted_points d where d.mark_scheme_id=v.mark_scheme_id) returning g.mark_scheme_id
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select v.mark_scheme_id,null,p.code,p.point_text,1,'[]'::jsonb,'[]'::jsonb,p.requires,false,p.sort_order
from validated v join point_defs p on p.path=v.path
where exists(select 1 from deleted_groups d where d.mark_scheme_id=v.mark_scheme_id);

with target(path,expected_marks,expected_points) as (
  values ('4.a',6,6),('6.b',7,7),('8.a',7,7),('8.b',8,8)
), resolved as (
  select t.*,ms.id mark_scheme_id from target t
  join source_papers sp on sp.year=2025 and sp.series::text='ON' and sp.variant=1 and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=2
  join questions q on q.source_paper_id=sp.id and q.path=t.path and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), valid as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=r.expected_points
    and (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=0
    and (r.path<>'4.a' or exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP4' and p.requires='["MP3"]'::jsonb))
    and (r.path<>'6.b' or exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP5' and p.requires='["MP4"]'::jsonb))
    and (r.path<>'8.a' or exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP6' and p.requires='["MP5"]'::jsonb))
)
update mark_schemes ms set scheme_type='all_required'::scheme_type,prompt_version='atomic-source-2025-on-c2-v1',updated_at=now() from valid v where ms.id=v.mark_scheme_id;
