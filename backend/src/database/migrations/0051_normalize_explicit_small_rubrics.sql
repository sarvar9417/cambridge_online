-- Source-backed atomic normalization for small explicit Cambridge rubrics.
-- Targets here have exact published row/point allocations, no mutually exclusive
-- solution branch, and zero assignment/answer/grading/error/flashcard usage.
-- Natural keys + single-wrapper eligibility make this idempotent.

with target(year,series,component,variant,display_ref,expected_marks) as (
  values
    (2021,'MJ',2,2,'3.c',2),(2021,'MJ',2,2,'5.b.i',4),(2021,'MJ',2,2,'5.b.ii',2),
    (2022,'MJ',2,1,'1.b.i',4),(2022,'MJ',2,1,'1.b.ii',2),(2022,'MJ',2,1,'4.b',4),
    (2022,'MJ',2,2,'1.d',4),(2022,'MJ',2,3,'6.b',4),(2022,'MJ',2,3,'7.c',2),
    (2022,'MJ',3,1,'5.a',2),(2022,'MJ',3,3,'5.a',2),(2022,'MJ',3,1,'9.b',7),(2022,'MJ',3,2,'2.c',4)
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
    and not exists(select 1 from assignment_questions x where x.question_id=r.question_id)
    and not exists(select 1 from answers x where x.question_id=r.question_id)
    and not exists(select 1 from grading_points x join mark_scheme_points p on p.id=x.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from error_patterns x join mark_scheme_points p on p.id=x.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from flashcards x join mark_scheme_points p on p.id=x.source_mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
), defs(year,series,component,variant,display_ref,code,point_text,requires,sort_order) as (
  values
    (2021,'MJ',2,2,'3.c','M1','Name: Null pointer','[]'::jsonb,1),
    (2021,'MJ',2,2,'3.c','M2','Meaning: There are no further nodes in the list','[]'::jsonb,2),
    (2021,'MJ',2,2,'5.b.i','R1','Initialisation statement is on line 07.','[]'::jsonb,1),
    (2021,'MJ',2,2,'5.b.i','R2','Start of a repeating block is on line 09 or 10.','[]'::jsonb,2),
    (2021,'MJ',2,2,'5.b.i','R3','Logic statement is on line 12.','[]'::jsonb,3),
    (2021,'MJ',2,2,'5.b.i','R4','Function MID() has 3 parameters.','[]'::jsonb,4),
    (2021,'MJ',2,2,'5.b.ii','M1','Uses IF ... AND ... in the condition.','[]'::jsonb,1),
    (2021,'MJ',2,2,'5.b.ii','M2','Uses both conditions: NextChar >= ''a'' and NextChar <= ''z''.','[]'::jsonb,2),
    (2022,'MJ',2,1,'1.b.i','R1','Temp has data type REAL.','[]'::jsonb,1),
    (2022,'MJ',2,1,'1.b.i','R2','PetName has data type STRING.','[]'::jsonb,2),
    (2022,'MJ',2,1,'1.b.i','R3','MyDOB has data type DATE.','[]'::jsonb,3),
    (2022,'MJ',2,1,'1.b.i','R4','LightOn has data type BOOLEAN.','[]'::jsonb,4),
    (2022,'MJ',2,1,'1.b.ii','M1','Variable name identified as Temp.','[]'::jsonb,1),
    (2022,'MJ',2,1,'1.b.ii','M2','Reason: the name does not indicate what the variable is used for.','[]'::jsonb,2),
    (2022,'MJ',2,1,'4.b','M1','TopOfStack points to D.','[]'::jsonb,1),
    (2022,'MJ',2,1,'4.b','M2','Value D is stored in location 201.','[]'::jsonb,2),
    (2022,'MJ',2,1,'4.b','M3','Values C and A are stored in locations 202 and 203.','[]'::jsonb,3),
    (2022,'MJ',2,1,'4.b','M4','Values X through P are unchanged in locations 204 to 207.','[]'::jsonb,4),
    (2022,'MJ',2,2,'1.d','R1','Status ← TRUE AND FALSE has NO ERROR.','[]'::jsonb,1),
    (2022,'MJ',2,2,'1.d','R2','In LENGTH("Password") < "10", 10 must be an integer rather than a string.','[]'::jsonb,2),
    (2022,'MJ',2,2,'1.d','R3','LCASE("Electrical") is invalid because the parameter must be a CHAR, or LCASE should be TO_LOWER.','[]'::jsonb,3),
    (2022,'MJ',2,2,'1.d','R4','IS_NUM(-27.3) is invalid because the parameter must be a STRING or CHAR, not a number.','[]'::jsonb,4),
    (2022,'MJ',2,3,'6.b','M1','Rows A, B and C are all correct: test Num > 9? with YES and NO branches.','[]'::jsonb,1),
    (2022,'MJ',2,3,'6.b','M2','Row D sets an identifier to Factorial(Num).','[]'::jsonb,2),
    (2022,'MJ',2,3,'6.b','M3','Row E outputs the factorial message with Num and the result identifier.','[]'::jsonb,3),
    (2022,'MJ',2,3,'6.b','M4','Row F increments Num by 1.','[]'::jsonb,4),
    (2022,'MJ',2,3,'7.c','M1','Assigns to LineNum using MOD.','[]'::jsonb,1),
    (2022,'MJ',2,3,'7.c','M2','Completely correct cyclic assignment: LineNum ← (LineNum MOD 3) + 1, or equivalent.','["M1"]'::jsonb,2),
    (2022,'MJ',3,1,'5.a','M1','First postfix expression: jk+','[]'::jsonb,1),
    (2022,'MJ',3,1,'5.a','M2','Second postfix expression: jk-/','[]'::jsonb,2),
    (2022,'MJ',3,3,'5.a','M1','First postfix expression: jk+','[]'::jsonb,1),
    (2022,'MJ',3,3,'5.a','M2','Second postfix expression: jk-/','[]'::jsonb,2),
    (2022,'MJ',3,1,'9.b','M1','LDM #20 is used.','[]'::jsonb,1),
    (2022,'MJ',3,1,'9.b','M2','20 is stored at an address.','[]'::jsonb,2),
    (2022,'MJ',3,1,'9.b','M3','That address is labelled, for example Twenty, away from program code.','[]'::jsonb,3),
    (2022,'MJ',3,1,'9.b','M4','Addresses away from program code are labelled Y and Z.','[]'::jsonb,4),
    (2022,'MJ',3,1,'9.b','M5','LDI Y is used correctly.','[]'::jsonb,5),
    (2022,'MJ',3,1,'9.b','M6','STO Z is used correctly.','[]'::jsonb,6),
    (2022,'MJ',3,1,'9.b','M7','ADD is used correctly with the labelled address.','[]'::jsonb,7),
    (2022,'MJ',3,2,'2.c','M1','Correct use of X.','[]'::jsonb,1),
    (2022,'MJ',3,2,'2.c','M2','Two other variables are in correct positions.','[]'::jsonb,2),
    (2022,'MJ',3,2,'2.c','M3','Three correct clauses are present in any order.','[]'::jsonb,3),
    (2022,'MJ',3,2,'2.c','M4','Correct declarative syntax for teaches(R,S), studies(X,S), tutors(R,X).','[]'::jsonb,4)
), valid as (
  select e.* from eligible e
  where (select count(*) from defs d where d.year=e.year and d.series=e.series and d.component=e.component and d.variant=e.variant and d.display_ref=e.display_ref)=e.expected_marks
), deleted as (
  delete from mark_scheme_points p using valid v where p.mark_scheme_id=v.mark_scheme_id returning p.mark_scheme_id
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select v.mark_scheme_id,null,d.code,d.point_text,1,'[]'::jsonb,'[]'::jsonb,d.requires,false,d.sort_order
from valid v join defs d on d.year=v.year and d.series=v.series and d.component=v.component and d.variant=v.variant and d.display_ref=v.display_ref
where exists(select 1 from deleted x where x.mark_scheme_id=v.mark_scheme_id);

with target(year,series,component,variant,display_ref,expected_marks) as (
  values
    (2021,'MJ',2,2,'3.c',2),(2021,'MJ',2,2,'5.b.i',4),(2021,'MJ',2,2,'5.b.ii',2),
    (2022,'MJ',2,1,'1.b.i',4),(2022,'MJ',2,1,'1.b.ii',2),(2022,'MJ',2,1,'4.b',4),
    (2022,'MJ',2,2,'1.d',4),(2022,'MJ',2,3,'6.b',4),(2022,'MJ',2,3,'7.c',2),
    (2022,'MJ',3,1,'5.a',2),(2022,'MJ',3,3,'5.a',2),(2022,'MJ',3,1,'9.b',7),(2022,'MJ',3,2,'2.c',4)
), resolved as (
  select t.*,ms.id mark_scheme_id
  from target t join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=t.component
  join questions q on q.source_paper_id=sp.id and q.display_ref=t.display_ref and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), valid as (
  select r.* from resolved r where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=r.expected_marks
)
update mark_schemes ms set scheme_type='all_required'::scheme_type,prompt_version='atomic-source-explicit-small-v1',updated_at=now() from valid v where ms.id=v.mark_scheme_id;
