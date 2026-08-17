-- Source-backed normalization for 2023 M/J C3 Q5(b) variants 1 and 3.
-- Published rubric: one mark per benefit (Max 2) plus one mark per drawback
-- (Max 2), for an overall maximum of 4.
--
-- Safety: natural keys, single-wrapper-only, no existing groups, no assignment/
-- answer/grading/error/flashcard usage, and idempotent re-runs.

with target(variant,expected_marks) as (
  values (1,4),(3,4)
), point_defs(code,point_text,group_label,sort_order) as (
  values
    ('B1','Whole of bandwidth is available','benefits',1),
    ('B2','Dedicated communication channel increases the quality of transmission','benefits',2),
    ('B3','Data is transmitted with a fixed data rate','benefits',3),
    ('B4','No waiting time at switches','benefits',4),
    ('B5','Suitable for long continuous communication','benefits',5),
    ('B6','Fast method of data transfer','benefits',6),
    ('B7','Data arrives in the same order as it was sent','benefits',7),
    ('B8','Data cannot get lost','benefits',8),
    ('B9','Data all follows the same path / route','benefits',9),
    ('B10','Better for real-time','benefits',10),
    ('B11','Simple method of data transfer','benefits',11),
    ('D1','A dedicated connection makes it impossible to transmit other data even if the channel is free','drawbacks',12),
    ('D2','Not very flexible','drawbacks',13),
    ('D3','No alternative route in case of failure','drawbacks',14),
    ('D4','The time required to establish the physical link between the two stations can be too long','drawbacks',15),
    ('D5','The need to establish a dedicated path for each connection can have cost implications','drawbacks',16),
    ('D6','Dedicated channels require the whole bandwidth / bandwidth cannot be shared','drawbacks',17)
), resolved as (
  select t.*, q.id question_id, ms.id mark_scheme_id
  from target t
  join source_papers sp
    on sp.year=2023
   and sp.series='MJ'::exam_series
   and sp.variant=t.variant
   and sp.kind='QP'::paper_kind
  join components c on c.id=sp.component_id and c.number=3
  join questions q
    on q.source_paper_id=sp.id
   and q.display_ref='5.b'
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
), deleted as (
  delete from mark_scheme_points p
  using eligible e
  where p.mark_scheme_id=e.mark_scheme_id
  returning p.mark_scheme_id
), inserted_groups as (
  insert into mark_scheme_groups(
    mark_scheme_id,label,n_required,marks_per_point,max_marks,sort_order,award_mode
  )
  select e.mark_scheme_id,g.label,2,1,2,g.sort_order,'fixed'
  from eligible e
  cross join (values ('benefits',1),('drawbacks',2)) g(label,sort_order)
  where exists(select 1 from deleted d where d.mark_scheme_id=e.mark_scheme_id)
  returning id,mark_scheme_id,label
), inserted_points as (
  insert into mark_scheme_points(
    mark_scheme_id,group_id,code,text,marks,accept,reject,requires,is_bod,sort_order
  )
  select e.mark_scheme_id,
         g.id,
         d.code,
         d.point_text,
         1,
         '[]'::jsonb,
         '[]'::jsonb,
         '[]'::jsonb,
         false,
         d.sort_order
  from eligible e
  cross join point_defs d
  join inserted_groups g
    on g.mark_scheme_id=e.mark_scheme_id
   and g.label=d.group_label
  where exists(select 1 from deleted x where x.mark_scheme_id=e.mark_scheme_id)
  returning mark_scheme_id
), updated as (
  update mark_schemes ms
  set scheme_type='any_n_from_m'::scheme_type,
      prompt_version='atomic-source-capped-pools-v1',
      updated_at=now()
  from eligible e
  where ms.id=e.mark_scheme_id
    and (select count(*) from inserted_points ip where ip.mark_scheme_id=e.mark_scheme_id)=17
  returning ms.id
)
select count(*) normalized_schemes from updated;
