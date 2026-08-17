-- Replace the exact legacy 2025 O/N code_output placeholder shape (one point + one g1:main group)
-- with source-backed atomic Cambridge marking points. Usage must be zero before replacement.

with target(component,path,expected_marks,scheme_kind) as (
  values (2,'4.a',6,'all_required'),(2,'6.b',7,'all_required'),(2,'8.a',7,'all_required'),(2,'8.b',8,'all_required'),
         (3,'1.a.ii',2,'all_required'),(3,'1.b.i',2,'all_required'),(3,'9.a.i',5,'any_n_from_m'),
         (3,'10',3,'any_n_from_m'),(3,'11.a',6,'all_required')
), resolved as (
  select t.*,q.id question_id,ms.id mark_scheme_id,
         (select min(g.id) from mark_scheme_groups g where g.mark_scheme_id=ms.id) old_group_id
  from target t
  join source_papers sp on sp.year=2025 and sp.series::text='ON' and sp.variant=1 and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=t.component
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
), group_defs(component,path,label,n_required,max_marks,sort_order) as (
  values (3,'9.a.i','completed_lines',5,5,1),(3,'10','explanation',2,2,1),(3,'10','example',1,1,2)
), point_defs(component,path,code,point_text,group_label,requires,sort_order) as (
  values
    (2,'4.a','MP1','Declare local Index as INTEGER and ThisNum and LastNum as REAL.','', '[]'::jsonb,1),
    (2,'4.a','MP2','Input the first value and assign it to the first Number array element.','', '[]'::jsonb,2),
    (2,'4.a','MP3','Attempt the published loop structure with the required increasing-value and capacity/stopping tests.','', '[]'::jsonb,3),
    (2,'4.a','MP4','Complete the chosen published loop structure correctly, including its required tests / BREAK condition.','', '["MP3"]'::jsonb,4),
    (2,'4.a','MP5','Store the current input after the increasing-value comparison and obtain the next value within the loop.','', '[]'::jsonb,5),
    (2,'4.a','MP6','After the loop, output the number of values stored with the required message.','', '[]'::jsonb,6),
    (2,'6.b','MP1','Correct function heading, parameter, return type and ending.','', '[]'::jsonb,1),
    (2,'6.b','MP2','Initialise Total.','', '[]'::jsonb,2),
    (2,'6.b','MP3','Iterate through all digits, either via the converted string length or by repeatedly processing Num while Num > 0.','', '[]'::jsonb,3),
    (2,'6.b','MP4','Attempt to form the sum of the digits in the loop.','', '[]'::jsonb,4),
    (2,'6.b','MP5','Form the sum of the digits completely correctly in the loop.','', '["MP4"]'::jsonb,5),
    (2,'6.b','MP6','Calculate CheckDigit as Total MOD 10.','', '[]'::jsonb,6),
    (2,'6.b','MP7','Append the check digit to the original number using either published method and return the resulting integer.','', '[]'::jsonb,7),
    (2,'8.a','MP1','Correct procedure heading, parameter and ending.','', '[]'::jsonb,1),
    (2,'8.a','MP2','Loop through all elements in the Loan array.','', '[]'::jsonb,2),
    (2,'8.a','MP3','Terminate the loop if Max loans is reached.','', '["MP2"]'::jsonb,3),
    (2,'8.a','MP4','Test the correct StudentID field in the loop.','', '[]'::jsonb,4),
    (2,'8.a','MP5','Also test that OnLoan = TRUE in the loop.','', '["MP4"]'::jsonb,5),
    (2,'8.a','MP6','If the loan conditions are met, increment Count in the loop.','', '["MP5"]'::jsonb,6),
    (2,'8.a','MP7','After the loop, output an appropriate message in both cases.','', '[]'::jsonb,7),
    (2,'8.b','MP1','Loop through all elements in the Loan array.','', '[]'::jsonb,1),
    (2,'8.b','MP2','Handle the case where the book loan is not found.','', '["MP1"]'::jsonb,2),
    (2,'8.b','MP3','Attempt to reference an individual Loan data item in the loop.','', '[]'::jsonb,3),
    (2,'8.b','MP4','Correctly test both StudentID and BookID in the loop.','', '["MP3"]'::jsonb,4),
    (2,'8.b','MP5','If the book has not yet been returned, set its OnLoan field to FALSE.','', '["MP4"]'::jsonb,5),
    (2,'8.b','MP6','Return TRUE if the book loan is found and has not already been returned.','', '[]'::jsonb,6),
    (2,'8.b','MP7','Return FALSE if the book loan is found and has already been returned.','', '[]'::jsonb,7),
    (2,'8.b','MP8','Return FALSE if the book loan is not found.','', '[]'::jsonb,8),
    (3,'1.a.ii','MP1','Assign 984632 to Member1.Code.','', '[]'::jsonb,1),(3,'1.a.ii','MP2','Assign TRUE to Member1.FeesPaid.','', '[]'::jsonb,2),
    (3,'1.b.i','MP1','Declare the enumerated type with TYPE Activity =.','', '[]'::jsonb,1),(3,'1.b.i','MP2','Include Badminton, Football, Golf, Snooker, Swimming and Tennis as the enumeration values.','', '[]'::jsonb,2),
    (3,'9.a.i','P1','Complete the function heading with RETURNS STRING.','completed_lines','[]'::jsonb,1),(3,'9.a.i','P2','Assign the empty string to DataItem.','completed_lines','[]'::jsonb,2),
    (3,'9.a.i','P3','Use a valid non-empty-stack condition: Top > -1 or Top >= Base.','completed_lines','[]'::jsonb,3),(3,'9.a.i','P4','Assign StackArray[Top] to DataItem.','completed_lines','[]'::jsonb,4),
    (3,'9.a.i','P5','Decrement Top by 1.','completed_lines','[]'::jsonb,5),(3,'9.a.i','P6','Return DataItem, or equivalently StackArray[Top + 1].','completed_lines','[]'::jsonb,6),
    (3,'10','E1','Exception handling responds to unwanted or unexpected events when a program runs.','explanation','[]'::jsonb,1),(3,'10','E2','Exception handling prevents the program or computer from stopping unexpectedly.','explanation','[]'::jsonb,2),
    (3,'10','X1','Example cause: programming error.','example','[]'::jsonb,3),(3,'10','X2','Example cause: user error.','example','[]'::jsonb,4),(3,'10','X3','Example cause: hardware failure or loss of connection to a device.','example','[]'::jsonb,5),
    (3,'11.a','MP1','LDM #100 is present.','', '[]'::jsonb,1),(3,'11.a','MP2','Correctly use STO with a labelled address for the constant or answer.','', '[]'::jsonb,2),
    (3,'11.a','MP3','Correctly use LDD 632.','', '[]'::jsonb,3),(3,'11.a','MP4','Correctly use SUB with the labelled constant address.','', '[]'::jsonb,4),
    (3,'11.a','MP5','Store 100 at a labelled address away from the code.','', '[]'::jsonb,5),(3,'11.a','MP6','Label both data addresses away from the code.','', '[]'::jsonb,6)
), validated as (
  select e.* from eligible e
  where (e.scheme_kind='all_required' and (select count(*) from point_defs p where p.component=e.component and p.path=e.path)=e.expected_marks)
     or (e.scheme_kind='any_n_from_m' and (select coalesce(sum(g.max_marks),0) from group_defs g where g.component=e.component and g.path=e.path)=e.expected_marks)
), deleted_points as (
  delete from mark_scheme_points p using validated v where p.mark_scheme_id=v.mark_scheme_id returning p.mark_scheme_id
), deleted_groups as (
  delete from mark_scheme_groups g using validated v where g.id=v.old_group_id and exists(select 1 from deleted_points d where d.mark_scheme_id=v.mark_scheme_id) returning g.mark_scheme_id
), groups as (
  insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
  select v.mark_scheme_id,g.label,g.n_required,1,g.max_marks,g.sort_order,'fixed'
  from validated v join group_defs g on g.component=v.component and g.path=v.path
  where exists(select 1 from deleted_groups d where d.mark_scheme_id=v.mark_scheme_id)
  returning id,mark_scheme_id,label
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select v.mark_scheme_id,g.id,p.code,p.point_text,1,'[]'::jsonb,'[]'::jsonb,p.requires,false,p.sort_order
from validated v join point_defs p on p.component=v.component and p.path=v.path
left join groups g on g.mark_scheme_id=v.mark_scheme_id and g.label=nullif(p.group_label,'')
where exists(select 1 from deleted_groups d where d.mark_scheme_id=v.mark_scheme_id)
  and (nullif(p.group_label,'') is null or g.id is not null);

with target(component,path,expected_marks,scheme_kind,expected_points,expected_groups) as (
  values (2,'4.a',6,'all_required',6,0),(2,'6.b',7,'all_required',7,0),(2,'8.a',7,'all_required',7,0),(2,'8.b',8,'all_required',8,0),
         (3,'1.a.ii',2,'all_required',2,0),(3,'1.b.i',2,'all_required',2,0),(3,'9.a.i',5,'any_n_from_m',6,1),(3,'10',3,'any_n_from_m',5,2),(3,'11.a',6,'all_required',6,0)
), resolved as (
  select t.*,ms.id mark_scheme_id from target t
  join source_papers sp on sp.year=2025 and sp.series::text='ON' and sp.variant=1 and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=t.component
  join questions q on q.source_paper_id=sp.id and q.path=t.path and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), valid as (
  select r.* from resolved r where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=r.expected_points
    and (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_groups
    and (r.expected_groups=0 or (select coalesce(sum(g.max_marks),0) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_marks)
    and (r.path<>'4.a' or exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP4' and p.requires='["MP3"]'::jsonb))
    and (r.path<>'6.b' or exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP5' and p.requires='["MP4"]'::jsonb))
    and (r.path<>'8.a' or exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP6' and p.requires='["MP5"]'::jsonb))
)
update mark_schemes ms set scheme_type=v.scheme_kind::scheme_type,prompt_version='atomic-source-2025-on-explicit-code-v1',updated_at=now() from valid v where ms.id=v.mark_scheme_id;
