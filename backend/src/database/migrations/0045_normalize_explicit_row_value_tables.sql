-- Source-backed atomic normalization for explicit one-mark-per-row/value tables.
--
-- Every target publishes an unambiguous row/value allocation with one mark per
-- row and no alternative scoring path. Only unused single-wrapper schemes are
-- eligible. Points are all-required because published row count = question max.
-- Natural keys and a post-insert shape check keep the migration idempotent.

with target(year,series,component,variant,display_ref,expected_marks) as (
  values
    (2021,'MJ',2,2,'1.a.i',4),(2021,'MJ',2,2,'1.a.ii',4),(2021,'MJ',2,2,'1.b',3),(2021,'MJ',2,2,'2.a.i',4),
    (2021,'ON',2,1,'1.b',4),(2021,'ON',2,3,'1.b',4),(2021,'ON',2,2,'1.b',3),(2021,'ON',2,2,'1.c',4),
    (2022,'MJ',2,1,'1.c',4),(2022,'MJ',2,1,'2.a',3),(2022,'MJ',2,1,'4.a',2),(2022,'MJ',2,2,'1.b',4)
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
), defs(year,series,variant,display_ref,code,point_text,sort_order) as (
  values
    (2021,'MJ',2,'1.a.i','R1','Name has data type STRING.',1),
    (2021,'MJ',2,'1.a.i','R2','Index has data type INTEGER.',2),
    (2021,'MJ',2,'1.a.i','R3','Modified has data type BOOLEAN.',3),
    (2021,'MJ',2,'1.a.i','R4','Holiday has data type DATE.',4),

    (2021,'MJ',2,'1.a.ii','R1','Modified OR Index > 100 evaluates to FALSE.',1),
    (2021,'MJ',2,'1.a.ii','R2','LENGTH("Student: " & Name) evaluates to 18.',2),
    (2021,'MJ',2,'1.a.ii','R3','INT(Index + 2.9) evaluates to 102.',3),
    (2021,'MJ',2,'1.a.ii','R4','MID(Name, 1, 3) evaluates to "Cat".',4),

    (2021,'MJ',2,'1.b','R1','Index ← Index + 1 is classified as Assignment.',1),
    (2021,'MJ',2,'1.b','R2','IF Modified = TRUE THEN is classified as Selection.',2),
    (2021,'MJ',2,'1.b','R3','ENDWHILE is classified as Iteration.',3),

    (2021,'MJ',2,'2.a.i','R1','The number of transitions resulting in a different state is 3.',1),
    (2021,'MJ',2,'2.a.i','R2','The number of transitions with associated outputs is 2.',2),
    (2021,'MJ',2,'2.a.i','R3','The label replacing X is Start.',3),
    (2021,'MJ',2,'2.a.i','R4','The final / halting state is S3.',4),

    (2021,'ON',1,'1.b','R1','The average mark in a class of 40 students has data type REAL.',1),
    (2021,'ON',1,'1.b','R2','An email address has data type STRING.',2),
    (2021,'ON',1,'1.b','R3','The number of students in the class has data type INTEGER.',3),
    (2021,'ON',1,'1.b','R4','Whether an email has been read has data type BOOLEAN.',4),
    (2021,'ON',3,'1.b','R1','The average mark in a class of 40 students has data type REAL.',1),
    (2021,'ON',3,'1.b','R2','An email address has data type STRING.',2),
    (2021,'ON',3,'1.b','R3','The number of students in the class has data type INTEGER.',3),
    (2021,'ON',3,'1.b','R4','Whether an email has been read has data type BOOLEAN.',4),

    (2021,'ON',2,'1.b','R1','The number of dimensions of ThisArray is 1.',1),
    (2021,'ON',2,'1.b','R2','The minimum and maximum values that variable n may take are the lower bound and upper bound.',2),
    (2021,'ON',2,'1.b','R3','The variable n in the array expression is the index / subscript.',3),

    (2021,'ON',2,'1.c','R1','ASC(''C'') evaluates to 67.',1),
    (2021,'ON',2,'1.c','R2','2 * STR_TO_NUM("27") evaluates to 54.',2),
    (2021,'ON',2,'1.c','R3','INT(27 / 2) evaluates to 13.',3),
    (2021,'ON',2,'1.c','R4','"Sub" & MID("Abstraction", 4, 5) evaluates to "Subtract".',4),

    (2022,'MJ',1,'1.c','R1','INT((31 / 3) + 1) evaluates to 11.',1),
    (2022,'MJ',1,'1.c','R2','MID(TO_UPPER("Version"), 4, 2) evaluates to "SI".',2),
    (2022,'MJ',1,'1.c','R3','TRUE AND (NOT FALSE) evaluates to TRUE.',3),
    (2022,'MJ',1,'1.c','R4','NUM_TO_STR(27 MOD 3) evaluates to "0".',4),

    (2022,'MJ',1,'2.a','R1','The number of different inputs is 3.',1),
    (2022,'MJ',1,'2.a','R2','The number of different outputs is 3.',2),
    (2022,'MJ',1,'2.a','R3','The single input value that could result in S4 is Button-Y.',3),

    (2022,'MJ',1,'4.a','R1','The value that has been on the stack for the longest time is H.',1),
    (2022,'MJ',1,'4.a','R2','TopOfStack points to memory location 206 after three POP operations.',2),

    (2022,'MJ',2,'1.b','R1','Producing an identifier table is in the Design stage.',1),
    (2022,'MJ',2,'1.b','R2','Syntax errors can occur in the Coding stage.',2),
    (2022,'MJ',2,'1.b','R3','Discussing program requirements with the customer is in the Analysis stage.',3),
    (2022,'MJ',2,'1.b','R4','Producing a trace table is in the Testing stage.',4)
), validated as (
  select e.* from eligible e
  where (select count(*) from defs d where d.year=e.year and d.series=e.series and d.variant=e.variant and d.display_ref=e.display_ref)=e.expected_marks
    and (select count(distinct d.code) from defs d where d.year=e.year and d.series=e.series and d.variant=e.variant and d.display_ref=e.display_ref)=e.expected_marks
), deleted as (
  delete from mark_scheme_points p using validated v where p.mark_scheme_id=v.mark_scheme_id returning p.mark_scheme_id
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select v.mark_scheme_id,null,d.code,d.point_text,1,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,false,d.sort_order
from validated v join defs d on d.year=v.year and d.series=v.series and d.variant=v.variant and d.display_ref=v.display_ref
where exists(select 1 from deleted x where x.mark_scheme_id=v.mark_scheme_id);

with target(year,series,component,variant,display_ref,expected_marks) as (
  values
    (2021,'MJ',2,2,'1.a.i',4),(2021,'MJ',2,2,'1.a.ii',4),(2021,'MJ',2,2,'1.b',3),(2021,'MJ',2,2,'2.a.i',4),
    (2021,'ON',2,1,'1.b',4),(2021,'ON',2,3,'1.b',4),(2021,'ON',2,2,'1.b',3),(2021,'ON',2,2,'1.c',4),
    (2022,'MJ',2,1,'1.c',4),(2022,'MJ',2,1,'2.a',3),(2022,'MJ',2,1,'4.a',2),(2022,'MJ',2,2,'1.b',4)
), resolved as (
  select t.*,ms.id mark_scheme_id
  from target t join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=t.component
  join questions q on q.source_paper_id=sp.id and q.display_ref=t.display_ref and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), valid as (
  select r.* from resolved r where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=r.expected_marks
)
update mark_schemes ms set scheme_type='all_required'::scheme_type,prompt_version='atomic-source-explicit-row-values-v1',updated_at=now() from valid v where ms.id=v.mark_scheme_id;
