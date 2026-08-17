-- Source-backed normalization for repeated explicit row/value and capped-pool families.
-- Twenty-six schemes across paired variants are covered. Two superficially similar
-- 2021 O/N C1 Q1(b)(i) wrappers are deliberately excluded because extraction does
-- not make the final answer semantic value sufficiently explicit.
--
-- Only unused single-wrapper schemes are eligible; natural keys and post-shape
-- validation keep the migration idempotent.

with target(year,series,component,variant,display_ref,expected_marks,scheme_kind) as (
  values
    (2021,'ON',1,1,'6.b',4,'all_required'),(2021,'ON',1,3,'6.b',4,'all_required'),
    (2021,'MJ',2,1,'1.a',4,'all_required'),(2021,'MJ',2,3,'1.a',4,'all_required'),
    (2021,'MJ',2,1,'1.b',5,'all_required'),(2021,'MJ',2,3,'1.b',5,'all_required'),
    (2021,'MJ',2,1,'4.c.ii',2,'all_required'),(2021,'MJ',2,3,'4.c.ii',2,'all_required'),
    (2021,'ON',2,1,'1.c.iii',2,'any_n_from_m'),(2021,'ON',2,3,'1.c.iii',2,'any_n_from_m'),
    (2021,'ON',2,1,'4.a',4,'all_required'),(2021,'ON',2,3,'4.a',4,'all_required'),
    (2021,'ON',2,1,'5.c',7,'all_required'),(2021,'ON',2,3,'5.c',7,'all_required'),
    (2022,'MJ',3,1,'1.a',2,'all_required'),(2022,'MJ',3,3,'1.a',2,'all_required'),
    (2022,'MJ',3,1,'1.c',3,'any_n_from_m'),(2022,'MJ',3,3,'1.c',3,'any_n_from_m'),
    (2022,'MJ',3,1,'2.a',2,'all_required'),(2022,'MJ',3,3,'2.a',2,'all_required'),
    (2022,'MJ',3,1,'8.a.ii',2,'all_required'),(2022,'MJ',3,3,'8.a.ii',2,'all_required'),
    (2023,'MJ',3,1,'3.a',2,'any_n_from_m'),(2023,'MJ',3,3,'3.a',2,'any_n_from_m'),
    (2023,'ON',3,1,'2.a',4,'all_required'),(2023,'ON',3,3,'2.a',4,'all_required')
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
), group_defs(year,series,component,display_ref,label,n_required,max_marks,sort_order) as (
  values
    (2021,'ON',2,'1.c.iii','answers',2,2,1),
    (2022,'MJ',3,'1.c','definition',2,2,1),(2022,'MJ',3,'1.c','example',1,1,2),
    (2023,'MJ',3,'3.a','hash_values',2,2,1)
), point_defs(year,series,component,display_ref,code,point_text,group_label,requires,sort_order) as (
  values
    (2021,'ON',1,'6.b','R1','ACC 11111111 with OR 101 gives 11111111.',null,'[]'::jsonb,1),
    (2021,'ON',1,'6.b','R2','ACC 00000000 with XOR #15 gives 00001111.',null,'[]'::jsonb,2),
    (2021,'ON',1,'6.b','R3','ACC 10101010 with LSR #2 gives 00101010.',null,'[]'::jsonb,3),
    (2021,'ON',1,'6.b','R4','ACC 01010101 with AND 104 gives 00000000.',null,'[]'::jsonb,4),

    (2021,'MJ',2,'1.a','R1','For example value "Wong", use variable name MemberName with data type STRING.',null,'[]'::jsonb,1),
    (2021,'MJ',2,'1.a','R2','For example value FALSE, use variable name FamilyMember with data type BOOLEAN.',null,'[]'::jsonb,2),
    (2021,'MJ',2,'1.a','R3','For example value 19/02/1983, use variable name StartDate with data type DATE.',null,'[]'::jsonb,3),
    (2021,'MJ',2,'1.a','R4','For example value 1345, use variable name Points with data type INTEGER.',null,'[]'::jsonb,4),

    (2021,'MJ',2,'1.b','R1','Result ← 2 & 4 contains an arithmetic/type/operator error: use an arithmetic operator, or treat 2 and 4 as CHAR/STRING for concatenation.',null,'[]'::jsonb,1),
    (2021,'MJ',2,'1.b','R2','SubString ← MID("pseudocode", 4, 1) has NO ERROR.',null,'[]'::jsonb,2),
    (2021,'MJ',2,'1.b','R3','IF x = 3 OR 4 THEN is incorrect because the operands/condition around OR are not Boolean / the condition is malformed.',null,'[]'::jsonb,3),
    (2021,'MJ',2,'1.b','R4','Result ← Status AND INT(X/2) is incorrect because INT(X/2) does not evaluate to Boolean / the operator is inappropriate.',null,'[]'::jsonb,4),
    (2021,'MJ',2,'1.b','R5','Message ← "Done" + LENGTH(MyString) is invalid because a string cannot be added to a number.',null,'[]'::jsonb,5),

    (2021,'MJ',2,'4.c.ii','MP1','Line number: 26.',null,'[]'::jsonb,1),
    (2021,'MJ',2,'4.c.ii','MP2','Move line 26 to after line 27 / to line 28.',null,'[]'::jsonb,2),

    (2021,'ON',2,'1.c.iii','A1','Destination / arrival airport.','answers','[]'::jsonb,1),
    (2021,'ON',2,'1.c.iii','A2','Arrival time / flight duration.','answers','[]'::jsonb,2),
    (2021,'ON',2,'1.c.iii','A3','Date of flight.','answers','[]'::jsonb,3),
    (2021,'ON',2,'1.c.iii','A4','Seat number.','answers','[]'::jsonb,4),
    (2021,'ON',2,'1.c.iii','A5','Seat availability.','answers','[]'::jsonb,5),

    (2021,'ON',2,'4.a','R1','Boundary test value 0: Boundary Data; expected outcome Data is accepted.',null,'[]'::jsonb,1),
    (2021,'ON',2,'4.a','R2','Boundary test value 40: Boundary Data; expected outcome Data is accepted.',null,'[]'::jsonb,2),
    (2021,'ON',2,'4.a','R3','Abnormal test value >= 41: Abnormal Data; expected outcome Data is rejected.',null,'[]'::jsonb,3),
    (2021,'ON',2,'4.a','R4','Abnormal test value <= -1: Abnormal Data; expected outcome Data is rejected.',null,'[]'::jsonb,4),

    (2021,'ON',2,'5.c','MP1','Function heading and ending include the StudentID parameter and INTEGER return type.',null,'[]'::jsonb,1),
    (2021,'ON',2,'5.c','MP2','Open LogFile for APPEND and subsequently close it.',null,'[]'::jsonb,2),
    (2021,'ON',2,'5.c','MP3','Loop for 2000 iterations.',null,'[]'::jsonb,3),
    (2021,'ON',2,'5.c','MP4','Extract the first 6 characters from an array element in the loop.',null,'[]'::jsonb,4),
    (2021,'ON',2,'5.c','MP5','Compare the first 6 characters with the parameter in the loop.',null,'[]'::jsonb,5),
    (2021,'ON',2,'5.c','MP6','If equal, write the whole array element to the file, increment Count, and clear the array element in the loop.',null,'[]'::jsonb,6),
    (2021,'ON',2,'5.c','MP7','Return Count; Count must have been declared and initialised.',null,'[]'::jsonb,7),

    (2022,'MJ',3,'1.a','MP1','LibraryBook.Title ← "A Level Computer Science".',null,'[]'::jsonb,1),
    (2022,'MJ',3,'1.a','MP2','LibraryBook.Fiction ← FALSE.',null,'[]'::jsonb,2),

    (2022,'MJ',3,'1.c','D1','A user-defined data type is constructed by a programmer / is not a primitive data type.','definition','[]'::jsonb,1),
    (2022,'MJ',3,'1.c','D2','A user-defined data type references at least one other data type.','definition','[]'::jsonb,2),
    (2022,'MJ',3,'1.c','D3','The referenced data types can be primitive or user-defined.','definition','["D2"]'::jsonb,3),
    (2022,'MJ',3,'1.c','E1','Example: class / object / set.','example','[]'::jsonb,4),

    (2022,'MJ',3,'2.a','MP1','type(caracal, wild).',null,'[]'::jsonb,1),
    (2022,'MJ',3,'2.a','MP2','hair(caracal, short).',null,'[]'::jsonb,2),

    (2022,'MJ',3,'8.a.ii','MP1','Symmetric.',null,'[]'::jsonb,1),
    (2022,'MJ',3,'8.a.ii','MP2','Asymmetric.',null,'[]'::jsonb,2),

    (2023,'MJ',3,'3.a','H1','Record key 1030 has hash value 1.','hash_values','[]'::jsonb,1),
    (2023,'MJ',3,'3.a','H2','Record key 1050 has hash value 0.','hash_values','[]'::jsonb,2),
    (2023,'MJ',3,'3.a','H3','Record key 1025 has hash value 2.','hash_values','[]'::jsonb,3),

    (2023,'ON',3,'2.a','R1','HTTP maps to transmitting hypertext documents.',null,'[]'::jsonb,1),
    (2023,'ON',3,'2.a','R2','BitTorrent maps to peer-to-peer file sharing.',null,'[]'::jsonb,2),
    (2023,'ON',3,'2.a','R3','SMTP maps to sending email messages towards the intended destination.',null,'[]'::jsonb,3),
    (2023,'ON',3,'2.a','R4','IMAP maps to retrieving email messages from a mail server over a TCP/IP connection.',null,'[]'::jsonb,4)
), validated as (
  select e.* from eligible e
  where (select count(*) from point_defs p where p.year=e.year and p.series=e.series and p.component=e.component and p.display_ref=e.display_ref)>0
    and (e.scheme_kind='all_required' and (select count(*) from point_defs p where p.year=e.year and p.series=e.series and p.component=e.component and p.display_ref=e.display_ref)=e.expected_marks
         or e.scheme_kind='any_n_from_m' and (select coalesce(sum(g.max_marks),0) from group_defs g where g.year=e.year and g.series=e.series and g.component=e.component and g.display_ref=e.display_ref)=e.expected_marks)
), deleted as (
  delete from mark_scheme_points p using validated v where p.mark_scheme_id=v.mark_scheme_id returning p.mark_scheme_id
), groups as (
  insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
  select v.mark_scheme_id,g.label,g.n_required,1,g.max_marks,g.sort_order,'fixed'
  from validated v join group_defs g on g.year=v.year and g.series=v.series and g.component=v.component and g.display_ref=v.display_ref
  where exists(select 1 from deleted d where d.mark_scheme_id=v.mark_scheme_id)
  returning id,mark_scheme_id,label
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select v.mark_scheme_id,g.id,p.code,p.point_text,1,'[]'::jsonb,'[]'::jsonb,p.requires,false,p.sort_order
from validated v join point_defs p on p.year=v.year and p.series=v.series and p.component=v.component and p.display_ref=v.display_ref
left join groups g on g.mark_scheme_id=v.mark_scheme_id and g.label=p.group_label
where exists(select 1 from deleted d where d.mark_scheme_id=v.mark_scheme_id)
  and (p.group_label is null or g.id is not null);

with target(year,series,component,variant,display_ref,expected_marks,scheme_kind,expected_points) as (
  values
    (2021,'ON',1,1,'6.b',4,'all_required',4),(2021,'ON',1,3,'6.b',4,'all_required',4),
    (2021,'MJ',2,1,'1.a',4,'all_required',4),(2021,'MJ',2,3,'1.a',4,'all_required',4),
    (2021,'MJ',2,1,'1.b',5,'all_required',5),(2021,'MJ',2,3,'1.b',5,'all_required',5),
    (2021,'MJ',2,1,'4.c.ii',2,'all_required',2),(2021,'MJ',2,3,'4.c.ii',2,'all_required',2),
    (2021,'ON',2,1,'1.c.iii',2,'any_n_from_m',5),(2021,'ON',2,3,'1.c.iii',2,'any_n_from_m',5),
    (2021,'ON',2,1,'4.a',4,'all_required',4),(2021,'ON',2,3,'4.a',4,'all_required',4),
    (2021,'ON',2,1,'5.c',7,'all_required',7),(2021,'ON',2,3,'5.c',7,'all_required',7),
    (2022,'MJ',3,1,'1.a',2,'all_required',2),(2022,'MJ',3,3,'1.a',2,'all_required',2),
    (2022,'MJ',3,1,'1.c',3,'any_n_from_m',4),(2022,'MJ',3,3,'1.c',3,'any_n_from_m',4),
    (2022,'MJ',3,1,'2.a',2,'all_required',2),(2022,'MJ',3,3,'2.a',2,'all_required',2),
    (2022,'MJ',3,1,'8.a.ii',2,'all_required',2),(2022,'MJ',3,3,'8.a.ii',2,'all_required',2),
    (2023,'MJ',3,1,'3.a',2,'any_n_from_m',3),(2023,'MJ',3,3,'3.a',2,'any_n_from_m',3),
    (2023,'ON',3,1,'2.a',4,'all_required',4),(2023,'ON',3,3,'2.a',4,'all_required',4)
), resolved as (
  select t.*,ms.id mark_scheme_id
  from target t join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=t.component
  join questions q on q.source_paper_id=sp.id and q.display_ref=t.display_ref and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), valid as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=r.expected_points
    and (r.scheme_kind='all_required' or (select coalesce(sum(g.max_marks),0) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_marks)
)
update mark_schemes ms
set scheme_type=v.scheme_kind::scheme_type,prompt_version='atomic-source-repeated-explicit-values-v1',updated_at=now()
from valid v where ms.id=v.mark_scheme_id;
