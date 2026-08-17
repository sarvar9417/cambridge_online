-- Support Cambridge graduated-credit groups such as:
--   3-4 correct = 1 mark, 5-7 correct = 2 marks, all correct = 3 marks.
-- Existing groups keep the current fixed-per-point behavior.

alter table public.mark_scheme_groups
  add column if not exists award_mode text not null default 'fixed';

alter table public.mark_scheme_groups
  drop constraint if exists mark_scheme_groups_award_mode_check;

alter table public.mark_scheme_groups
  add constraint mark_scheme_groups_award_mode_check
  check (award_mode in ('fixed', 'point_marks'));

comment on column public.mark_scheme_groups.award_mode is
  'fixed: matched points earn marks_per_point up to n_required/max_marks; point_marks: select the highest-valued matched point(s) using mark_scheme_points.marks, then apply group and scheme caps.';

create or replace function public.recompute_grading_point_awards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scheme_id uuid;
  v_scheme_type scheme_type;
  v_scheme_max integer;
begin
  select p.mark_scheme_id into v_scheme_id
  from mark_scheme_points p
  where p.id = new.mark_scheme_point_id;

  if v_scheme_id is null then
    return new;
  end if;

  select ms.scheme_type, ms.max_marks
  into v_scheme_type, v_scheme_max
  from mark_schemes ms
  where ms.id = v_scheme_id;

  if v_scheme_type not in (
    'all_required'::scheme_type,
    'any_n_from_m'::scheme_type,
    'exact_match'::scheme_type
  ) then
    return new;
  end if;

  update grading_points gp
  set awarded_marks = 0
  from mark_scheme_points p
  where gp.grading_id = new.grading_id
    and gp.mark_scheme_point_id = p.id
    and p.mark_scheme_id = v_scheme_id
    and gp.awarded_marks <> 0;

  if v_scheme_type = 'exact_match'::scheme_type then
    with recursive point_state as (
      select gp.id, p.code, p.requires, coalesce(gp.final_matched, false) matched, p.sort_order
      from grading_points gp
      join mark_scheme_points p on p.id = gp.mark_scheme_point_id
      where gp.grading_id = new.grading_id
        and p.mark_scheme_id = v_scheme_id
    ), invalid(code) as (
      select ps.code from point_state ps where not ps.matched
      union
      select ps.code
      from point_state ps
      join invalid i on exists (
        select 1
        from jsonb_array_elements_text(coalesce(ps.requires, '[]'::jsonb)) req(code)
        where req.code = i.code
      )
    ), eligible as (
      select ps.*
      from point_state ps
      where ps.matched
        and not exists(select 1 from invalid i where i.code = ps.code)
    ), ok as (
      select (select count(*) from eligible) = (select count(*) from point_state) all_ok
    ), winner as (
      select e.id
      from eligible e, ok
      where ok.all_ok
      order by e.sort_order, e.id
      limit 1
    )
    update grading_points gp
    set awarded_marks = v_scheme_max
    where gp.id in (select id from winner);

    return new;
  end if;

  with recursive point_state as (
    select gp.id, p.code, p.requires, p.group_id, p.marks, p.sort_order,
           coalesce(gp.final_matched, false) matched
    from grading_points gp
    join mark_scheme_points p on p.id = gp.mark_scheme_point_id
    where gp.grading_id = new.grading_id
      and p.mark_scheme_id = v_scheme_id
  ), invalid(code) as (
    select ps.code from point_state ps where not ps.matched
    union
    select ps.code
    from point_state ps
    join invalid i on exists (
      select 1
      from jsonb_array_elements_text(coalesce(ps.requires, '[]'::jsonb)) req(code)
      where req.code = i.code
    )
  ), eligible as (
    select ps.*
    from point_state ps
    where ps.matched
      and not exists(select 1 from invalid i where i.code = ps.code)
  ), with_groups as (
    select e.*,
           g.n_required,
           g.marks_per_point,
           g.max_marks group_max,
           g.sort_order group_sort,
           coalesce(g.award_mode, 'fixed') award_mode,
           case
             when e.group_id is null then null
             else row_number() over(
               partition by e.group_id
               order by
                 case when coalesce(g.award_mode, 'fixed') = 'point_marks' then e.marks end desc nulls last,
                 e.sort_order,
                 e.id
             )
           end group_rank
    from eligible e
    left join mark_scheme_groups g on g.id = e.group_id
  ), base_awards as (
    select wg.id,
           wg.group_id,
           wg.group_rank,
           wg.sort_order,
           wg.group_max,
           coalesce(wg.group_sort, 1000000 + wg.sort_order) global_group_sort,
           case
             when v_scheme_type = 'all_required'::scheme_type then wg.marks
             when wg.group_id is null then wg.marks
             when wg.group_rank > wg.n_required then 0
             when wg.award_mode = 'point_marks' then wg.marks
             else wg.marks_per_point
           end base_award
    from with_groups wg
  ), group_running as (
    select b.*,
           case
             when b.group_id is null or v_scheme_type = 'all_required'::scheme_type then 0
             else coalesce(
               sum(b.base_award) over(
                 partition by b.group_id
                 order by b.group_rank, b.sort_order, b.id
                 rows between unbounded preceding and 1 preceding
               ),
               0
             )
           end prior_group_award
    from base_awards b
  ), group_capped as (
    select g.*,
           case
             when g.group_id is null or v_scheme_type = 'all_required'::scheme_type then g.base_award
             else greatest(least(g.base_award, g.group_max - g.prior_group_award), 0)
           end group_award
    from group_running g
  ), globally_ranked as (
    select g.*,
           coalesce(
             sum(g.group_award) over(
               order by g.global_group_sort, g.group_rank nulls last, g.sort_order, g.id
               rows between unbounded preceding and 1 preceding
             ),
             0
           ) prior_award
    from group_capped g
  ), desired as (
    select c.id,
           greatest(least(c.group_award, v_scheme_max - c.prior_award), 0)::integer award
    from globally_ranked c
  )
  update grading_points gp
  set awarded_marks = d.award
  from desired d
  where gp.id = d.id;

  return new;
end;
$$;

drop trigger if exists trg_recompute_grading_point_awards on public.grading_points;
create trigger trg_recompute_grading_point_awards
after insert or update of teacher_matched, final_matched on public.grading_points
for each row execute function public.recompute_grading_point_awards();
