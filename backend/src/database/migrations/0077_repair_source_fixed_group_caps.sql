-- Repair source-backed fixed groups that cannot currently award their declared group cap.
-- The affected 2023 MJ Component 1 any_n_from_m schemes were imported with n_required=1
-- even when max_marks requires multiple fixed awards. No student answers/gradings exist for
-- these targets at the time of repair; the update is idempotent and source-scoped.

with targets as (
  select g.id,
         g.mark_scheme_id,
         (g.max_marks / g.marks_per_point)::integer as required_points
  from mark_scheme_groups g
  join mark_schemes ms on ms.id = g.mark_scheme_id
  join questions q on q.id = ms.question_id
  join source_papers sp on sp.id = q.source_paper_id
  join components c on c.id = q.component_id
  where sp.source_url is not null
    and sp.kind = 'QP'::paper_kind
    and sp.year = 2023
    and sp.series::text = 'MJ'
    and c.number = 1
    and ms.scheme_type = 'any_n_from_m'::scheme_type
    and ms.prompt_version is null
    and g.award_mode = 'fixed'
    and g.marks_per_point > 0
    and g.max_marks % g.marks_per_point = 0
    and g.max_marks <> g.n_required * g.marks_per_point
    and (select count(*) from mark_scheme_points p where p.group_id = g.id)
        >= (g.max_marks / g.marks_per_point)
), repaired as (
  update mark_scheme_groups g
  set n_required = t.required_points
  from targets t
  where g.id = t.id
  returning g.mark_scheme_id
)
update mark_schemes ms
set prompt_version = 'fixed-group-cap-repair-0077-v1',
    updated_at = now()
where ms.id in (select distinct mark_scheme_id from repaired);

do $$
begin
  if exists (
    select 1
    from mark_scheme_groups g
    join mark_schemes ms on ms.id = g.mark_scheme_id
    join questions q on q.id = ms.question_id
    join source_papers sp on sp.id = q.source_paper_id
    where sp.source_url is not null
      and q.marks > 0
      and ms.scheme_type = 'any_n_from_m'::scheme_type
      and g.award_mode = 'fixed'
      and (
        (select count(*) from mark_scheme_points p where p.group_id = g.id) < g.n_required
        or g.max_marks <> g.n_required * g.marks_per_point
      )
  ) then
    raise exception 'source-backed any_n_from_m fixed-group capacity repair incomplete';
  end if;
end $$;
