-- Source-backed atomic normalization for a conservative 2021 legacy batch.
-- Only rubrics with explicit one-mark-per-point, Max n, section caps, or
-- numbered marking-point lists are decomposed. Alternative/variation layouts
-- are deliberately excluded from this batch.
--
-- Safety:
--   * natural paper/question keys only
--   * only a single structural wrapper may be replaced
--   * refuse replacement when assignments, answers, grading points, error
--     patterns, or flashcards already use the target question/point
--   * group caps reproduce published Cambridge section/overall Max rules
--   * idempotent: already-normalized schemes are not eligible

with target(year, series, component, variant, display_ref, expected_marks, scheme_kind) as (
  values
    (2021,'MJ',1,2,'5.b',4,'any_n_from_m'),
    (2021,'MJ',1,2,'7.b.i',4,'any_n_from_m'),
    (2021,'MJ',1,3,'1.a.ii',3,'all_required'),
    (2021,'MJ',1,3,'1.b',3,'all_required'),
    (2021,'MJ',1,3,'4.d',3,'all_required'),
    (2021,'ON',1,1,'2.c',3,'any_n_from_m'),
    (2021,'ON',1,2,'6.b',3,'any_n_from_m'),
    (2021,'MJ',2,1,'4.b',2,'all_required'),
    (2021,'MJ',2,1,'7.a',7,'any_n_from_m'),
    (2021,'MJ',2,2,'2.b.iii',2,'any_n_from_m'),
    (2021,'MJ',2,2,'4',6,'any_n_from_m'),
    (2021,'MJ',2,2,'7.b',2,'any_n_from_m'),
    (2021,'MJ',2,2,'8.b',8,'any_n_from_m'),
    (2021,'MJ',2,3,'4.b',2,'all_required'),
    (2021,'MJ',2,3,'7.a',7,'any_n_from_m')
), resolved as (
  select t.*, q.id question_id, ms.id mark_scheme_id
  from target t
  join source_papers sp
    on sp.year=t.year
   and sp.series::text=t.series
   and sp.variant=t.variant
   and sp.kind='QP'::paper_kind
  join components c
    on c.id=sp.component_id
   and c.number=t.component
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
    and not exists(select 1 from assignment_questions aq where aq.question_id=r.question_id)
    and not exists(select 1 from answers a where a.question_id=r.question_id)
    and not exists(
      select 1 from grading_points gp
      join mark_scheme_points p on p.id=gp.mark_scheme_point_id
      where p.mark_scheme_id=r.mark_scheme_id
    )
    and not exists(
      select 1 from error_patterns ep
      join mark_scheme_points p on p.id=ep.mark_scheme_point_id
      where p.mark_scheme_id=r.mark_scheme_id
    )
    and not exists(
      select 1 from flashcards f
      join mark_scheme_points p on p.id=f.source_mark_scheme_point_id
      where p.mark_scheme_id=r.mark_scheme_id
    )
), group_defs(year, series, component, variant, display_ref, label, n_required, marks_per_point, max_marks, sort_order) as (
  values
    (2021,'MJ',1,2,'5.b','cores',3,1,3,1),
    (2021,'MJ',1,2,'5.b','clock',3,1,3,2),
    (2021,'MJ',1,2,'7.b.i','interpreter',3,1,3,1),
    (2021,'MJ',1,2,'7.b.i','compiler',3,1,3,2),
    (2021,'ON',1,1,'2.c','similarities',2,1,2,1),
    (2021,'ON',1,1,'2.c','difference',1,1,1,2),
    (2021,'ON',1,2,'6.b','examples',2,1,2,1),
    (2021,'MJ',2,1,'7.a','points',7,1,7,1),
    (2021,'MJ',2,2,'2.b.iii','examples',2,1,2,1),
    (2021,'MJ',2,2,'4','steps',6,1,6,1),
    (2021,'MJ',2,2,'7.b','methods',2,1,2,1),
    (2021,'MJ',2,2,'8.b','points',8,1,8,1),
    (2021,'MJ',2,3,'7.a','points',7,1,7,1)
), point_defs(year, series, component, variant, display_ref, code, point_text, group_label, sort_order) as (
  values
    (2021,'MJ',1,2,'5.b','MP1','Each core processes one instruction per clock pulse.','cores',1),
    (2021,'MJ',1,2,'5.b','MP2','More or multiple cores mean that sequences of instructions can be split between them.','cores',2),
    (2021,'MJ',1,2,'5.b','MP3','More than one instruction is executed per clock pulse, or more sequences of instructions can be run at the same time.','cores',3),
    (2021,'MJ',1,2,'5.b','MP4','More cores decreases the time taken to complete the task.','cores',4),
    (2021,'MJ',1,2,'5.b','MP5','Each instruction is executed on a clock pulse, or one fetch-execute cycle is run on each clock pulse.','clock',5),
    (2021,'MJ',1,2,'5.b','MP6','The clock speed dictates the number of instructions that can be run per second.','clock',6),
    (2021,'MJ',1,2,'5.b','MP7','The faster the clock speed, the more instructions can be run per second.','clock',7),
    (2021,'MJ',1,2,'7.b.i','MP1','Use an interpreter while writing the program.','interpreter',1),
    (2021,'MJ',1,2,'7.b.i','MP2','Use the interpreter to test or debug the partially completed program.','interpreter',2),
    (2021,'MJ',1,2,'7.b.i','MP3','Errors can be corrected and processing can continue from where execution stopped; errors can be corrected in real time or identified one at a time.','interpreter',3),
    (2021,'MJ',1,2,'7.b.i','MP4','Use the compiler after the program is complete.','compiler',4),
    (2021,'MJ',1,2,'7.b.i','MP5','Use the compiler to create an executable file.','compiler',5),
    (2021,'MJ',1,2,'7.b.i','MP6','Use the compiler to repeatedly test the same completed section.','compiler',6),
    (2021,'MJ',1,2,'7.b.i','MP7','The completed section can be tested without having to re-interpret every time; the compiler is not needed at run-time.','compiler',7),
    (2021,'MJ',1,3,'1.a.ii','MP1','Working shows 1024 × 512 = 524288 pixels/bytes.',null,1),
    (2021,'MJ',1,3,'1.a.ii','MP2','Working converts 524288 bytes to mebibytes by dividing by 1024 and 1024.',null,2),
    (2021,'MJ',1,3,'1.a.ii','MP3','Answer: 0.50 mebibytes.',null,3),
    (2021,'MJ',1,3,'1.b','MP1','Names run-length encoding.',null,1),
    (2021,'MJ',1,3,'1.b','MP2','Explains that sequences of the same colour pixel are replaced.',null,2),
    (2021,'MJ',1,3,'1.b','MP3','Explains that the sequence is represented using the colour code and the number of identical pixels.',null,3),
    (2021,'MJ',1,3,'4.d','MP1','Identifies that both the internet and the World Wide Web are being used.',null,1),
    (2021,'MJ',1,3,'4.d','MP2','Internet justification: data is sent using the internet infrastructure.',null,2),
    (2021,'MJ',1,3,'4.d','MP3','World Wide Web justification: a website stored on a web server is being accessed.',null,3),
    (2021,'ON',1,1,'2.c','MP1','Similarity: both are pieces of malicious software.','similarities',1),
    (2021,'ON',1,1,'2.c','MP2','Similarity: both are downloaded, installed, or run without the user''s knowledge.','similarities',2),
    (2021,'ON',1,1,'2.c','MP3','Similarity: both can pretend to be or be embedded in other legitimate software when downloaded, or both try to avoid the firewall.','similarities',3),
    (2021,'ON',1,1,'2.c','MP4','Similarity: both run in the background.','similarities',4),
    (2021,'ON',1,1,'2.c','MP5','Difference: a virus can damage computer data whereas spyware records or accesses data.','difference',5),
    (2021,'ON',1,1,'2.c','MP6','Difference: a virus does not send data out of the computer whereas spyware sends recorded data to a third party.','difference',6),
    (2021,'ON',1,1,'2.c','MP7','Difference: a virus replicates itself whereas spyware does not replicate itself.','difference',7),
    (2021,'ON',1,2,'6.b','MP1','Purpose: stores metadata about the database.',null,1),
    (2021,'ON',1,2,'6.b','MP2','Example content: field or attribute names.','examples',2),
    (2021,'ON',1,2,'6.b','MP3','Example content: table name.','examples',3),
    (2021,'ON',1,2,'6.b','MP4','Example content: validation rules.','examples',4),
    (2021,'ON',1,2,'6.b','MP5','Example content: data types.','examples',5),
    (2021,'ON',1,2,'6.b','MP6','Example content: primary keys or foreign keys.','examples',6),
    (2021,'ON',1,2,'6.b','MP7','Example content: relationships.','examples',7),
    (2021,'MJ',2,1,'4.b','MP1','Identifies a count-controlled loop.',null,1),
    (2021,'MJ',2,1,'4.b','MP2','Justifies it because the number of iterations is known.',null,2),
    (2021,'MJ',2,1,'7.a','MP1','Function heading includes the return type and function end.','points',1),
    (2021,'MJ',2,1,'7.a','MP2','Loops counting spaces until the word is found or the end of FNString is reached.','points',2),
    (2021,'MJ',2,1,'7.a','MP3','Extracts a character from FNString in the loop.','points',3),
    (2021,'MJ',2,1,'7.a','MP4','Compares with SPACECHAR and increments the count if equal in the loop.','points',4),
    (2021,'MJ',2,1,'7.a','MP5','Compares the count with WordNum - 1, depending on the initialisation value, in the loop.','points',5),
    (2021,'MJ',2,1,'7.a','MP6','If equal, sets a flag or Index to ThisPos + 1 in the loop.','points',6),
    (2021,'MJ',2,1,'7.a','MP7','Returns Index correctly in all cases following a reasonable attempt.','points',7),
    (2021,'MJ',2,1,'7.a','MP8','Works for the special case when looking for word 1.','points',8),
    (2021,'MJ',2,3,'4.b','MP1','Identifies a count-controlled loop.',null,1),
    (2021,'MJ',2,3,'4.b','MP2','Justifies it because the number of iterations is known.',null,2),
    (2021,'MJ',2,3,'7.a','MP1','Function heading includes the return type and function end.','points',1),
    (2021,'MJ',2,3,'7.a','MP2','Loops counting spaces until the word is found or the end of FNString is reached.','points',2),
    (2021,'MJ',2,3,'7.a','MP3','Extracts a character from FNString in the loop.','points',3),
    (2021,'MJ',2,3,'7.a','MP4','Compares with SPACECHAR and increments the count if equal in the loop.','points',4),
    (2021,'MJ',2,3,'7.a','MP5','Compares the count with WordNum - 1, depending on the initialisation value, in the loop.','points',5),
    (2021,'MJ',2,3,'7.a','MP6','If equal, sets a flag or Index to ThisPos + 1 in the loop.','points',6),
    (2021,'MJ',2,3,'7.a','MP7','Returns Index correctly in all cases following a reasonable attempt.','points',7),
    (2021,'MJ',2,3,'7.a','MP8','Works for the special case when looking for word 1.','points',8),
    (2021,'MJ',2,2,'2.b.iii','MP1','Create a loan or borrow a book.','examples',1),
    (2021,'MJ',2,2,'2.b.iii','MP2','Return a book.','examples',2),
    (2021,'MJ',2,2,'2.b.iii','MP3','Send a letter or email, or otherwise contact a user about an overdue book.','examples',3),
    (2021,'MJ',2,2,'2.b.iii','MP4','View the loan history for a given book.','examples',4),
    (2021,'MJ',2,2,'2.b.iii','MP5','View the loan history for a given user.','examples',5),
    (2021,'MJ',2,2,'4','MP1','Uses reference variables for the count of students and total marks.','steps',1),
    (2021,'MJ',2,2,'4','MP2','Loops through all students.','steps',2),
    (2021,'MJ',2,2,'4','MP3','Inputs an individual mark in the loop.','steps',3),
    (2021,'MJ',2,2,'4','MP4','Compares the mark with threshold or boundary values to determine the grade in the loop.','steps',4),
    (2021,'MJ',2,2,'4','MP5','Outputs the grade for a student in the loop.','steps',5),
    (2021,'MJ',2,2,'4','MP6','Maintains a total, and a count if required, in the loop.','steps',6),
    (2021,'MJ',2,2,'4','MP7','Calculates the average by dividing total by count and outputs it after the loop.','steps',7),
    (2021,'MJ',2,2,'7.b','MP1','Dry run, produce a trace table, or walk through the code.','methods',1),
    (2021,'MJ',2,2,'7.b','MP2','Add output statements to allow the code to be tracked.','methods',2),
    (2021,'MJ',2,2,'7.b','MP3','Insert a breakpoint, use single-stepping, or monitor variables using a watch window.','methods',3),
    (2021,'MJ',2,2,'7.b','MP4','Try different test values to see which ones fail.','methods',4),
    (2021,'MJ',2,2,'8.b','MP1','Declares NewString and initialises it to the empty string.','points',1),
    (2021,'MJ',2,2,'8.b','MP2','Uses a conditional loop to pick out all words from FNString.','points',2),
    (2021,'MJ',2,2,'8.b','MP3','Evaluates the result of GetStart() in the loop.','points',3),
    (2021,'MJ',2,2,'8.b','MP4','Tests that the GetStart() result is not -1 and, if not, continues processing.','points',4),
    (2021,'MJ',2,2,'8.b','MP5','Assigns the result of GetWord() to a variable in the loop.','points',5),
    (2021,'MJ',2,2,'8.b','MP6','Tests the result of IgnoreWord() in the loop.','points',6),
    (2021,'MJ',2,2,'8.b','MP7','If the word is not ignored, adds the next initial letter to NewString in the loop.','points',7),
    (2021,'MJ',2,2,'8.b','MP8','Increments ThisWordNum, which must have been initialised, in the loop.','points',8),
    (2021,'MJ',2,2,'8.b','MP9','Outputs NewString outside the loop; it must be all upper case.','points',9)
), deleted as (
  delete from mark_scheme_points p
  using eligible e
  where p.mark_scheme_id=e.mark_scheme_id
  returning p.mark_scheme_id
), inserted_groups as (
  insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
  select e.mark_scheme_id,g.label,g.n_required,g.marks_per_point,g.max_marks,g.sort_order,'fixed'
  from eligible e
  join group_defs g
    on g.year=e.year and g.series=e.series and g.component=e.component
   and g.variant=e.variant and g.display_ref=e.display_ref
  where exists(select 1 from deleted d where d.mark_scheme_id=e.mark_scheme_id)
  returning id,mark_scheme_id,label
), inserted_points as (
  insert into mark_scheme_points(
    mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order
  )
  select e.mark_scheme_id,
         ig.id,
         p.code,
         p.point_text,
         1,
         '[]'::jsonb,
         '[]'::jsonb,
         '[]'::jsonb,
         false,
         p.sort_order
  from eligible e
  join point_defs p
    on p.year=e.year and p.series=e.series and p.component=e.component
   and p.variant=e.variant and p.display_ref=e.display_ref
  left join inserted_groups ig
    on ig.mark_scheme_id=e.mark_scheme_id
   and ig.label=p.group_label
  where exists(select 1 from deleted d where d.mark_scheme_id=e.mark_scheme_id)
    and (p.group_label is null or ig.id is not null)
  returning mark_scheme_id
), updated as (
  update mark_schemes ms
  set scheme_type=e.scheme_kind::scheme_type,
      prompt_version='atomic-source-2021-v1',
      updated_at=now()
  from eligible e
  where ms.id=e.mark_scheme_id
    and exists(select 1 from inserted_points ip where ip.mark_scheme_id=e.mark_scheme_id)
  returning ms.id
)
select count(distinct id) normalized_schemes from updated;
