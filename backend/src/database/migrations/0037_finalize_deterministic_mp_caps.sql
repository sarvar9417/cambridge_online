-- Finalize metadata for the deterministic 2023-2024 normalization in 0036.
-- PostgreSQL data-modifying CTEs share the command snapshot, so the post-insert
-- base-table point-count guard in 0036 does not observe those new rows in the
-- same statement. This separate idempotent migration validates the committed
-- point/group structure before changing scheme metadata. It performs no
-- destructive point/group writes.

with target(year, series, component, variant, display_ref, expected_marks, scheme_kind, expected_points, expected_groups, expected_group_cap) as (
  values
    (2023,'ON',2,3,'4.a',6,'all_required',6,0,0),
    (2023,'ON',2,1,'6.a',7,'any_n_from_m',8,1,7),
    (2023,'MJ',3,1,'9.b',4,'any_n_from_m',12,2,4),
    (2023,'MJ',3,3,'9.b',4,'any_n_from_m',12,2,4),
    (2024,'MJ',3,1,'10.c',2,'any_n_from_m',5,2,2),
    (2024,'MJ',3,3,'10.c',2,'any_n_from_m',5,2,2)
), resolved as (
  select t.*, ms.id mark_scheme_id
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
), validated as (
  select r.*
  from resolved r
  where (select count(*) from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id)=r.expected_points
    and (select count(*) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_groups
    and (select coalesce(sum(g.max_marks),0) from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id)=r.expected_group_cap
    and (
      (r.year=2023 and r.series='ON' and r.component=2 and r.variant=3 and r.display_ref='4.a'
       and exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP6' and p.requires='["MP5"]'::jsonb))
      or
      (r.year=2023 and r.series='ON' and r.component=2 and r.variant=1 and r.display_ref='6.a'
       and exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id and g.label='points' and g.n_required=7 and g.max_marks=7)
       and exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP3' and p.requires='["MP2"]'::jsonb)
       and exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP5' and p.requires='["MP4"]'::jsonb)
       and exists(select 1 from mark_scheme_points p where p.mark_scheme_id=r.mark_scheme_id and p.code='MP8' and p.requires='["MP7"]'::jsonb))
      or
      (r.year=2023 and r.series='MJ' and r.component=3 and r.display_ref='9.b'
       and exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id and g.label='benefits' and g.n_required=2 and g.max_marks=2)
       and exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id and g.label='drawbacks' and g.n_required=2 and g.max_marks=2))
      or
      (r.year=2024 and r.series='MJ' and r.component=3 and r.display_ref='10.c'
       and exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id and g.label='big-o' and g.n_required=1 and g.max_marks=1)
       and exists(select 1 from mark_scheme_groups g where g.mark_scheme_id=r.mark_scheme_id and g.label='growth' and g.n_required=1 and g.max_marks=1))
    )
)
update mark_schemes ms
set scheme_type=v.scheme_kind::scheme_type,
    prompt_version='atomic-source-deterministic-v1',
    updated_at=now()
from validated v
where ms.id=v.mark_scheme_id;
