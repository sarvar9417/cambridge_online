-- Source-backed normalization for simple explicit one-mark-per-point rubrics.
-- Only layouts with an unambiguous published point list and no alternative
-- solution path are included.
--
-- Safety: natural keys, single-wrapper-only, no existing groups, no assignment/
-- answer/grading/error/flashcard usage, explicit definition-count validation,
-- and idempotent re-runs.

with target(year,series,component,variant,display_ref,expected_marks,scheme_kind,rubric_key) as (
  values
    (2022,'MJ',2,2,'1.c',2,'any_n_from_m','2022-mj22-1c'),
    (2023,'MJ',2,2,'1.a.ii',3,'any_n_from_m','2023-mj22-1aii'),
    (2023,'MJ',2,2,'1.b',3,'any_n_from_m','2023-mj22-1b'),
    (2023,'MJ',3,1,'6.a',3,'all_required','2023-mj-c3-6a'),
    (2023,'MJ',3,3,'6.a',3,'all_required','2023-mj-c3-6a'),
    (2023,'MJ',3,2,'3.a',2,'all_required','2023-mj32-3a'),
    (2024,'MJ',3,1,'5.a',3,'all_required','2024-mj-c3-5a'),
    (2024,'MJ',3,3,'5.a',3,'all_required','2024-mj-c3-5a')
), group_defs(rubric_key,label,n_required,max_marks) as (
  values
    ('2022-mj22-1c','points',2,2),
    ('2023-mj22-1aii','points',3,3),
    ('2023-mj22-1b','points',3,3)
), point_defs(rubric_key,code,point_text,group_label,sort_order) as (
  values
    ('2022-mj22-1c','MP1','A description of what the identifier is used for / the purpose of the identifier','points',1),
    ('2022-mj22-1c','MP2','The data type of the identifier','points',2),
    ('2022-mj22-1c','MP3','The number of elements of an array / the length of a string','points',3),
    ('2022-mj22-1c','MP4','An example data value','points',4),
    ('2022-mj22-1c','MP5','Value of any constants used','points',5),
    ('2022-mj22-1c','MP6','The scope of the variable (local or global)','points',6),

    ('2023-mj22-1aii','MP1','Postal rates are entered once only','points',1),
    ('2023-mj22-1aii','MP2','Avoids input error / changing the cost accidentally / avoids different postal-rate values at different points in the program','points',2),
    ('2023-mj22-1aii','MP3','When required, the postal-rate constant is changed once only / easier to maintain the program when postal rates change','points',3),
    ('2023-mj22-1aii','MP4','Makes the program easier to understand','points',4),

    ('2023-mj22-1b','MP1','Indentation','points',1),
    ('2023-mj22-1b','MP2','White space','points',2),
    ('2023-mj22-1b','MP3','Comments','points',3),
    ('2023-mj22-1b','MP4','Sensible / meaningful variable names / use of Camel Case','points',4),
    ('2023-mj22-1b','MP5','Capitalised keywords','points',5),

    ('2023-mj-c3-6a','MP1','DPAD99$ is valid: multiple letters followed by multiple digits followed by a valid symbol',null,1),
    ('2023-mj-c3-6a','MP2','DAD#95 is invalid: the symbol comes before the digits and should be after them',null,2),
    ('2023-mj-c3-6a','MP3','ADY123? is invalid: ? is not a valid symbol',null,3),

    ('2023-mj32-3a','MP1','9SW is invalid: it begins with a digit and a variable must begin with a letter',null,1),
    ('2023-mj32-3a','MP2','UWY is valid: it begins with a letter and is followed by two other letters',null,2),

    ('2024-mj-c3-5a','MP1','Correct term: (5 + 2)',null,1),
    ('2024-mj-c3-5a','MP2','Correct term: / (9 - 3)',null,2),
    ('2024-mj-c3-5a','MP3','Correct term: * 3',null,3)
), resolved as (
  select t.*, q.id question_id, ms.id mark_scheme_id
  from target t
  join source_papers sp
    on sp.year=t.year
   and sp.series::text=t.series
   and sp.variant=t.variant
   and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=t.component
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
    and not exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from assignment_questions aq where aq.question_id=r.question_id)
    and not exists(select 1 from answers a where a.question_id=r.question_id)
    and not exists(select 1 from grading_points gp join mark_scheme_points p on p.id=gp.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from error_patterns ep join mark_scheme_points p on p.id=ep.mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
    and not exists(select 1 from flashcards f join mark_scheme_points p on p.id=f.source_mark_scheme_point_id where p.mark_scheme_id=r.mark_scheme_id)
), validated as (
  select e.*
  from eligible e
  where (select count(*) from point_defs p where p.rubric_key=e.rubric_key) > 0
    and (select count(*) from point_defs p where p.rubric_key=e.rubric_key)
        = (select count(distinct p.code) from point_defs p where p.rubric_key=e.rubric_key)
    and (
      (e.scheme_kind='all_required'
       and (select count(*) from point_defs p where p.rubric_key=e.rubric_key)=e.expected_marks
       and not exists(select 1 from group_defs g where g.rubric_key=e.rubric_key))
      or
      (e.scheme_kind='any_n_from_m'
       and (select coalesce(sum(g.max_marks),0) from group_defs g where g.rubric_key=e.rubric_key)=e.expected_marks
       and not exists(
         select 1 from point_defs p
         where p.rubric_key=e.rubric_key
           and (p.group_label is null or not exists(
             select 1 from group_defs g
             where g.rubric_key=e.rubric_key and g.label=p.group_label
           ))
       ))
    )
), deleted as (
  delete from mark_scheme_points p
  using validated v
  where p.mark_scheme_id=v.mark_scheme_id
  returning p.mark_scheme_id
), inserted_groups as (
  insert into mark_scheme_groups(
    mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode
  )
  select v.mark_scheme_id,g.label,g.n_required,1,g.max_marks,1,'fixed'
  from validated v
  join group_defs g on g.rubric_key=v.rubric_key
  where exists(select 1 from deleted d where d.mark_scheme_id=v.mark_scheme_id)
  returning id,mark_scheme_id,label
), inserted_points as (
  insert into mark_scheme_points(
    mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order
  )
  select v.mark_scheme_id,
         ig.id,
         p.code,
         p.point_text,
         1,
         '[]'::jsonb,
         '[]'::jsonb,
         '[]'::jsonb,
         false,
         p.sort_order
  from validated v
  join point_defs p on p.rubric_key=v.rubric_key
  left join inserted_groups ig
    on ig.mark_scheme_id=v.mark_scheme_id and ig.label=p.group_label
  where exists(select 1 from deleted d where d.mark_scheme_id=v.mark_scheme_id)
    and (p.group_label is null or ig.id is not null)
  returning mark_scheme_id
), updated as (
  update mark_schemes ms
  set scheme_type=v.scheme_kind::scheme_type,
      prompt_version='atomic-source-simple-pools-v1',
      updated_at=now()
  from validated v
  where ms.id=v.mark_scheme_id
    and (select count(*) from inserted_points ip where ip.mark_scheme_id=v.mark_scheme_id)
        = (select count(*) from point_defs p where p.rubric_key=v.rubric_key)
  returning ms.id
)
select count(*) normalized_schemes from updated;
