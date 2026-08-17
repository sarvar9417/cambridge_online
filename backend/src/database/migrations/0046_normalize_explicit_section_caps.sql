-- Source-backed atomic normalization for three explicit section-capped rubrics.
-- Only unused single-wrapper schemes are eligible; natural keys make re-runs safe.

with target(year,series,component,variant,display_ref,expected_marks) as (
  values
    (2021,'ON',2,2,'6.c.ii',2),
    (2022,'MJ',1,1,'4.b',3),
    (2022,'MJ',1,3,'8.c',3)
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
), group_defs(year,series,variant,display_ref,label,n_required,max_marks,sort_order) as (
  values
    (2021,'ON',2,'6.c.ii','advantage',1,1,1),(2021,'ON',2,'6.c.ii','disadvantage',1,1,2),
    (2022,'MJ',1,'4.b','normal_form',1,1,1),(2022,'MJ',1,'4.b','justification',2,2,2),
    (2022,'MJ',3,'8.c','benefit',2,2,1),(2022,'MJ',3,'8.c','drawback',1,1,2)
), point_defs(year,series,variant,display_ref,code,point_text,group_label,sort_order) as (
  values
    (2021,'ON',2,'6.c.ii','A1','Only one module needs changing if the specification changes.','advantage',1),
    (2021,'ON',2,'6.c.ii','A2','Less repetitive code / fewer lines of code.','advantage',2),
    (2021,'ON',2,'6.c.ii','A3','Aids re-usability.','advantage',3),
    (2021,'ON',2,'6.c.ii','D1','A single module is more complex / error-prone / difficult to debug.','disadvantage',4),
    (2021,'ON',2,'6.c.ii','D2','A single module cannot be split among programmers / teams.','disadvantage',5),

    (2022,'MJ',1,'4.b','NF','Identifies the relation as Third Normal Form (3NF).','normal_form',1),
    (2022,'MJ',1,'4.b','J1','There are no repeated attributes / it is already in 2NF.','justification',2),
    (2022,'MJ',1,'4.b','J2','Each field is fully dependent on the corresponding primary key / there are no partial dependencies.','justification',3),
    (2022,'MJ',1,'4.b','J3','There are no transitive dependencies.','justification',4),

    (2022,'MJ',3,'8.c','B1','Can be accessed anywhere with Internet access.','benefit',1),
    (2022,'MJ',3,'8.c','B2','No need to install security / security might be better.','benefit',2),
    (2022,'MJ',3,'8.c','B3','No need to perform backups.','benefit',3),
    (2022,'MJ',3,'8.c','B4','No need to buy specific software or hardware.','benefit',4),
    (2022,'MJ',3,'8.c','B5','Documents can be shared easily.','benefit',5),
    (2022,'MJ',3,'8.c','B6','Multiple people can work on the same document.','benefit',6),
    (2022,'MJ',3,'8.c','D1','Cannot access it without Internet access.','drawback',7),
    (2022,'MJ',3,'8.c','D2','Relies on someone else to perform backups.','drawback',8),
    (2022,'MJ',3,'8.c','D3','Relies on someone else for security / security can be poorer.','drawback',9),
    (2022,'MJ',3,'8.c','D4','Cannot access it if the server goes down.','drawback',10)
), validated as (
  select e.* from eligible e
  where (select coalesce(sum(g.max_marks),0) from group_defs g where g.year=e.year and g.series=e.series and g.variant=e.variant and g.display_ref=e.display_ref)=e.expected_marks
    and not exists(select 1 from point_defs p where p.year=e.year and p.series=e.series and p.variant=e.variant and p.display_ref=e.display_ref and not exists(select 1 from group_defs g where g.year=p.year and g.series=p.series and g.variant=p.variant and g.display_ref=p.display_ref and g.label=p.group_label))
), deleted as (
  delete from mark_scheme_points p using validated v where p.mark_scheme_id=v.mark_scheme_id returning p.mark_scheme_id
), groups as (
  insert into mark_scheme_groups(mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode)
  select v.mark_scheme_id,g.label,g.n_required,1,g.max_marks,g.sort_order,'fixed'
  from validated v join group_defs g on g.year=v.year and g.series=v.series and g.variant=v.variant and g.display_ref=v.display_ref
  where exists(select 1 from deleted d where d.mark_scheme_id=v.mark_scheme_id)
  returning id,mark_scheme_id,label
)
insert into mark_scheme_points(mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order)
select v.mark_scheme_id,g.id,p.code,p.point_text,1,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,false,p.sort_order
from validated v join point_defs p on p.year=v.year and p.series=v.series and p.variant=v.variant and p.display_ref=v.display_ref
join groups g on g.mark_scheme_id=v.mark_scheme_id and g.label=p.group_label
where exists(select 1 from deleted d where d.mark_scheme_id=v.mark_scheme_id);

with target(year,series,component,variant,display_ref,expected_marks,expected_groups) as (
  values (2021,'ON',2,2,'6.c.ii',2,2),(2022,'MJ',1,1,'4.b',3,2),(2022,'MJ',1,3,'8.c',3,2)
), resolved as (
  select t.*,ms.id mark_scheme_id from target t
  join source_papers sp on sp.year=t.year and sp.series::text=t.series and sp.variant=t.variant and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=t.component
  join questions q on q.source_paper_id=sp.id and q.display_ref=t.display_ref and q.marks=t.expected_marks
  join mark_schemes ms on ms.question_id=q.id and ms.max_marks=t.expected_marks
), valid as (
  select r.* from resolved r
  where (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_groups
    and (select coalesce(sum(g.max_marks),0) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_marks
    and (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)>1
)
update mark_schemes ms set scheme_type='any_n_from_m'::scheme_type,prompt_version='atomic-source-explicit-section-caps-v1',updated_at=now() from valid v where ms.id=v.mark_scheme_id;
