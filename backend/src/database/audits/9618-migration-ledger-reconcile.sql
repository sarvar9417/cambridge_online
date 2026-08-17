-- One-time production reconciliation for the 9618 corpus branch.
--
-- Why this exists:
-- production was advanced through the 0030-0077 corpus/scorer state by controlled
-- direct SQL operations while schema_migrations still stopped at an older 0030 entry.
-- A normal db:migrate would therefore try to replay already-realized data migrations.
--
-- This script DOES NOT replay migrations. It first proves the required final-state
-- postconditions, then baselines the exact repository filenames in schema_migrations.
-- Keep the legacy production-only 0030_one_class_per_student.sql ledger row untouched.

do $$
declare
  qp_count int;
  ms_count int;
  leaf_count int;
  mark_total int;
  bad_paper int;
  hist_lo int;
  hist_clo int;
  low_flag int;
  manual_reason int;
  bad_fixed int;
  missing_dep int;
begin
  select count(*) into qp_count
  from source_papers sp
  where sp.kind='QP'::paper_kind and sp.source_url is not null;

  select count(*) into ms_count
  from source_papers sp
  where sp.kind='MS'::paper_kind and sp.source_url is not null;

  select count(*),coalesce(sum(q.marks),0)
  into leaf_count,mark_total
  from questions q
  join source_papers sp on sp.id=q.source_paper_id
  where sp.kind='QP'::paper_kind and sp.source_url is not null and q.marks>0;

  with per as (
    select sp.id,
      coalesce(sum(q.marks) filter(where q.marks>0),0) qp_marks,
      coalesce(sum(ms.max_marks) filter(where q.marks>0),0) ms_marks,
      count(q.id) filter(where q.marks>0) leaves,
      count(ms.id) filter(where q.marks>0) schemes,
      count(q.id) filter(where q.marks>0 and (select count(*) from question_subtopics qs where qs.question_id=q.id and qs.is_primary)<>1) bad_primary,
      count(q.id) filter(where q.marks>0 and not exists(select 1 from question_learning_objectives qlo where qlo.question_id=q.id)) bad_lo
    from source_papers sp
    left join questions q on q.source_paper_id=sp.id
    left join mark_schemes ms on ms.question_id=q.id
    where sp.kind='QP'::paper_kind and sp.source_url is not null
    group by sp.id
  )
  select count(*) into bad_paper from per
  where qp_marks<>75 or ms_marks<>75 or leaves<>schemes or bad_primary<>0 or bad_lo<>0;

  select count(*) into hist_lo
  from syllabi s
  join topics t on t.syllabus_id=s.id
  join subtopics st on st.topic_id=t.id
  join learning_objectives lo on lo.subtopic_id=st.id
  where s.code='9618'
    and s.version_label in ('2021-2023','2024-2025')
    and st.code='17.1'
    and lo.code='17.1-lo-05'
    and lo.text='Explain the purpose, benefits and drawbacks of quantum cryptography.';

  select count(*) into hist_clo
  from syllabi s
  join components c on c.syllabus_id=s.id and c.number=3
  join topics t on t.syllabus_id=s.id
  join subtopics st on st.topic_id=t.id and st.code='17.1'
  join learning_objectives lo on lo.subtopic_id=st.id and lo.code='17.1-lo-05'
  join component_learning_objectives clo on clo.component_id=c.id and clo.learning_objective_id=lo.id
  where s.code='9618' and s.version_label in ('2021-2023','2024-2025');

  select count(*) into low_flag
  from questions q
  join source_papers sp on sp.id=q.source_paper_id
  where q.marks>0 and sp.source_url is not null and q.reviewed_at is null
    and (
      exists(select 1 from question_subtopics qs where qs.question_id=q.id and qs.is_primary and coalesce(qs.confidence,0)<0.72)
      or exists(select 1 from question_learning_objectives qlo where qlo.question_id=q.id and coalesce(qlo.confidence,0)<0.72)
    )
    and (q.status::text<>'needs_review' or coalesce(q.notes,'') not like '%taxonomy-review: low-confidence%');

  select count(*) into manual_reason
  from mark_schemes ms
  join questions q on q.id=ms.question_id
  join source_papers sp on sp.id=q.source_paper_id
  where q.marks>0 and sp.source_url is not null
    and ms.scheme_type='manual_only'::scheme_type
    and coalesce(ms.prompt_version,'') !~ '^manual-';

  select count(*) into bad_fixed
  from mark_scheme_groups g
  join mark_schemes ms on ms.id=g.mark_scheme_id
  join questions q on q.id=ms.question_id
  join source_papers sp on sp.id=q.source_paper_id
  where sp.source_url is not null and q.marks>0
    and ms.scheme_type='any_n_from_m'::scheme_type
    and g.award_mode='fixed'
    and (
      (select count(*) from mark_scheme_points p where p.group_id=g.id)<g.n_required
      or g.max_marks<>g.n_required*g.marks_per_point
    );

  select count(*) into missing_dep
  from mark_scheme_points p
  join mark_schemes ms on ms.id=p.mark_scheme_id
  join questions q on q.id=ms.question_id
  join source_papers sp on sp.id=q.source_paper_id
  cross join lateral jsonb_array_elements_text(coalesce(p.requires,'[]'::jsonb)) r(code)
  where q.marks>0 and sp.source_url is not null
    and not exists(
      select 1 from mark_scheme_points p2
      where p2.mark_scheme_id=p.mark_scheme_id and p2.code=r.code
    );

  if qp_count<>118 or ms_count<>118 or leaf_count<>2985 or mark_total<>8850 or bad_paper<>0 then
    raise exception 'ledger reconciliation blocked: corpus qp=% ms=% leaves=% marks=% bad_paper=%',qp_count,ms_count,leaf_count,mark_total,bad_paper;
  end if;

  if hist_lo<>2 or hist_clo<>2 then
    raise exception 'ledger reconciliation blocked: historical quantum LO=% component bindings=%',hist_lo,hist_clo;
  end if;

  if not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='mark_scheme_groups' and column_name='award_mode'
  ) or not exists(
    select 1 from pg_proc where proname='recompute_grading_point_awards' and pg_function_is_visible(oid)
  ) or not exists(
    select 1 from pg_trigger where tgname='trg_recompute_grading_point_awards' and not tgisinternal
  ) then
    raise exception 'ledger reconciliation blocked: scorer schema/function/trigger postcondition missing';
  end if;

  if low_flag<>0 or manual_reason<>0 or bad_fixed<>0 or missing_dep<>0 then
    raise exception 'ledger reconciliation blocked: low_flag=% manual_reason=% bad_fixed=% missing_dep=%',low_flag,manual_reason,bad_fixed,missing_dep;
  end if;
end $$;

with baseline(name) as (values
  ('0030_historical_quantum_cryptography_lo.sql'),
  ('0031_enforce_point_scoring_caps.sql'),
  ('0032_mark_scheme_group_award_mode.sql'),
  ('0033_normalize_explicit_mark_as_follows.sql'),
  ('0034_normalize_2021_explicit_caps.sql'),
  ('0035_normalize_2021_mj_c3_explicit_points.sql'),
  ('0036_normalize_deterministic_mp_caps.sql'),
  ('0037_finalize_deterministic_mp_caps.sql'),
  ('0038_normalize_capped_benefit_drawback_pools.sql'),
  ('0039_normalize_simple_explicit_one_mark_pools.sql'),
  ('0040_normalize_explicit_numbered_programming_points.sql'),
  ('0041_normalize_ui_benefit_example_pools.sql'),
  ('0042_classify_explicit_alternative_wrappers.sql'),
  ('0043_normalize_search_comparison_caps.sql'),
  ('0044_normalize_shortest_path_graduated_credit.sql'),
  ('0045_normalize_explicit_row_value_tables.sql'),
  ('0046_normalize_explicit_section_caps.sql'),
  ('0047_normalize_exact_small_rubrics.sql'),
  ('0048_normalize_bubble_sort_algorithm_points.sql'),
  ('0049_normalize_c1_explicit_capped_pools.sql'),
  ('0050_normalize_repeated_explicit_value_families.sql'),
  ('0051_normalize_explicit_small_rubrics.sql'),
  ('0051_normalize_repeated_c3_textual_rubrics.sql'),
  ('0052_add_qp_stem_repair_rpc.sql'),
  ('0053_normalize_2025_on_explicit_code_rubrics.sql'),
  ('0054_normalize_2025_on_c3_explicit_rubrics.sql'),
  ('0055_normalize_2025_on_c2_explicit_rubrics.sql'),
  ('0056_normalize_2025_on_c3_small_capped_rubrics.sql'),
  ('0057_normalize_repeated_explicit_rubrics.sql'),
  ('0058_normalize_explicit_row_table_rubrics.sql'),
  ('0059_normalize_c1_section_and_dependency_rubrics.sql'),
  ('0060_normalize_capped_dependency_rubrics.sql'),
  ('0061_classify_residual_manual_rubrics.sql'),
  ('0062_normalize_c1_lowmark_explicit_rubrics.sql'),
  ('0063_normalize_c2_lowmark_explicit_rubrics.sql'),
  ('0064_normalize_c3_lowmark_explicit_rubrics.sql'),
  ('0065_classify_c3_residual_manual_boundaries.sql'),
  ('0066_normalize_c3_repeated_explicit_rubrics.sql'),
  ('0067_normalize_c3_special_matching_accuracy.sql'),
  ('0068_classify_remaining_c3_manual_wrappers.sql'),
  ('0069_classify_summary_and_review_manual_boundaries.sql'),
  ('0070_normalize_c1_mixed_explicit_rubrics.sql'),
  ('0071_classify_remaining_c1_manual_wrappers.sql'),
  ('0071_normalize_2025_on_32_source_explicit_rubrics.sql'),
  ('0072_normalize_2025_on_32_tail_rubrics.sql'),
  ('0072_normalize_c2_textual_algorithm_rubrics.sql'),
  ('0073_normalize_c2_mixed_explicit_rubrics.sql'),
  ('0074_classify_remaining_c2_manual_wrappers.sql'),
  ('0075_flag_low_confidence_taxonomy_for_review.sql'),
  ('0076_classify_all_manual_only_scheme_reasons.sql'),
  ('0077_repair_source_fixed_group_caps.sql')
)
insert into schema_migrations(name)
select name from baseline
on conflict(name) do nothing;
