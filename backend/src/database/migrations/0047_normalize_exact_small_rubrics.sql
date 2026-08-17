-- Source-backed normalization for five exact small rubrics with no alternative path.
-- Cambridge's published mark point is preserved as the atomic scoring unit.
-- Only unused single-wrapper schemes are eligible; natural keys make re-runs safe.

with target(year,series,component,variant,display_ref,expected_marks) as (
  values
    (2021,'ON',2,2,'4.c.i',2),
    (2021,'ON',2,2,'5.b.ii',2),
    (2022,'MJ',1,1,'6.a.i',5),
    (2022,'MJ',1,3,'5.b.iii',2),
    (2022,'MJ',2,2,'2',4)
), resolved as (
  select t.*,q.id question_id,ms.id mark_scheme_id
  from target t
  join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=t.component
  join questions q on q.source_paper_id=sp.id and q.display_ref=t.display_ref and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), eligible as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=1
    and not exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from assignment_questions aq where aq.question_id=r.question_id)
    and not exists(select 1 from answers a where a.question_id=r.question_id)
    and not exists(select 1 from grading_points gp join mark_scheme_points p on p.id=gp.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from error_patterns ep join mark_scheme_points p on p.id=ep.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from flashcards f join mark_scheme_points p on p.id=f.source_mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
), defs(year,series,component,variant,display_ref,code,point_text,requires,sort_order) as (
  values
    (2021,'ON',2,2,'4.c.i','MP1','Structure: a count-controlled loop.','[]'::jsonb,1),
    (2021,'ON',2,2,'4.c.i','MP2','Justification: the number of iterations is known / repeats for the length of InString.','[]'::jsonb,2),

    (2021,'ON',2,2,'5.b.ii','MP1','Advantage: fewer file operations are required.','[]'::jsonb,1),
    (2021,'ON',2,2,'5.b.ii','MP2','Disadvantage: the algorithm to combine / extract individual data items is more complex.','[]'::jsonb,2),

    (2022,'MJ',1,1,'6.a.i','MP1','The Program Counter holds the address of the next instruction.','[]'::jsonb,1),
    (2022,'MJ',1,1,'6.a.i','MP2','The Program Counter contents are incremented / changed to the next address each cycle.','["MP1"]'::jsonb,2),
    (2022,'MJ',1,1,'6.a.i','MP3','The Memory Address Register holds the address from which data is fetched, from the Program Counter.','[]'::jsonb,3),
    (2022,'MJ',1,1,'6.a.i','MP4','The Memory Data Register holds the data at the address in the Memory Address Register.','[]'::jsonb,4),
    (2022,'MJ',1,1,'6.a.i','MP5','The instruction is transferred to the Current Instruction Register for decoding and execution.','[]'::jsonb,5),

    (2022,'MJ',1,3,'5.b.iii','MP1','Validation checks that data is reasonable / within bounds; it does not check that accurate data has been entered.','[]'::jsonb,1),
    (2022,'MJ',1,3,'5.b.iii','MP2','Verification checks whether data matches the supplied data; it does not check whether the original data is accurate.','[]'::jsonb,2),

    (2022,'MJ',2,2,'2','MP1','Initialise Count before the loop AND input NextNum in a loop.','[]'::jsonb,1),
    (2022,'MJ',2,2,'2','MP2','Loop until NextNum < 0 AND output a statement including Count plus a message.','[]'::jsonb,2),
    (2022,'MJ',2,2,'2','MP3','Use IsPrime(NextNum) as a function that returns a value.','[]'::jsonb,3),
    (2022,'MJ',2,2,'2','MP4','Check the returned value AND increment Count if appropriate.','[]'::jsonb,4)
), validated as (
  select e.* from eligible e
  where (select count(*) from defs d where d.year=e.year and d.series=e.series and d.component=e.component and d.variant=e.variant and d.display_ref=e.display_ref)=e.expected_marks
    and (select count(distinct d.code) from defs d where d.year=e.year and d.series=e.series and d.component=e.component and d.variant=e.variant and d.display_ref=e.display_ref)=e.expected_marks
), deleted as (
  delete from mark_scheme_points p using validated v where p.mark_scheme_id=v.mark_scheme_id returning p.mark_scheme_id
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select v.mark_scheme_id,null,d.code,d.point_text,1,'[]'::jsonb,'[]'::jsonb,d.requires,false,d.sort_order
from validated v join defs d on d.year=v.year and d.series=v.series and d.component=v.component and d.variant=v.variant and d.display_ref=v.display_ref
where exists(select 1 from deleted x where x.mark_scheme_id=v.mark_scheme_id);

with target(year,series,component,variant,display_ref,expected_marks) as (
  values
    (2021,'ON',2,2,'4.c.i',2),(2021,'ON',2,2,'5.b.ii',2),(2022,'MJ',1,1,'6.a.i',5),(2022,'MJ',1,3,'5.b.iii',2),(2022,'MJ',2,2,'2',4)
), resolved as (
  select t.*,ms.id mark_scheme_id from target t
  join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=t.component
  join questions q on q.source_paper_id=sp.id and q.display_ref=t.display_ref and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), valid as (
  select r.* from resolved r where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=r.expected_marks
    and (r.display_ref<>'6.a.i' or exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP2' and p.requires='["MP1"]'::jsonb))
)
update mark_schemes ms set scheme_type='all_required'::scheme_type,prompt_version='atomic-source-exact-small-v1',updated_at=now() from valid v where ms.id=v.mark_scheme_id;
