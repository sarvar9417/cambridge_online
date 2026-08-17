-- Source-backed normalization for three Component 1 rubrics with explicit section caps.
-- Only unused single-wrapper schemes are eligible. Published ellipsis links become dependencies.

with target(year,series,variant,display_ref,expected_marks) as (
  values (2022,'MJ',1,'6.a.ii',5),(2022,'MJ',2,'6.c',4),(2022,'MJ',3,'1.a.ii',3)
), resolved as (
  select t.*,q.id question_id,ms.id mark_scheme_id
  from target t join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=1
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
), group_defs(variant,display_ref,label,n_required,max_marks,sort_order) as (
  values
    (1,'6.a.ii','detection',1,1,1),(1,'6.a.ii','handling',4,4,2),
    (2,'6.c','writing',2,2,1),(2,'6.c','testing',2,2,2),
    (3,'1.a.ii','character_sets',2,2,1),(3,'1.a.ii','difference',1,1,2)
), point_defs(variant,display_ref,code,point_text,group_label,requires,sort_order) as (
  values
    (1,'6.a.ii','D1','Detect the interrupt at the start / end of a fetch-execute cycle.','detection','[]'::jsonb,1),
    (1,'6.a.ii','H1','Check interrupt priority.','handling','[]'::jsonb,2),
    (1,'6.a.ii','H2','If lower priority than the current process, continue with the fetch-execute cycle.','handling','[]'::jsonb,3),
    (1,'6.a.ii','H3','If higher priority than the current process, begin interrupt handling.','handling','[]'::jsonb,4),
    (1,'6.a.ii','H4','Store the state of the current process / registers on the stack.','handling','["H3"]'::jsonb,5),
    (1,'6.a.ii','H5','Identify the location / type of interrupt.','handling','[]'::jsonb,6),
    (1,'6.a.ii','H6','Call the appropriate ISR to handle the interrupt.','handling','["H5"]'::jsonb,7),
    (1,'6.a.ii','H7','When the ISR finishes, check for further high-priority interrupts / return to the detection step.','handling','[]'::jsonb,8),
    (1,'6.a.ii','H8','Otherwise load the stored data from the stack and continue the process.','handling','[]'::jsonb,9),

    (2,'6.c','W1','Enter code into an editor.','writing','[]'::jsonb,1),
    (2,'6.c','W2','Use pretty printing to identify key terms.','writing','[]'::jsonb,2),
    (2,'6.c','W3','Use context-sensitive prompts to help complete statements.','writing','[]'::jsonb,3),
    (2,'6.c','W4','Expand and collapse code blocks.','writing','[]'::jsonb,4),
    (2,'6.c','W5','Use auto-complete to suggest what to type next.','writing','[]'::jsonb,5),
    (2,'6.c','W6','Use auto-formatting to indent code blocks.','writing','[]'::jsonb,6),
    (2,'6.c','W7','Use dynamic syntax checking.','writing','[]'::jsonb,7),
    (2,'6.c','T1','Use single stepping to run code line by line.','testing','[]'::jsonb,8),
    (2,'6.c','T2','Use breakpoints to stop at set points and check values.','testing','[]'::jsonb,9),
    (2,'6.c','T3','Use a report/watch window to see how variables change.','testing','[]'::jsonb,10),

    (3,'1.a.ii','C1','ASCII.','character_sets','[]'::jsonb,1),
    (3,'1.a.ii','C2','Extended ASCII.','character_sets','[]'::jsonb,2),
    (3,'1.a.ii','C3','Unicode.','character_sets','[]'::jsonb,3),
    (3,'1.a.ii','X1','ASCII has 7 bits whereas Unicode has 16 bits.','difference','[]'::jsonb,4),
    (3,'1.a.ii','X2','Extended ASCII has 8 bits whereas Unicode has 16 bits.','difference','[]'::jsonb,5),
    (3,'1.a.ii','X3','ASCII has 7 bits whereas Extended ASCII has 8 bits.','difference','[]'::jsonb,6),
    (3,'1.a.ii','X4','Unicode can represent more characters than ASCII / Extended ASCII.','difference','[]'::jsonb,7),
    (3,'1.a.ii','X5','Extended ASCII can represent more characters than ASCII.','difference','[]'::jsonb,8)
), validated as (
  select e.* from eligible e
  where (select coalesce(sum(g.max_marks),0) from group_defs g where g.variant=e.variant and g.display_ref=e.display_ref)=e.expected_marks
), deleted as (
  delete from mark_scheme_points p using validated v where p.mark_scheme_id=v.mark_scheme_id returning p.mark_scheme_id
), groups as (
  insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
  select v.mark_scheme_id,g.label,g.n_required,1,g.max_marks,g.sort_order,'fixed'
  from validated v join group_defs g on g.variant=v.variant and g.display_ref=v.display_ref
  where exists(select 1 from deleted d where d.mark_scheme_id=v.mark_scheme_id)
  returning id,mark_scheme_id,label
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select v.mark_scheme_id,g.id,p.code,p.point_text,1,'[]'::jsonb,'[]'::jsonb,p.requires,false,p.sort_order
from validated v join point_defs p on p.variant=v.variant and p.display_ref=v.display_ref
join groups g on g.mark_scheme_id=v.mark_scheme_id and g.label=p.group_label
where exists(select 1 from deleted d where d.mark_scheme_id=v.mark_scheme_id);

with target(variant,display_ref,expected_marks) as (values (1,'6.a.ii',5),(2,'6.c',4),(3,'1.a.ii',3)), resolved as (
  select t.*,ms.id mark_scheme_id from target t
  join source_papers sp on sp.year=2022 and sp.series::text='MJ' and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=1
  join questions q on q.source_paper_id=sp.id and q.display_ref=t.display_ref and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), valid as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=2
    and (select coalesce(sum(g.max_marks),0) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_marks
    and (r.display_ref<>'6.a.ii' or (exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='H4' and p.requires='["H3"]'::jsonb) and exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='H6' and p.requires='["H5"]'::jsonb)))
)
update mark_schemes ms set scheme_type='any_n_from_m'::scheme_type,prompt_version='atomic-source-c1-capped-pools-v1',updated_at=now() from valid v where ms.id=v.mark_scheme_id;
